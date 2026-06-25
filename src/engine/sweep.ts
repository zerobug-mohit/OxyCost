// Cost-vs-volume sweep utilities (decision-support visualizations).
// For each source, recompute the per-cu-m cost as if that source supplied a
// given monthly volume, by adjusting its natural volume driver:
//   PSA       -> run hours needed to produce the volume
//   LMO       -> monthly consumption = volume
//   Cylinder  -> cylinder count = volume / cylinder size
//   OC        -> run hours needed (units fixed)
// This reveals the crossover points where one source becomes cheaper than
// another — the core insight for choosing a source mix.

import { calcConcentrator } from './concentrator'
import { calcCylinder } from './cylinder'
import { calcLmo } from './lmo'
import { calcPsa } from './psa'
import { CYL_VOLUME, MINUTES_PER_HOUR } from './constants'
import type {
  CostView,
  CylinderInputs,
  EngineInputs,
  LmoInputs,
  OcInputs,
  PriorityEntry,
  PsaInputs,
  SourceResult,
  SourceType,
} from './types'

/** Typed inputs for a single source instance. */
export type InstanceInputs = PsaInputs | LmoInputs | CylinderInputs | OcInputs

export interface CurvePoint {
  volume: number
  /** Per-cu-m cost at this volume, or null if the source cannot supply it. */
  value: number | null
}

export interface CurveSeries {
  /** Unique instance id, matches SourceResult.id. */
  id: string
  source: SourceType
  index: number
  label: string
  points: CurvePoint[]
}

/** Pull the per-cu-m value for the active cost view from a result. */
export function pickView(r: SourceResult, view: CostView): number {
  switch (view) {
    case 'opex_only':
      return r.per_cu_m_opex_only
    case 'incremental':
      return r.incremental_cost_per_cu_m
    case 'capex_opex':
    default:
      return r.per_cu_m_capex_opex
  }
}

/** Max oxygen (cu m/month) a PSA plant can produce at full 720h run time. */
export function psaMaxVolume(psa: PsaInputs): number {
  const runFraction = clamp01(psa.psa_compressor_run_fraction)
  const util = Math.max(0, psa.psa_capacity_utilization)
  const productionHours = 720 * runFraction
  return (productionHours * MINUTES_PER_HOUR * psa.psa_capacity_lpm * util) / 1000
}

/** Max oxygen an OC fleet can produce at 24h/day on every deployed unit. */
export function ocMaxVolume(oc: OcInputs): number {
  const units = oc.oc_high_use_units + oc.oc_low_use_units
  const maxMonthlyUnitHours = units * 24 * oc.oc_days_per_month
  return (maxMonthlyUnitHours * oc.oc_output_lpm * MINUTES_PER_HOUR) / 1000
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

/**
 * Result for a single source instance supplying `volume` cu m, or null if it
 * cannot (PSA past 720h, OC past 24h/day, or missing inputs).
 */
export function resultAtVolume(
  source: SourceType,
  instance: InstanceInputs,
  volume: number,
): SourceResult | null {
  if (volume <= 0) return null

  if (source === 'psa') {
    const psa = instance as PsaInputs
    const runFraction = clamp01(psa.psa_compressor_run_fraction)
    const util = Math.max(0, psa.psa_capacity_utilization)
    const effectiveLpm = psa.psa_capacity_lpm * util
    if (effectiveLpm <= 0 || runFraction <= 0) return null
    // Run hours needed so that production hours produce `volume`.
    const productionHours = (volume * 1000) / (MINUTES_PER_HOUR * effectiveLpm)
    const runHours = productionHours / runFraction
    if (runHours > 720) return null
    return calcPsa({ ...psa, psa_run_hours_monthly: runHours })
  }

  if (source === 'lmo') {
    return calcLmo({ ...(instance as LmoInputs), lmo_monthly_cu_m: volume })
  }

  if (source === 'cylinder') {
    const cyl = instance as CylinderInputs
    const count = volume / CYL_VOLUME[cyl.cyl_type]
    return calcCylinder({ ...cyl, cyl_monthly_count: count })
  }

  // oc — scale both use groups' daily hours by the factor needed to hit volume.
  const oc = instance as OcInputs
  const units = oc.oc_high_use_units + oc.oc_low_use_units
  if (units <= 0 || oc.oc_output_lpm <= 0) return null
  const dailyUnitHours =
    oc.oc_high_use_units * oc.oc_high_use_hours +
    oc.oc_low_use_units * oc.oc_low_use_hours
  if (dailyUnitHours <= 0) return null
  const currentOutput =
    (dailyUnitHours * oc.oc_days_per_month * oc.oc_output_lpm * MINUTES_PER_HOUR) /
    1000
  if (currentOutput <= 0) return null
  const k = volume / currentOutput
  const newHigh = oc.oc_high_use_hours * k
  const newLow = oc.oc_low_use_hours * k
  if (newHigh > 24 || newLow > 24) return null
  return calcConcentrator({
    ...oc,
    oc_high_use_hours: newHigh,
    oc_low_use_hours: newLow,
  })
}

/** A reasonable volume axis around the current demand. */
export function generateVolumeRange(demandCuM: number, steps = 28): number[] {
  const top = Math.max(demandCuM * 2, 2000)
  const start = Math.max(top / steps, 50)
  const range: number[] = []
  for (let i = 1; i <= steps; i++) {
    range.push(Math.round((start + ((top - start) * (i - 1)) / (steps - 1)) / 10) * 10)
  }
  return range
}

/** Max oxygen (cu m/month) a source instance can supply alone. */
function maxCapacityOf(source: SourceType, inst: InstanceInputs): number {
  if (source === 'psa') return psaMaxVolume(inst as PsaInputs)
  if (source === 'oc') return ocMaxVolume(inst as OcInputs)
  // LMO and cylinders scale freely (order more liquid / more cylinders).
  return Infinity
}

/**
 * Priority / fallback order for meeting `demand`: which source to rely on first,
 * and what to fall back to if it is unavailable (breakdown, supply disruption).
 * Sources that can cover the full demand alone rank ahead of capacity-limited
 * ones (which can only serve as partial backup); within each group, cheaper
 * (active cost view) ranks higher.
 */
export function priorityOrder(
  inputs: EngineInputs,
  sources: SourceResult[],
  view: CostView,
  demand: number,
): PriorityEntry[] {
  if (!(demand > 0)) return []

  const arrFor = (source: SourceType): InstanceInputs[] | undefined =>
    source === 'psa'
      ? inputs.psa
      : source === 'lmo'
        ? inputs.lmo
        : source === 'cylinder'
          ? inputs.cylinder
          : inputs.oc

  const raw = sources
    .map((s) => {
      const inst = arrFor(s.source)?.[s.index]
      if (!inst) return null
      if (!(s.monthly_output_cu_m > 0) || !Number.isFinite(pickView(s, view))) return null

      const capacity = maxCapacityOf(s.source, inst)
      const atDemand = demand <= capacity ? resultAtVolume(s.source, inst, demand) : null
      const meetsDemand = atDemand != null && Number.isFinite(pickView(atDemand, view))

      let cost: number
      if (meetsDemand) {
        cost = pickView(atDemand!, view)
      } else {
        // Best the capped source can do is its cost at (just under) full capacity.
        const atMax =
          Number.isFinite(capacity) && capacity > 0
            ? resultAtVolume(s.source, inst, capacity * 0.999)
            : null
        const c = atMax ? pickView(atMax, view) : pickView(s, view)
        cost = Number.isFinite(c) ? c : Infinity
      }

      return {
        id: s.id,
        source: s.source,
        index: s.index,
        label: s.label,
        cost,
        meetsDemand,
        capacity,
      }
    })
    .filter((e): e is Omit<PriorityEntry, 'rank'> => e != null && Number.isFinite(e.cost))

  raw.sort((a, b) => {
    if (a.meetsDemand !== b.meetsDemand) return a.meetsDemand ? -1 : 1
    return a.cost - b.cost
  })

  return raw.map((e, i) => ({ ...e, rank: i + 1 }))
}

/** Per-cu-m cost curves for every source instance over a volume axis. */
export function costCurves(
  inputs: EngineInputs,
  view: CostView,
  volumes: number[] = generateVolumeRange(inputs.demand_cu_m),
): CurveSeries[] {
  const series: CurveSeries[] = []

  const addAll = (
    source: SourceType,
    arr: InstanceInputs[] | undefined,
  ): void => {
    if (!arr || arr.length === 0) return
    const many = arr.length > 1
    arr.forEach((instance, index) => {
      let label = source.toUpperCase()
      const points = volumes.map((volume) => {
        const r = resultAtVolume(source, instance, volume)
        if (r) label = many ? `${r.label} #${index + 1}` : r.label
        const value = r ? pickView(r, view) : null
        return {
          volume,
          value: value !== null && Number.isFinite(value) ? value : null,
        }
      })
      series.push({ id: `${source}-${index}`, source, index, label, points })
    })
  }

  addAll('psa', inputs.psa)
  addAll('lmo', inputs.lmo)
  addAll('cylinder', inputs.cylinder)
  addAll('oc', inputs.oc)
  return series
}
