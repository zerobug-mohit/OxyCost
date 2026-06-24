// Default/preset values and conversion factors — spec sections 3, 5b, 10.
// All defaults live here as plain data (architecture decision 7a.3): changing
// a preset is a one-line edit, not a hunt through components.

import type {
  CylinderInputs,
  CylinderType,
  LmoInputs,
  OcInputs,
  PsaInputs,
  SharedInputs,
} from './types'

// --- Conversion factors (spec section 3) -----------------------------------

/** Litres of LMO per cu m of gaseous O2 expansion denominator. 1 L LMO = 0.861 cu m gas. */
export const LMO_EXPANSION = 0.861
export const LITRES_PER_CU_M = 1000
/** O2 gas density: 1 kg of oxygen ≈ 0.700 Nm³ (1.429 kg/Nm³). */
export const KG_TO_CU_M = 0.7
export const D_TYPE_CU_M = 7
export const B_TYPE_CU_M = 1.5
export const PSA_AMC_RATE = 0.0327
export const MINUTES_PER_HOUR = 60
export const MONTHS_PER_YEAR = 12

// --- Shared presets ---------------------------------------------------------

export const DEFAULT_ELECTRICITY_RATE = 7.52

// --- PSA benchmark tables (spec sections 4a, 10b, 10c) ----------------------

/** Median fixed electricity charge (INR/month) by PSA capacity (LPM). */
export const PSA_FIXED_CHARGE_BY_CAPACITY: Record<number, number> = {
  200: 9500,
  500: 20000,
  1000: 25000,
  1500: 30436,
}

/** Median power consumption (KW) by capacity, from facility benchmarks. */
export const PSA_POWER_BY_CAPACITY: Record<number, number> = {
  200: 30,
  500: 45,
  1000: 65,
  1500: 75,
}

/** Suggested power range (min/max KW) by capacity, for UI hints. */
export const PSA_POWER_RANGE: Record<number, [number, number]> = {
  200: [15, 45],
  500: [22, 65],
  1000: [40, 80],
  1500: [60, 105],
}

/** Plant cost range (INR) by capacity, for UI hints. */
export const PSA_PLANT_COST_RANGE: Record<number, [number, number]> = {
  200: [2_000_000, 5_000_000],
  500: [3_500_000, 7_500_000],
  1000: [6_000_000, 10_000_000],
  1500: [8_000_000, 12_500_000],
}

export const PSA_COMMON_CAPACITIES = [200, 500, 1000, 1500] as const

/** Variant options chosen in Step 2 (count of each spawns that many units). */
export const OC_OUTPUT_OPTIONS = [5, 10] as const
export const LMO_CAPACITY_OPTIONS = [6, 11, 13, 20] as const

// --- Default input objects ---------------------------------------------------

/**
 * Compressor share of total PSA power (survey-informed). The compressor is the
 * dominant load; the balance-of-plant draws the remainder whenever the plant is
 * on.
 */
export const PSA_COMPRESSOR_POWER_FRACTION = 0.9
/** Production hours ÷ running hours. Survey: 25th pct ≈ 0.89; default 0.9. */
export const PSA_COMPRESSOR_RUN_FRACTION = 0.9

export const PSA_DEFAULTS: PsaInputs = {
  psa_capacity_lpm: 1000,
  psa_ownership: 'purchased', // PSA plants are usually capital purchases / grant-funded
  psa_rental_monthly: 0,
  psa_power_kw: 65,
  psa_compressor_power_fraction: PSA_COMPRESSOR_POWER_FRACTION,
  psa_compressor_run_fraction: PSA_COMPRESSOR_RUN_FRACTION,
  psa_capacity_utilization: 1,
  electricity_rate_per_kwh: DEFAULT_ELECTRICITY_RATE,
  electricity_fixed_monthly: 25000,
  psa_plant_cost: 8_000_000,
  psa_plant_life_years: 10,
  psa_amc_annual: null, // auto = 3.27% of plant cost
  psa_repair_annual: 0,
  psa_consumables_annual: 0,
  psa_run_hours_monthly: 300,
}

export const LMO_DEFAULTS: LmoInputs = {
  lmo_capacity_kl: 0,
  lmo_ownership: 'rented', // most facilities rent the cryogenic vessel (survey median rental)
  lmo_monthly_cu_m: 5100,
  lmo_rental_monthly: 67260, // 57,000 * 1.18 (18% GST)
  lmo_refill_base_per_litre: 15.22,
  lmo_refill_gst: 0.12,
  lmo_handling_base_per_litre: 16.78,
  lmo_handling_gst: 0.18,
  lmo_tank_cost: 5_000_000,
  lmo_tank_life_years: 10,
  lmo_loss_pct: 0,
}

/** Cylinder capex defaults by type (spec section 2c). */
export const CYL_PURCHASE_PRICE: Record<CylinderType, number> = {
  d_type: 11200,
  b_type: 5100,
}

export const CYL_VOLUME: Record<CylinderType, number> = {
  d_type: D_TYPE_CU_M,
  b_type: B_TYPE_CU_M,
}

export const CYLINDER_DEFAULTS: CylinderInputs = {
  cyl_type: 'd_type' as CylinderType,
  cyl_refill_cost: 350, // WJCF assessment median (D-type, n=65)
  cyl_monthly_count: 30,
  cyl_purchase_price: CYL_PURCHASE_PRICE.d_type,
  cyl_lifetime_years: 15,
  cyl_owned_count: null,
  cyl_hydrotest_cost: 0,
  cyl_hydrotest_interval_years: 5,
  cyl_transport_per_trip: 0,
  cyl_cylinders_per_trip: 10,
}

export const OC_DEFAULTS: OcInputs = {
  oc_high_use_units: 6,
  oc_high_use_hours: 10,
  oc_low_use_units: 4,
  oc_low_use_hours: 4,
  oc_output_lpm: 5,
  oc_price_per_unit: 50000,
  oc_life_years: 5,
  oc_power_watts: 350,
  oc_electricity_rate: DEFAULT_ELECTRICITY_RATE,
  oc_days_per_month: 30,
  oc_maintenance_per_unit: 5000,
}

export const SHARED_DEFAULTS: SharedInputs = {
  hr_salary_monthly: 13000, // WJCF assessment median (n=45)
  mgps_amc_annual: 0,
  mgps_maintenance_annual: 0,
  other_shared_monthly: 0,
}

// --- Reference data (spec section 10a) --------------------------------------

/**
 * Refill-cost reference ranges (INR per cylinder) from WJCF's facility-level
 * assessment (92 facilities; D-type n=65, B-type n=71).
 */
export const CYL_REFILL_REFERENCE: Record<
  CylinderType,
  { min: number; max: number; median: number }
> = {
  d_type: { min: 150, max: 700, median: 350 },
  b_type: { min: 38, max: 450, median: 165 },
}

// --- Provenance -------------------------------------------------------------

/** The facility survey that informs the data-derived presets. */
export const ASSESSMENT_LABEL =
  'WJCF facility-level oxygen assessment — 92 facilities across Madhya Pradesh, Chhattisgarh & Punjab'

// --- OC clinical limitations (spec section 4d) ------------------------------

export const OC_LIMITATIONS: string[] = [
  'Output is low-purity (90–96%), not suitable for high-acuity patients or ventilators.',
  'Low flow rate (5–10 LPM per unit) limits clinical application.',
  'No storage capability; supply stops when power stops.',
  'Should be considered a supplementary source, not a primary supply.',
]
