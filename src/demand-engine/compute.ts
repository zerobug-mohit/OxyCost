// The demand engine. Two methods (both from the case-mix workbook):
//   A. Facility case-mix — per ward: Σ_c patients×mix_c×flow_c×duration_c×mins ÷ conversion → MT
//   B. Per-admission extrapolation — admissions × strata factor → MT (used by the district
//      roll-up and the facility-cost "From admissions" demand entry).
// Convention: an entered/derived value is the AVERAGE month; seasonality reshapes the 12-month
// profile (centred on 1.0) but does not change the annual total; annual = 12 × average month.
import {
  DISTRICTS,
  MONTH_LABELS,
  MONTH_SEASON,
  WARD_LABELS,
  WARDS,
  defaultFactors,
  districtsOf,
  matchTranche,
} from './data'
import type {
  DemandAssumptions,
  DemandResult,
  DistrictSelection,
  FacilityDemandInput,
  Scenario,
  Seasonality,
} from './types'

/** MT → cu m of gas (1 MT of O₂ = mtConversion litres = mtConversion/1000 cu m). */
export const MT_TO_CUM = 750

function seasonAvg(s: Seasonality): number {
  const sum = MONTH_SEASON.reduce((a, key) => a + s[key], 0)
  return sum / MONTH_SEASON.length
}

/** Per-month multiplier centred on 1.0 (Σ over 12 months = 12), so annual = 12 × avg month. */
function monthMultipliers(s: Seasonality): number[] {
  const avg = seasonAvg(s) || 1
  return MONTH_SEASON.map((key) => s[key] / avg)
}

function shape(baseMonthlyMT: number, s: Seasonality): DemandResult['byMonth'] {
  const mult = monthMultipliers(s)
  return MONTH_LABELS.map((label, i) => ({ label, mt: baseMonthlyMT * mult[i] }))
}

function assemble(
  baseMonthlyMT: number,
  s: Seasonality,
  breakdown: DemandResult['breakdown'],
): DemandResult {
  const byMonth = shape(baseMonthlyMT, s)
  const peakMonth = byMonth.reduce((a, b) => (b.mt > a.mt ? b : a), byMonth[0])
  return {
    baseMonthlyMT,
    annualMT: baseMonthlyMT * 12,
    byMonth,
    breakdown: breakdown.filter((b) => b.annualMT > 0).sort((a, b) => b.annualMT - a.annualMT),
    peakMonth,
  }
}

// ---- A. Facility case-mix -------------------------------------------------

/** Average-month MT a single ward drives, given its O₂ patients. */
export function wardMonthlyMT(patients: number, p: DemandAssumptions['wards'][string], sc: DemandScalarsArg): number {
  if (!(patients > 0)) return 0
  let litres = 0
  for (let c = 0; c < 3; c++) {
    litres += patients * p.mix[c] * p.flow[c] * p.duration[c] * sc.minsPerDay
  }
  return litres / sc.mtConversion
}
type DemandScalarsArg = { minsPerDay: number; mtConversion: number }

export function computeFacilityDemand(
  input: FacilityDemandInput,
  a: DemandAssumptions,
  scenario: Scenario,
): DemandResult {
  const surge = scenario === 'pandemic' ? a.scalars.pandemicSurge : 1
  const breakdown: DemandResult['breakdown'] = []
  let base = 0
  for (const w of WARDS) {
    const prof = a.wards[w]
    if (!prof) continue
    const mt = wardMonthlyMT(input.wardPatients[w] ?? 0, prof, a.scalars) * surge
    base += mt
    breakdown.push({ key: w, label: WARD_LABELS[w], annualMT: mt * 12 })
  }
  return assemble(base, a.seasonality, breakdown)
}

// ---- B. Per-admission extrapolation --------------------------------------

/** Monthly cu m of gas from admissions via the closest strata factor (facility-cost entry). */
export function demandFromAdmissions(
  state: string,
  type: string,
  ipd: number,
  monthIndex: number,
  seasonality: Seasonality,
  scenario: Scenario,
  pandemicSurge: number,
): { cuM: number; mt: number; tranche: ReturnType<typeof matchTranche> } {
  const tranche = matchTranche(state, type, ipd)
  if (!tranche || !(ipd > 0)) return { cuM: 0, mt: 0, tranche }
  const surge = scenario === 'pandemic' ? pandemicSurge : 1
  const avgMonthMT = ipd * tranche.factor * surge
  const mult = monthMultipliers(seasonality)[Math.max(0, Math.min(11, monthIndex))]
  const mt = avgMonthMT * mult
  return { cuM: mt * MT_TO_CUM, mt, tranche }
}

/** District/State roll-up from the baked data, with editable factors, seasonality and surge. */
export function computeDistrictDemand(
  sel: DistrictSelection,
  factors: Record<string, number>,
  seasonality: Seasonality,
  scenario: Scenario,
  pandemicSurge: number,
): DemandResult {
  const dflt = defaultFactors()
  const surge = scenario === 'pandemic' ? pandemicSurge : 1
  const districts = sel.district ? [sel.district] : districtsOf(sel.state)
  const stateData = DISTRICTS[sel.state] ?? {}

  const breakdown: DemandResult['breakdown'] = []
  let base = 0
  for (const d of districts) {
    const dd = stateData[d]
    if (!dd) continue
    // Average month = baked annual (at default factors) / 12, with the extrapolated part
    // rescaled by each tranche's factor ratio; sampled part is fixed (ward-based).
    let districtAnnual = dd.sampledMT
    for (const [label, mt] of Object.entries(dd.byTranche)) {
      const ratio = dflt[label] ? (factors[label] ?? dflt[label]) / dflt[label] : 1
      districtAnnual += mt * ratio
    }
    districtAnnual *= surge
    base += districtAnnual / 12
    breakdown.push({ key: d, label: d, annualMT: districtAnnual })
  }
  return assemble(base, seasonality, breakdown)
}
