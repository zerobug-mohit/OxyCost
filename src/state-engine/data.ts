// Loads the build-time bed-band archetypes + default state rates and exposes
// them as typed, cloneable defaults for the UI's editable inputs.
import raw from '../data/state-profiles.json'
import type { BandProfile, StateInputs, StateRates } from './types'
import { BAND_KEYS } from './types'

interface RawFile {
  meta: { cohortLabel: string; note: string }
  bands: BandProfile[]
  rates: Omit<StateRates, 'govtTechShare'>
}

const FILE = raw as unknown as RawFile

export const STATE_META = FILE.meta

/** Fresh copy of the archetype profiles (so edits don't mutate the import). */
export function defaultProfiles(): BandProfile[] {
  return FILE.bands.map((b) => ({ ...b }))
}

/** Fresh copy of the default state rates. */
export function defaultRates(): StateRates {
  return {
    ...FILE.rates,
    // Nested objects need their own copies too.
    psaPowerByCapacity: { ...FILE.rates.psaPowerByCapacity },
    psaAssetByCapacity: { ...FILE.rates.psaAssetByCapacity },
    lmoAssetByKl: { ...FILE.rates.lmoAssetByKl },
    iec: { ...FILE.rates.iec },
    // Survey did not split govt vs contractual technicians — default all
    // contractual (0% govt); editable.
    govtTechShare: 0,
  }
}

/** Initial input state: no facilities entered yet, defaults loaded. */
export function initialStateInputs(): StateInputs {
  const counts = Object.fromEntries(BAND_KEYS.map((b) => [b, 0])) as StateInputs['counts']
  return { counts, profiles: defaultProfiles(), rates: defaultRates() }
}
