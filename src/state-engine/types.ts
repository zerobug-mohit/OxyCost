// State / district oxygen budgeting engine — type definitions.
// Pure data (no React). A facility of a given oxygen-bed BAND is expanded from a
// median "archetype" profile; each source's cost is weighted by the share of
// band facilities that actually have it (*Prob), so a band total is the EXPECTED
// annual cost across its facilities — the right basis for population budgeting.

export type BandKey = '<10' | '10-29' | '30-59' | '60+'

export const BAND_KEYS: BandKey[] = ['<10', '10-29', '30-59', '60+']

/** Cost-head grouping, for the by-source rollup and colour coding. */
export type CostGroup =
  | 'psa'
  | 'lmo'
  | 'cylinder'
  | 'oc'
  | 'mgps'
  | 'oximeter'
  | 'hr'
  | 'training'
  | 'iec'

/** A median facility archetype for one oxygen-bed band (editable in the UI). */
export interface BandProfile {
  band: BandKey
  label: string
  n: number
  oxBeds: number
  totalBeds: number
  funcBeds: number
  iecTier: 'small' | 'mid' | 'large'
  // PSA
  psaProb: number
  psaPlants: number
  psaCapacityLpm: number
  psaProdHrsPerDay: number
  // LMO
  lmoProb: number
  lmoTanks: number
  lmoCapacityKl: number
  lmoAnnualKl: number
  // Cylinders
  cylProb: number
  cylDCount: number
  cylBCount: number
  cylACount: number
  cylDRefillsMo: number
  cylBRefillsMo: number
  cylARefillsMo: number
  // Concentrators
  ocProb: number
  ocDeployed: number
  ocHrsPerDay: number
  // MGPS
  mgpsProb: number
  mgpsBhu: number
  // HR
  techProb: number
  techs: number
  // Norm-based (not from survey; editable)
  fingertip: number
  bedside: number
  doctors: number
  nurses: number
  paramedics: number
  boosters: number
  // Prediction diagnostics (set by the k-NN model; editing a field leaves them).
  /** 0–100 model confidence for this band's predicted profile. */
  confidence: number
  /** Number of survey facilities the prediction leaned on. */
  neighbors: number
}

/** An anonymized per-facility infrastructure vector (k-NN training row). */
export interface FacilityVector {
  state: string
  oxBeds: number
  funcBeds: number
  psa: number
  psaPlants: number
  psaCapacityLpm: number
  lmo: number
  lmoTanks: number
  cyl: number
  cylDRefillsMo: number
  cylBRefillsMo: number
  cylARefillsMo: number
  cylCount: number
  oc: number
  ocDeployed: number
  mgps: number
  bhu: number
  techs: number
  priceD: number
  priceB: number
  salaryPerTech: number
}

/** Confidence band for display. */
export type ConfidenceLevel = 'High' | 'Moderate' | 'Low'

export function confidenceLevel(score: number): ConfidenceLevel {
  return score >= 70 ? 'High' : score >= 45 ? 'Moderate' : 'Low'
}

/** State-level unit rates (Form B / Assumptions defaults; editable). */
export interface StateRates {
  electricityTariff: number
  psaPowerByCapacity: Record<string, number>
  ocPowerKwh: number
  cylRefillD: number
  cylRefillB: number
  cylRefillA: number
  cylTransportPerTrip: number
  cylPerTrip: number
  cylHydrotest: number
  lmoRatePerKg: number
  lmoAmcPct: number
  lmoAssetByKl: Record<string, number>
  psaCamcPct: number
  psaAssetByCapacity: Record<string, number>
  psaRepairPct: number
  mgpsAmcPct: number
  mgpsAssetPerBhu: number
  mgpsRepairPct: number
  ocAmcPct: number
  ocAsset: number
  ocFilterPerYear: number
  oxiFingertipPerYear: number
  oxiBedsideProbePerYear: number
  oxiBedsideAmcPct: number
  oxiBedsideAsset: number
  salaryGovtTech: number
  salaryContractTech: number
  /** Share of dedicated technicians on government payroll (rest contractual). */
  govtTechShare: number
  trainDoctor: number
  trainNurse: number
  trainParamedic: number
  trainPsaTech: number
  refresherEveryYears: number
  refresherPct: number
  iec: Record<'small' | 'mid' | 'large', number>
  contingencyPct: number
  ocHighHrs: number
  ocLowHrs: number
}

/** An infrastructure sub-band (facility archetype) within a bed band. */
export interface Signature {
  key: string
  label: string
  /** 1 = has PSA, 0 = no PSA. */
  psa: 0 | 1
  /** 1 = has LMO, 0 = no LMO. */
  lmo: 0 | 1
}

/** A costed sub-band: an archetype profile, its share of the band, and count. */
export interface SubBandResult {
  key: string
  label: string
  /** Share of the band's facilities in this archetype (0–1). */
  share: number
  /** Facilities of this archetype (count × share). */
  count: number
  profile: BandProfile
}

/** The full editable input state for the tab. */
export interface StateInputs {
  /** Selected state (drives state-specific rate defaults + k-NN weighting). */
  stateName: string
  /** How many facilities the district/state has in each bed band. */
  counts: Record<BandKey, number>
  /** Typical oxygen-bed size for each band (the k-NN prediction point). */
  beds: Record<BandKey, number>
  /**
   * Editable sub-band mix per band: fraction of the band's facilities in each
   * infrastructure archetype (aligned to SIGNATURES order). `null` = use the
   * data-derived mix for that band.
   */
  subShares: Record<BandKey, number[] | null>
  /**
   * Per-band manual overrides of predicted archetype variables (applied to every
   * sub-band in that band). Empty = use the model's predictions.
   */
  overrides: Record<BandKey, Partial<BandProfile>>
  /** Editable state unit rates. */
  rates: StateRates
}

/** Per-state rate overrides observed in the survey (rest stay national). */
export interface StateRateProfile {
  n: number
  cylRefillD: number | null
  cylRefillB: number | null
  salaryContractTech: number | null
}

export interface StateResultConfidence {
  /** Cost-weighted 0–100 confidence across the entered bands. */
  score: number
  level: ConfidenceLevel
  /** Share of the budget from norm-based (not survey-observed) heads. */
  normShare: number
  note: string
}

/** One expense head's expected annual cost. */
export interface CostHead {
  key: string
  label: string
  group: CostGroup
  /** True if this head is a one-time (year-1) cost, not recurring annually. */
  oneTime?: boolean
  annual: number
}

export interface BandResult {
  band: BandKey
  label: string
  count: number
  /** Expected annual cost for ONE facility of this band. */
  perFacilityAnnual: number
  /** count × perFacilityAnnual (contingency-scaled). */
  bandAnnual: number
  funcBeds: number
  /** 0–100 prediction confidence for this band. */
  confidence: number
  /** The infrastructure sub-bands this band splits into. */
  subBands: SubBandResult[]
}

export interface StateResult {
  /** Aggregated expense heads across all facilities (annual ₹). */
  heads: CostHead[]
  byGroup: { group: CostGroup; label: string; annual: number }[]
  byBand: BandResult[]
  totalFacilities: number
  totalFuncBeds: number
  subtotal: number
  contingency: number
  total: number
  /** Recurring total (excludes one-time heads) — the steady-state annual bill. */
  recurringTotal: number
  oneTimeTotal: number
  costPerFuncBed: number
  confidence: StateResultConfidence
}
