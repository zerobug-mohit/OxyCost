// Public API for the state / district oxygen budgeting engine.
export * from './types'
export { computeStateCost, facilityHeads, directHeads } from './compute'
export { explainFacilityHeads, explainDirectHeads } from './explain'
export type { StateFieldRef, StatePart, StateHeadExplain } from './explain'
export { predictProfile, signatureShares, SIGNATURES } from './model'
export {
  STATE_META,
  STATE_FACILITIES,
  STATE_LIST,
  FIELD_SAMPLES,
  BED_RANGE,
  defaultRates,
  defaultBandBeds,
  bandLabel,
  applyStateRates,
  predictBand,
  defaultShares,
  initialStateInputs,
} from './data'
