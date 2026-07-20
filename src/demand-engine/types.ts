// Types for the oxygen DEMAND estimation engine (case-mix method + per-admission
// extrapolation). All demand is computed in metric tonnes (MT); 1 MT = 750 cu m.

/** Ward identifier (matches the keys in demand.json). */
export type WardKey = string

/** A ward's case profile — per severity class [C1 low, C2 moderate, C3 high]. */
export interface WardProfile {
  label: string
  flow: [number, number, number] // LPM
  duration: [number, number, number] // days
  mix: [number, number, number] // fractions, sum ≈ 1
}

export interface Seasonality {
  winter: number
  summer: number
  monsoon: number
  autumn: number
}
export type SeasonKey = keyof Seasonality

export interface DemandScalars {
  minsPerDay: number
  mtConversion: number
  pandemicSurge: number
}

/** The full editable assumption set for the facility case-mix method. */
export interface DemandAssumptions {
  wards: Record<WardKey, WardProfile>
  seasonality: Seasonality
  scalars: DemandScalars
}

export type Scenario = 'normal' | 'pandemic'

/** Facility case-mix input: monthly O₂ patients per ward. */
export interface FacilityDemandInput {
  wardPatients: Record<WardKey, number>
}

/** Result of a demand computation (facility or district). MT is the native unit. */
export interface DemandResult {
  /** Average-month demand (MT), before seasonality reshaping. */
  baseMonthlyMT: number
  /** Annual demand (MT) = 12 × average month. */
  annualMT: number
  /** 12 calendar months (Nov-25 … Oct-26), seasonally reshaped (MT). */
  byMonth: { label: string; mt: number }[]
  /**
   * Contribution breakdown (per ward for facility; per district for a whole
   * state). District items carry an optional `children` sub-breakdown by strata
   * (facility type × admission band) — the finest published granularity.
   */
  breakdown: BreakdownItem[]
  peakMonth: { label: string; mt: number }
}

export interface BreakdownItem {
  key: string
  label: string
  annualMT: number
  /** Optional drill-down (e.g. a district → its facility-type × band strata). */
  children?: { key: string; label: string; annualMT: number }[]
  /** Optional count shown alongside (e.g. facilities in a district). */
  count?: number
}

/** A demand strata (State × facility type × admission band) with its per-admission factor. */
export interface Tranche {
  state: string
  type: string
  band: string
  upperBound: number
  label: string
  factor: number
}

/** Baked demand for one district, split into fixed (sampled) + rescalable (extrapolated). */
export interface DistrictDemand {
  sampledMT: number
  byTranche: Record<string, number>
  facilityCount: number
}

export interface DistrictSelection {
  state: string
  /** null = whole state. */
  district: string | null
}
