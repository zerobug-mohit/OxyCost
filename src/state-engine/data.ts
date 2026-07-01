// Loads the build-time model data (per-facility vectors, per-state rate
// profiles, national rate defaults) and exposes typed helpers: predict a band's
// archetype from (beds, state) via k-NN, and resolve state-specific rates.
import raw from '../data/state-profiles.json'
import type {
  BandKey,
  BandProfile,
  FacilityVector,
  StateInputs,
  StateRateProfile,
  StateRates,
} from './types'
import { BAND_KEYS } from './types'
import { predictProfile } from './model'

interface RawFile {
  meta: {
    cohortLabel: string
    n: number
    states: Record<string, { n: number; bedMin: number; bedMax: number }>
    bedMin: number
    bedMax: number
    note: string
  }
  bands: (BandProfile & { oxBeds: number })[]
  facilities: FacilityVector[]
  stateRates: Record<string, StateRateProfile>
  rates: Omit<StateRates, 'govtTechShare'>
}

const FILE = raw as unknown as RawFile

export const STATE_META = FILE.meta
export const STATE_FACILITIES = FILE.facilities
export const BED_RANGE = { min: FILE.meta.bedMin, max: FILE.meta.bedMax }
/** State picker options; "All states" = pooled cohort. */
export const STATE_LIST = ['All states', ...Object.keys(FILE.meta.states)]

/** Default average oxygen-bed size + display label for each band. */
const BAND_DEFAULTS: Record<BandKey, { oxBeds: number; label: string }> = Object.fromEntries(
  FILE.bands.map((b) => [b.band, { oxBeds: b.oxBeds, label: b.label }]),
) as Record<BandKey, { oxBeds: number; label: string }>

export function defaultBandBeds(band: BandKey): number {
  return BAND_DEFAULTS[band]?.oxBeds ?? 20
}

/** National (state-invariant) rate defaults from the workbook Assumptions. */
function nationalRates(): StateRates {
  return {
    ...FILE.rates,
    psaPowerByCapacity: { ...FILE.rates.psaPowerByCapacity },
    psaAssetByCapacity: { ...FILE.rates.psaAssetByCapacity },
    lmoAssetByKl: { ...FILE.rates.lmoAssetByKl },
    iec: { ...FILE.rates.iec },
    govtTechShare: 0,
  }
}

/** Merge a state's survey-observed rates (refill prices, salary) onto the base. */
export function applyStateRates(base: StateRates, stateName: string): StateRates {
  const sr = FILE.stateRates[stateName] ?? FILE.stateRates['All states']
  if (!sr) return base
  const next = { ...base }
  if (sr.cylRefillD != null) next.cylRefillD = sr.cylRefillD
  if (sr.cylRefillB != null) next.cylRefillB = sr.cylRefillB
  if (sr.salaryContractTech != null) next.salaryContractTech = sr.salaryContractTech
  return next
}

/** Rates freshly defaulted for a state. */
export function defaultRates(stateName = 'All states'): StateRates {
  return applyStateRates(nationalRates(), stateName)
}

/** Predict a band's archetype (k-NN over the survey) at the given size + state. */
export function predictBand(band: BandKey, oxBeds: number, stateName: string): BandProfile {
  return predictProfile(
    band,
    BAND_DEFAULTS[band]?.label ?? band,
    oxBeds,
    stateName,
    STATE_FACILITIES,
    BED_RANGE,
  )
}

/** Re-predict every band's profile at its current size for a (new) state. */
export function predictAll(profiles: BandProfile[], stateName: string): BandProfile[] {
  return profiles.map((p) => predictBand(p.band, p.oxBeds, stateName))
}

/** Initial input state: no facilities entered, defaults + predictions loaded. */
export function initialStateInputs(): StateInputs {
  const stateName = 'All states'
  const counts = Object.fromEntries(BAND_KEYS.map((b) => [b, 0])) as StateInputs['counts']
  const profiles = BAND_KEYS.map((b) => predictBand(b, defaultBandBeds(b), stateName))
  return { stateName, counts, profiles, rates: defaultRates(stateName) }
}
