// Unit conversion utilities — spec section 3.
// All internal calculations use cubic metres (cu m) of gaseous O2.

import {
  B_TYPE_CU_M,
  D_TYPE_CU_M,
  KG_TO_CU_M,
  LITRES_PER_CU_M,
  LMO_EXPANSION,
  MINUTES_PER_HOUR,
} from './constants'
import type { CylinderType } from './types'

/** Litres of gaseous O2 -> cu m (spec 3a). */
export function litresToCuM(litres: number): number {
  return litres / LITRES_PER_CU_M
}

/** Cu m -> litres of gaseous O2. */
export function cuMToLitres(cuM: number): number {
  return cuM * LITRES_PER_CU_M
}

/** Litres of LMO (liquid) -> cu m of gas. 1 L LMO = 0.861 cu m gas (spec 3a). */
export function lmoLitresToCuM(lmoLitres: number): number {
  return lmoLitres * LMO_EXPANSION
}

/** Cu m of gas -> litres of LMO (inverse of expansion). */
export function cuMToLmoLitres(cuM: number): number {
  return cuM / LMO_EXPANSION
}

/** The units a facility may report LMO refill volume in. */
export type LmoUnit = 'cu_m' | 'nm3' | 'litres' | 'kl' | 'kg'

export const LMO_UNIT_LABELS: Record<LmoUnit, string> = {
  cu_m: 'cu m gas',
  nm3: 'Nm³',
  litres: 'litres LMO',
  kl: 'KL LMO',
  kg: 'kg',
}

/**
 * Convert an LMO refill quantity reported in any common unit to cu m of gaseous
 * O2 (the engine's internal unit). Nm³ ≈ cu m gas; 1 L LMO = 0.861 cu m gas;
 * 1 KL = 1000 L; 1 kg ≈ 0.700 cu m gas.
 */
export function lmoUnitToCuM(value: number, unit: LmoUnit): number {
  switch (unit) {
    case 'cu_m':
    case 'nm3':
      return value
    case 'litres':
      return value * LMO_EXPANSION
    case 'kl':
      return value * 1000 * LMO_EXPANSION
    case 'kg':
      return value * KG_TO_CU_M
  }
}

/** Inverse of lmoUnitToCuM: cu m gas -> a quantity in the given unit. */
export function cuMToLmoUnit(cuM: number, unit: LmoUnit): number {
  switch (unit) {
    case 'cu_m':
    case 'nm3':
      return cuM
    case 'litres':
      return cuM / LMO_EXPANSION
    case 'kl':
      return cuM / LMO_EXPANSION / 1000
    case 'kg':
      return cuM / KG_TO_CU_M
  }
}

/** Cylinder count -> cu m, by type (spec 3a). */
export function cylindersToCuM(count: number, type: CylinderType): number {
  return count * (type === 'd_type' ? D_TYPE_CU_M : B_TYPE_CU_M)
}

/** LPM -> cu m per hour (spec 3b). */
export function lpmToCuMPerHour(lpm: number): number {
  return (lpm * MINUTES_PER_HOUR) / LITRES_PER_CU_M
}

/**
 * LPM -> Nm3/hr. Approximately equivalent to cu m/hr at standard conditions
 * (spec 3b); kept as a named function so the UI can label it distinctly.
 */
export function lpmToNm3PerHour(lpm: number): number {
  return (lpm * MINUTES_PER_HOUR) / LITRES_PER_CU_M
}

/**
 * Demand from bed count (spec 5c, mode 2):
 * beds * avg LPM/bed * hours/day * 30 days, converted to cu m.
 */
export function demandFromBeds(
  beds: number,
  lpmPerBed: number,
  hoursPerDay: number,
  daysPerMonth = 30,
): number {
  const litres = beds * lpmPerBed * MINUTES_PER_HOUR * hoursPerDay * daysPerMonth
  return litresToCuM(litres)
}

/**
 * Demand from PSA utilization (spec 5c, mode 3):
 * capacity (LPM) * utilization% * 24h * 30d * 60 / 1000 = monthly cu m.
 */
export function demandFromPsaUtilization(
  capacityLpm: number,
  utilizationFraction: number,
  daysPerMonth = 30,
): number {
  const litres =
    capacityLpm *
    utilizationFraction *
    24 *
    daysPerMonth *
    MINUTES_PER_HOUR
  return litresToCuM(litres)
}
