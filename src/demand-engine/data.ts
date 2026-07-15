// Loads the baked demand dataset (src/data/demand.json) and exposes typed
// helpers. Everything downstream imports from the '../demand-engine' barrel.
import raw from '../data/demand.json'
import type {
  DemandAssumptions,
  DistrictDemand,
  Seasonality,
  Tranche,
  WardKey,
  WardProfile,
} from './types'

interface RawFile {
  wards: Record<string, WardProfile>
  seasonality: Seasonality
  monthSeason: (keyof Seasonality)[]
  monthLabels: string[]
  scalars: { minsPerDay: number; mtConversion: number; pandemicSurge: number }
  tranches: Tranche[]
  districts: Record<string, Record<string, DistrictDemand>>
}

const FILE = raw as unknown as RawFile

/** Ordered ward keys, and their display labels. */
export const WARDS: WardKey[] = Object.keys(FILE.wards)
export const WARD_LABELS: Record<WardKey, string> = Object.fromEntries(
  WARDS.map((w) => [w, FILE.wards[w].label]),
)

/** Ward groupings for the input UI (progressive disclosure — smaller visual chunks). */
export const WARD_GROUPS: { title: string; wards: WardKey[] }[] = [
  { title: 'Critical care', wards: ['icu', 'hdu', 'PICU', 'NICU'] },
  { title: 'General wards', wards: ['general', 'surgical', 'ortho', 'ENT', 'TB', 'geriatric'] },
  { title: 'Maternal & child', wards: ['maternity', 'gynec', 'pedia', 'NRC'] },
  { title: 'Emergency / OT / other', wards: ['emergency', 'OT', 'covid', 'others'] },
].map((g) => ({ title: g.title, wards: g.wards.filter((w) => WARDS.includes(w)) }))

/** 12 calendar-month labels (model runs Nov-25 … Oct-26). */
export const MONTH_LABELS: string[] = FILE.monthLabels
/** Season key per calendar month (index-aligned with MONTH_LABELS). */
export const MONTH_SEASON: (keyof Seasonality)[] = FILE.monthSeason

export const TRANCHES: Tranche[] = FILE.tranches
export const DISTRICTS = FILE.districts
export const STATES: string[] = Object.keys(FILE.districts)

/** Facility types present in the strata, per state (for the "From admissions" picker). */
export function facilityTypesFor(state: string): string[] {
  const set = new Set(TRANCHES.filter((t) => t.state === state).map((t) => t.type))
  return [...set]
}

export function districtsOf(state: string): string[] {
  return Object.keys(FILE.districts[state] ?? {}).sort()
}

/** Deep-cloned default assumptions (so the UI can mutate freely). */
export function defaultAssumptions(): DemandAssumptions {
  return JSON.parse(JSON.stringify({ wards: FILE.wards, seasonality: FILE.seasonality, scalars: FILE.scalars }))
}

/** Default per-admission factor per tranche label. */
export function defaultFactors(): Record<string, number> {
  return Object.fromEntries(TRANCHES.map((t) => [t.label, t.factor]))
}

/**
 * Match a (state, type, monthly-admissions) triple to the closest strata: the
 * smallest admission band for that state+type whose upper bound covers the
 * admissions; fall back to the highest band for that state+type, then to any
 * band of that type (pooled), then to nothing.
 */
export function matchTranche(state: string, type: string, ipd: number): Tranche | null {
  const exact = TRANCHES.filter((t) => t.state === state && t.type === type).sort(
    (a, b) => a.upperBound - b.upperBound,
  )
  if (exact.length) return exact.find((t) => ipd <= t.upperBound) ?? exact[exact.length - 1]
  const byType = TRANCHES.filter((t) => t.type === type).sort((a, b) => a.upperBound - b.upperBound)
  if (byType.length) return byType.find((t) => ipd <= t.upperBound) ?? byType[byType.length - 1]
  return null
}
