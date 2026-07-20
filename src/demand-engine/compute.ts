// The demand engine. Two methods (both from the case-mix workbook):
//   A. Facility case-mix — per ward: Σ_c patients×mix_c×flow_c×duration_c×mins ÷ conversion → MT
//   B. Per-admission extrapolation — admissions × strata factor → MT (used by the district
//      roll-up and the facility-cost "From admissions" demand entry).
// Month convention: entered ward patient counts are the load for a CHOSEN month; the other months
// are scaled from it by seasonality and the annual is their sum (so the chosen month reads back
// exactly). The per-admission path treats its input as the average month (centred on 1.0).
import {
  DISTRICTS,
  MONTH_LABELS,
  MONTH_SEASON,
  TRANCHES,
  WARD_LABELS,
  WARDS,
  defaultFactors,
  districtsOf,
  matchTranche,
} from './data'
import type {
  BreakdownItem,
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

/** Distribute an annual total across the 12 months by their seasonality share. */
function monthsFromAnnual(annualMT: number, s: Seasonality): DemandResult['byMonth'] {
  const weights = MONTH_SEASON.map((key) => s[key])
  const sum = weights.reduce((x, y) => x + y, 0) || 1
  return MONTH_LABELS.map((label, i) => ({ label, mt: (annualMT * weights[i]) / sum }))
}

function assemble(annualMT: number, s: Seasonality, breakdown: DemandResult['breakdown']): DemandResult {
  const byMonth = monthsFromAnnual(annualMT, s)
  const peakMonth = byMonth.reduce((a, b) => (b.mt > a.mt ? b : a), byMonth[0])
  return {
    baseMonthlyMT: annualMT / 12,
    annualMT,
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

/**
 * Facility demand. The entered O₂ patients are the load for `month` (0=Nov …
 * 11=Oct); demand for the other months is scaled by their seasonality relative
 * to that month, and the annual is the sum — so the entered month reads back
 * exactly and the year is extrapolated by seasonality (like the workbook).
 */
export function computeFacilityDemand(
  input: FacilityDemandInput,
  a: DemandAssumptions,
  scenario: Scenario,
  month = 0,
): DemandResult {
  const surge = scenario === 'pandemic' ? a.scalars.pandemicSurge : 1
  const weights = MONTH_SEASON.map((k) => a.seasonality[k])
  const totalW = weights.reduce((x, y) => x + y, 0) || 1
  const refW = a.seasonality[MONTH_SEASON[Math.max(0, Math.min(11, month))]] || 1
  const annualMult = totalW / refW // entered month → full-year multiplier
  const breakdown: DemandResult['breakdown'] = []
  let enteredMonthMT = 0
  for (const w of WARDS) {
    const prof = a.wards[w]
    if (!prof) continue
    const wm = wardMonthlyMT(input.wardPatients[w] ?? 0, prof, a.scalars) * surge
    enteredMonthMT += wm
    breakdown.push({ key: w, label: WARD_LABELS[w], annualMT: wm * annualMult })
  }
  return assemble(enteredMonthMT * annualMult, a.seasonality, breakdown)
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
  // Map a strata label to its "type · ≤band" description, within this state.
  const byLabel: Record<string, { type: string; band: string }> = {}
  for (const t of TRANCHES) if (t.state === sel.state) byLabel[t.label] = { type: t.type, band: t.band }

  const breakdown: DemandResult['breakdown'] = []
  let total = 0
  for (const d of districts) {
    const dd = stateData[d]
    if (!dd) continue
    // Group this district's facilities by their strata label ("_sampled" = ward-based).
    const facsByTr: Record<string, { name: string; mt: number }[]> = {}
    for (const f of dd.facilities ?? []) (facsByTr[f.tr] ??= []).push(f)
    const facNodes = (tr: string, ratio: number) =>
      (facsByTr[tr] ?? [])
        .map((f) => ({ key: `${d}:${tr}:${f.name}`, label: f.name, annualMT: f.mt * ratio * surge }))
        .sort((a, b) => b.annualMT - a.annualMT)

    // Baked annual (at default factors), with the extrapolated part rescaled by each
    // tranche's factor ratio; the sampled part is fixed (ward-based).
    let districtAnnual = dd.sampledMT
    const children: NonNullable<DemandResult['breakdown'][number]['children']> = []
    for (const [label, mt] of Object.entries(dd.byTranche)) {
      const ratio = dflt[label] ? (factors[label] ?? dflt[label]) / dflt[label] : 1
      const childAnnual = mt * ratio
      districtAnnual += childAnnual
      const t = byLabel[label]
      const kids = facNodes(label, ratio)
      children.push({
        key: `${d}:${label}`,
        label: t ? `${t.type} · ≤ ${t.band} band` : label,
        annualMT: childAnnual * surge,
        count: kids.length || undefined,
        children: kids,
      })
    }
    if (dd.sampledMT > 0) {
      const kids = facNodes('_sampled', 1)
      children.push({
        key: `${d}:sampled`,
        label: 'Sampled facilities (ward-based)',
        annualMT: dd.sampledMT * surge,
        count: kids.length || undefined,
        children: kids,
      })
    }
    districtAnnual *= surge
    total += districtAnnual
    children.sort((a, b) => b.annualMT - a.annualMT)
    breakdown.push({ key: d, label: d, annualMT: districtAnnual, count: dd.facilityCount, children })
  }
  return assemble(total, seasonality, breakdown)
}

/**
 * Apply per-node demand overrides (annual MT, keyed by breakdown node key) and
 * re-roll-up the total. An override on a node WINS — it replaces the sum of its
 * children — so any level (district / strata / facility) can be edited and the
 * headline total reflects it. Returns a fresh result (input is not mutated).
 */
export function applyDemandOverrides(
  result: DemandResult,
  overrides: Record<string, number>,
  seasonality: Seasonality,
): DemandResult {
  if (!overrides || Object.keys(overrides).length === 0) return result
  const tree = JSON.parse(JSON.stringify(result.breakdown)) as BreakdownItem[]
  const eff = (node: BreakdownItem): number => {
    if (Object.prototype.hasOwnProperty.call(overrides, node.key)) {
      node.annualMT = overrides[node.key]
      return node.annualMT
    }
    if (node.children && node.children.length > 0) {
      node.annualMT = node.children.reduce((s, c) => s + eff(c), 0)
      return node.annualMT
    }
    return node.annualMT
  }
  let total = 0
  for (const n of tree) total += eff(n)
  return assemble(total, seasonality, tree)
}
