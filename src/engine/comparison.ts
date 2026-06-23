// Comparison and recommendation engine.
// Implements CALC-COMP-01 .. CALC-COMP-04 from oxygencost_spec.md section 4e.

import { calcConcentrator } from './concentrator'
import { calcCylinder } from './cylinder'
import { calcLmo } from './lmo'
import { calcPsa } from './psa'
import type {
  ComparisonResult,
  EngineInputs,
  RankEntry,
  SourceResult,
} from './types'

/** Run every instance of every enabled source and return results in order. */
export function computeSources(inputs: EngineInputs): SourceResult[] {
  const results: SourceResult[] = []

  const addAll = <T extends { item_id_value?: string }>(
    arr: T[] | undefined,
    calc: (i: T) => SourceResult,
  ): void => {
    if (!arr || arr.length === 0) return
    const many = arr.length > 1
    arr.forEach((inp, i) => {
      const r = calc(inp)
      r.id = `${r.source}-${i}`
      r.index = i
      // A user-supplied identifier (manufacturer/donor/id) takes precedence as
      // the differentiator; otherwise number duplicate units #1, #2, …
      const ident = inp.item_id_value?.trim()
      if (ident) r.label = `${ident} · ${r.label}`
      else if (many) r.label = `${r.label} #${i + 1}`
      results.push(r)
    })
  }

  addAll(inputs.psa, calcPsa)
  addAll(inputs.lmo, calcLmo)
  addAll(inputs.cylinder, calcCylinder)
  addAll(inputs.oc, calcConcentrator)
  return results
}

function rankBy(
  sources: SourceResult[],
  pick: (s: SourceResult) => number,
): RankEntry[] {
  return sources
    .map((s) => ({ source: s.source, id: s.id, label: s.label, value: pick(s) }))
    // Ascending; Infinity (no output) sorts to the bottom.
    .sort((a, b) => a.value - b.value)
}

export function compareAllSources(
  inputs: EngineInputs,
  demandCuM = inputs.demand_cu_m,
): ComparisonResult {
  const sources = computeSources(inputs)

  // CALC-COMP-02: capacity and supply gap.
  const total_capacity_cu_m = sources.reduce(
    (sum, s) => sum + (Number.isFinite(s.monthly_output_cu_m) ? s.monthly_output_cu_m : 0),
    0,
  )
  const supply_gap_cu_m = demandCuM - total_capacity_cu_m

  // CALC-COMP-03: three rankings.
  const ranking_opex_only = rankBy(sources, (s) => s.per_cu_m_opex_only)
  const ranking_capex_opex = rankBy(sources, (s) => s.per_cu_m_capex_opex)
  const ranking_incremental = rankBy(sources, (s) => s.incremental_cost_per_cu_m)

  // CALC-COMP-05: facility shared overhead (HR + MGPS + other), allocated across
  // delivered oxygen. Reported separately — it is incurred regardless of which
  // source is used, so it does not change the per-source ranking.
  const shared = inputs.shared
  const shared_overhead_monthly = shared
    ? shared.hr_salary_monthly +
      (shared.mgps_amc_annual + shared.mgps_maintenance_annual) / 12 +
      shared.other_shared_monthly
    : 0
  const shared_overhead_per_cu_m =
    total_capacity_cu_m > 0 ? shared_overhead_monthly / total_capacity_cu_m : 0

  const notes: string[] = []
  const { lead, points } = buildRecommendation(
    sources,
    demandCuM,
    supply_gap_cu_m,
    { ranking_opex_only, ranking_capex_opex, ranking_incremental },
    shared_overhead_per_cu_m,
    notes,
  )

  return {
    sources,
    demand_cu_m: demandCuM,
    supply_gap_cu_m,
    total_capacity_cu_m,
    ranking_opex_only,
    ranking_capex_opex,
    ranking_incremental,
    shared_overhead_monthly,
    shared_overhead_per_cu_m,
    recommendation: lead,
    recommendationPoints: points,
    notes,
  }
}

function inr(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `INR ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function cuM(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/** CALC-COMP-04: comprehensive, decision-oriented recommendation. */
function buildRecommendation(
  sources: SourceResult[],
  demandCuM: number,
  supplyGap: number,
  rankings: {
    ranking_opex_only: RankEntry[]
    ranking_capex_opex: RankEntry[]
    ranking_incremental: RankEntry[]
  },
  sharedPerCuM: number,
  notes: string[],
): { lead: string; points: string[] } {
  if (demandCuM <= 0) {
    return {
      lead: 'Enter your estimated monthly oxygen demand (in cu m) to see a recommendation.',
      points: [],
    }
  }
  if (sources.length === 0) {
    return { lead: 'Add at least one oxygen source to compare.', points: [] }
  }

  const producing = sources.filter(
    (s) => s.monthly_output_cu_m > 0 && Number.isFinite(s.per_cu_m_capex_opex),
  )
  if (producing.length === 0) {
    return {
      lead: 'None of the selected sources are producing oxygen with the current inputs — check run hours, consumption and unit counts.',
      points: [],
    }
  }

  const firstProducing = (ranking: RankEntry[]) =>
    ranking.find((r) => producing.some((p) => p.id === r.id))!
  const topOpex = firstProducing(rankings.ranking_opex_only)
  const topTotal = firstProducing(rankings.ranking_capex_opex)
  const topIncr = firstProducing(rankings.ranking_incremental)

  const points: string[] = []

  // Lead: total cost of ownership winner.
  const lead = `For all-in cost (capex + opex), ${topTotal.label} is the most cost-effective at ${inr(
    topTotal.value,
  )}/cu m.`

  // Opex-only.
  if (topOpex.id === topTotal.id) {
    points.push(
      `It is also the cheapest to run day-to-day at ${inr(topOpex.value)}/cu m (opex only), so it wins whether or not you already own it.`,
    )
  } else {
    points.push(
      `If the equipment is already owned, ${topOpex.label} is the cheapest to run at ${inr(
        topOpex.value,
      )}/cu m (opex only) — the choice depends on whether capital is already spent.`,
    )
  }

  // Incremental / next unit.
  points.push(
    `For each additional cu m, ${topIncr.label} has the lowest marginal cost at ${inr(
      topIncr.value,
    )}/cu m — lean on it first before starting a costlier source.`,
  )

  // Suggested least-cost mix (greedy by incremental cost, capped by capacity).
  if (producing.length > 1) {
    const ordered = [...producing].sort(
      (a, b) => a.incremental_cost_per_cu_m - b.incremental_cost_per_cu_m,
    )
    let remaining = demandCuM
    let blendedCost = 0
    const alloc: string[] = []
    for (const s of ordered) {
      if (remaining <= 0) break
      const take = Math.min(remaining, s.monthly_output_cu_m)
      if (take <= 0) continue
      alloc.push(`${cuM(take)} cu m from ${s.label}`)
      blendedCost += take * s.incremental_cost_per_cu_m
      remaining -= take
    }
    if (alloc.length > 1) {
      const blended = blendedCost / (demandCuM - Math.max(0, remaining))
      points.push(
        `Suggested least-cost mix for ${cuM(demandCuM)} cu m/month: ${alloc.join(
          ', then ',
        )} — a blended marginal cost of about ${inr(blended)}/cu m.`,
      )
    }
  }

  // Supply gap / spare capacity.
  if (supplyGap > demandCuM * 0.02) {
    points.push(
      `Supply gap: your sources can deliver ${cuM(
        demandCuM - supplyGap,
      )} cu m against demand of ${cuM(demandCuM)} — short by ${cuM(
        supplyGap,
      )} cu m. Increase a source's output or add capacity.`,
    )
    notes.push('Supply gap: current sources cannot meet demand.')
  }

  // OC caveat.
  const ocWins =
    topOpex.source === 'oc' || topTotal.source === 'oc' || topIncr.source === 'oc'
  if (ocWins) {
    points.push(
      'Caveat: oxygen concentrators are low-purity (90–96%) and low-flow — keep them supplementary, not a primary supply for ventilators or high-acuity care.',
    )
  }

  // PSA underutilization.
  const psaUnder = producing.find(
    (s) => s.source === 'psa' && s.notes.some((n) => n.toLowerCase().includes('underutilized')),
  )
  if (psaUnder) {
    points.push(
      `${psaUnder.label} is underutilized — raising its run hours sharply lowers its per-unit cost, often the cheapest way to cut overall spend before adding sources.`,
    )
  }

  // Shared overhead reminder (applies equally to all sources, so it does not
  // change the ranking, but matters for the all-in budget).
  if (sharedPerCuM > 0) {
    points.push(
      `Add shared facility overhead (HR + MGPS) of ${inr(
        sharedPerCuM,
      )}/cu m on top of any source for the all-in cost — so ${topTotal.label} is about ${inr(
        topTotal.value + sharedPerCuM,
      )}/cu m all-in. This overhead is the same whichever source you choose, so it does not change which source is cheapest.`,
    )
  }

  return { lead, points }
}
