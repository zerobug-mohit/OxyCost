// Preset helpers (spec section 5b, 10b-10d). Presets are data in constants.ts;
// these functions apply capacity-driven PSA suggestions and expose reference
// ranges for the UI.
import {
  PSA_FIXED_CHARGE_BY_CAPACITY,
  PSA_PLANT_COST_RANGE,
  PSA_POWER_BY_CAPACITY,
  PSA_POWER_RANGE,
} from '../engine'
import type { PsaInputs } from '../engine'

/** Nearest benchmarked capacity bucket for lookups (200/500/1000/1500). */
export function nearestPsaBucket(capacityLpm: number): number {
  const buckets = [200, 500, 1000, 1500]
  return buckets.reduce((best, b) =>
    Math.abs(b - capacityLpm) < Math.abs(best - capacityLpm) ? b : best,
  )
}

/**
 * When the user changes PSA capacity, suggest matching power and fixed-charge
 * defaults from capacity benchmarks. Only overwrites fields the user has not
 * customized away from the previous bucket's default.
 */
export function applyPsaCapacityPresets(
  prev: PsaInputs,
  newCapacity: number,
): PsaInputs {
  const prevBucket = nearestPsaBucket(prev.psa_capacity_lpm)
  const nextBucket = nearestPsaBucket(newCapacity)
  const next: PsaInputs = { ...prev, psa_capacity_lpm: newCapacity }

  // Update power if it still matches the previous bucket's preset.
  if (prev.psa_power_kw === PSA_POWER_BY_CAPACITY[prevBucket]) {
    next.psa_power_kw = PSA_POWER_BY_CAPACITY[nextBucket]
  }
  if (prev.electricity_fixed_monthly === PSA_FIXED_CHARGE_BY_CAPACITY[prevBucket]) {
    next.electricity_fixed_monthly = PSA_FIXED_CHARGE_BY_CAPACITY[nextBucket]
  }
  return next
}

export function psaPowerHint(capacityLpm: number): string {
  const [lo, hi] = PSA_POWER_RANGE[nearestPsaBucket(capacityLpm)]
  return `Typical for ~${nearestPsaBucket(capacityLpm)} LPM: ${lo}–${hi} KW`
}

export function psaPlantCostHint(capacityLpm: number): string {
  const [lo, hi] = PSA_PLANT_COST_RANGE[nearestPsaBucket(capacityLpm)]
  const lakh = (v: number) => `₹${(v / 1e5).toFixed(0)} lakh`
  return `Typical for ~${nearestPsaBucket(capacityLpm)} LPM: ${lakh(lo)}–${lakh(hi)}`
}
