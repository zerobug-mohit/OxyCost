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

/** The full editable input state for the tab. */
export interface StateInputs {
  /** How many facilities the district/state has in each bed band. */
  counts: Record<BandKey, number>
  /** Editable archetype profiles (defaulted from the 92-facility data). */
  profiles: BandProfile[]
  /** Editable state unit rates. */
  rates: StateRates
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
  /** count × perFacilityAnnual. */
  bandAnnual: number
  funcBeds: number
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
}
