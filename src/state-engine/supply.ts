// Oxygen SUPPLY estimate for a district/state (annual cu m of gaseous O2).
//
// The cost engine (compute.ts) budgets the money; this sibling estimates how
// much oxygen the SAME equipment can actually produce/deliver in a year, so the
// output side can show a "coverage of demand" bar (supply ÷ demand) exactly like
// the facility tab. It mirrors compute.ts's equipment assumptions head-for-head:
//   • PSA  — functional plants × rated LPM × production hrs/day × 365 (like the
//            electricity head, which also uses functional plants × prod hrs).
//   • LMO  — annual KL of liquid expanded to gas (1 L LMO = 0.861 cu m gas).
//   • Cyl  — refills/month × cylinder volume × 12 (delivered gas).
//   • OC   — units × hrs/day × output LPM × 365 (a concentrator's steady flow).
// MGPS, oximeters, HR, training and IEC are not oxygen sources and are excluded.
//
// In 'estimate' mode each source is weighted by its band presence probability
// (psaProb, lmoProb, …), matching how the cost engine forms an EXPECTED value
// across a band's facilities.
import type { CostGroup, StateInputs, StateResult } from './types'
import { LMO_EXPANSION, D_TYPE_CU_M, B_TYPE_CU_M, MINUTES_PER_HOUR } from '../engine/constants'
import { MT_TO_CUM } from '../demand-engine'

const DAYS = 365
const MONTHS = 12
/** A-type cylinder water/gas capacity (cu m). Smaller than B-type (1.5); the
 *  facility engine only defines D and B, so we set A here for the supply rollup. */
const A_TYPE_CU_M = 0.7
/** Steady output of one oxygen concentrator (LPM) — matches the facility default. */
const OC_OUTPUT_LPM = 5

/** One supply source's annual gaseous output (cu m). */
export interface SupplySegment {
  group: Extract<CostGroup, 'psa' | 'lmo' | 'cylinder' | 'oc'>
  label: string
  annualCuM: number
}

export interface StateSupply {
  /** Total annual gaseous output the entered/modelled equipment can deliver. */
  annualCuM: number
  annualMT: number
  /** Per-source contribution (cu m/yr), largest first, zero-output dropped. */
  segments: SupplySegment[]
}

const LABEL: Record<SupplySegment['group'], string> = {
  psa: 'PSA plants',
  lmo: 'LMO',
  cylinder: 'Cylinders',
  oc: 'Concentrators',
}

/** PSA annual output (cu m): plants × rated LPM × 60 × prod hrs/day × 365. */
function psaCuM(plants: number, capacityLpm: number, prodHrsPerDay: number): number {
  return plants * capacityLpm * MINUTES_PER_HOUR * prodHrsPerDay * DAYS / 1000
}
/** LMO annual output (cu m gas): KL/yr × 1000 L × 0.861 cu m/L. */
function lmoCuM(annualKl: number): number {
  return annualKl * 1000 * LMO_EXPANSION
}
/** Cylinder annual output (cu m): refills/mo × volume × 12. */
function cylCuM(dMo: number, bMo: number, aMo: number): number {
  return (dMo * D_TYPE_CU_M + bMo * B_TYPE_CU_M + aMo * A_TYPE_CU_M) * MONTHS
}
/** Concentrator annual output (cu m): unit-hrs/day × 60 × LPM × 365. */
function ocCuM(unitHrsPerDay: number): number {
  return unitHrsPerDay * MINUTES_PER_HOUR * OC_OUTPUT_LPM * DAYS / 1000
}

/**
 * Estimate the district/state's annual oxygen supply from the same equipment the
 * cost engine budgets. Takes the computed result (for the per-band profiles) so
 * it stays in lock-step with what's shown; direct mode reads input.direct.
 */
export function estimateStateSupply(input: StateInputs, result: StateResult): StateSupply {
  let psa = 0
  let lmo = 0
  let cyl = 0
  let oc = 0

  if (input.mode === 'direct') {
    const d = input.direct
    for (const cap of Object.keys(d.psaByCapacity)) {
      const { total, functional, hrs } = d.psaByCapacity[cap]
      const func = Math.max(0, Math.min(functional, total))
      psa += psaCuM(func, Number(cap), hrs)
    }
    lmo += lmoCuM(d.lmoAnnualKl)
    cyl += cylCuM(d.cylDRefillsMo, d.cylBRefillsMo, d.cylARefillsMo)
    oc += ocCuM(d.ocHighUnits * d.ocHighHrs + d.ocLowUnits * d.ocLowHrs)
  } else {
    for (const b of result.byBand) {
      const { count, profile: p } = b
      if (count <= 0) continue
      psa += count * p.psaProb * psaCuM(p.psaPlants, p.psaCapacityLpm, p.psaProdHrsPerDay)
      lmo += count * p.lmoProb * lmoCuM(p.lmoAnnualKl)
      cyl += count * p.cylProb * cylCuM(p.cylDRefillsMo, p.cylBRefillsMo, p.cylARefillsMo)
      oc += count * p.ocProb * ocCuM(p.ocDeployed * p.ocHrsPerDay)
    }
  }

  const raw: SupplySegment[] = [
    { group: 'psa', label: LABEL.psa, annualCuM: psa },
    { group: 'lmo', label: LABEL.lmo, annualCuM: lmo },
    { group: 'cylinder', label: LABEL.cylinder, annualCuM: cyl },
    { group: 'oc', label: LABEL.oc, annualCuM: oc },
  ]
  const segments = raw.filter((s) => s.annualCuM > 0).sort((a, b) => b.annualCuM - a.annualCuM)
  const annualCuM = segments.reduce((s, x) => s + x.annualCuM, 0)
  return { annualCuM, annualMT: annualCuM / MT_TO_CUM, segments }
}
