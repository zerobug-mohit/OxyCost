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
import { predictProfile, signatureShares } from './model'

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
/** State picker options — the surveyed states. */
export const STATE_LIST = Object.keys(FILE.meta.states)
/** Default state = the one with the most surveyed facilities (best support). */
export const DEFAULT_STATE =
  Object.entries(FILE.meta.states).sort((a, b) => b[1].n - a[1].n)[0]?.[0] ?? STATE_LIST[0]

/** Default average oxygen-bed size + display label for each band. */
const BAND_DEFAULTS: Record<BandKey, { oxBeds: number; label: string }> = Object.fromEntries(
  FILE.bands.map((b) => [b.band, { oxBeds: b.oxBeds, label: b.label }]),
) as Record<BandKey, { oxBeds: number; label: string }>

export function defaultBandBeds(band: BandKey): number {
  return BAND_DEFAULTS[band]?.oxBeds ?? 20
}

export function bandLabel(band: BandKey): string {
  return BAND_DEFAULTS[band]?.label ?? band
}

/**
 * Survey value samples per editable variable, for the "where does my value land"
 * mini distribution. Only variables the survey actually measured appear here;
 * others (norms, rates) have no empirical distribution and show no curve.
 */
export const FIELD_SAMPLES: Record<string, number[]> = (() => {
  const F = STATE_FACILITIES
  const pos = (xs: number[]) => xs.filter((x) => x > 0)
  return {
    oxBeds: pos(F.map((f) => f.oxBeds)),
    funcBeds: pos(F.map((f) => f.funcBeds)),
    psaPlants: pos(F.filter((f) => f.psa).map((f) => f.psaPlants)),
    psaCapacityLpm: pos(F.filter((f) => f.psa).map((f) => f.psaCapacityLpm)),
    cylDRefillsMo: pos(F.map((f) => f.cylDRefillsMo)),
    cylBRefillsMo: pos(F.map((f) => f.cylBRefillsMo)),
    cylDCount: pos(F.map((f) => f.cylCount)),
    cylARefillsMo: pos(F.map((f) => f.cylARefillsMo)),
    ocDeployed: pos(F.filter((f) => f.oc).map((f) => f.ocDeployed)),
    mgpsBhu: pos(F.filter((f) => f.mgps).map((f) => f.bhu)),
    techs: pos(F.map((f) => f.techs)),
    // Rate-field distributions (facility-level values the survey recorded).
    cylRefillD: pos(F.map((f) => f.priceD)),
    cylRefillB: pos(F.map((f) => f.priceB)),
    salaryContractTech: pos(F.map((f) => f.salaryPerTech)),
  }
})()

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

/** Predict one archetype (optionally a signature-filtered sub-band). */
export function predictBand(
  band: BandKey,
  oxBeds: number,
  stateName: string,
  signature?: Parameters<typeof predictProfile>[6],
): BandProfile {
  return predictProfile(band, bandLabel(band), oxBeds, stateName, STATE_FACILITIES, BED_RANGE, signature)
}

/** Data-derived sub-band mix (share per SIGNATURE) at a size + state. */
export function defaultShares(oxBeds: number, stateName: string): number[] {
  return signatureShares(oxBeds, stateName, STATE_FACILITIES)
}

/** Initial input state: no facilities entered, defaults loaded. */
export function initialStateInputs(): StateInputs {
  const stateName = DEFAULT_STATE
  const counts = Object.fromEntries(BAND_KEYS.map((b) => [b, 0])) as StateInputs['counts']
  const beds = Object.fromEntries(BAND_KEYS.map((b) => [b, defaultBandBeds(b)])) as StateInputs['beds']
  const subShares = Object.fromEntries(BAND_KEYS.map((b) => [b, null])) as StateInputs['subShares']
  const overrides = Object.fromEntries(BAND_KEYS.map((b) => [b, {}])) as StateInputs['overrides']
  return { stateName, counts, beds, subShares, overrides, rates: defaultRates(stateName) }
}
