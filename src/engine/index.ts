// Public API for the OxyCost calculation engine (spec section 7, architecture).
// The engine is pure: every export takes plain data and returns plain data,
// with no React/UI dependency.

export * from './types'
export * from './constants'
export * from './conversions'
export { calcPsa, effectivePsaPlantCost, resolvePsaAmc } from './psa'
export { calcLmo } from './lmo'
export { calcCylinder } from './cylinder'
export { calcConcentrator } from './concentrator'
export { compareAllSources, computeSources } from './comparison'
export {
  costCurves,
  resultAtVolume,
  generateVolumeRange,
  psaMaxVolume,
  ocMaxVolume,
  pickView,
} from './sweep'
export type { CurvePoint, CurveSeries, InstanceInputs } from './sweep'
export { explainSource } from './explain'
export type { CalcStep, SourceExplanation } from './explain'
