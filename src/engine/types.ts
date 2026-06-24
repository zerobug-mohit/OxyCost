// OxyCost calculation engine — type definitions.
// See oxygencost_spec.md sections 2, 4. All interfaces are plain data:
// the engine has no React/UI dependency (architecture decision 7a.1).

/** The four oxygen source types the engine can cost. */
export type SourceType = 'psa' | 'lmo' | 'cylinder' | 'oc'

/** Which capex/opex lens a per-unit cost represents (spec section 6c). */
export type CostView = 'opex_only' | 'capex_opex' | 'incremental'

export type CylinderType = 'd_type' | 'b_type'

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/**
 * Optional user-chosen identifier to tell instances apart (manufacturer, donor,
 * item/asset id, …). Ignored by the cost maths; used only for labelling.
 */
export interface ItemIdentity {
  item_id_type?: string
  item_id_value?: string
}

/**
 * PSA plant inputs — spec section 4a, refined with facility-survey realism.
 * Oxygen is produced only while the compressor runs (a fraction of total plant
 * run hours), and the compressor dominates electricity use; the rest of the
 * plant draws power whenever the plant is on. All monetary values INR, monthly.
 */
export interface PsaInputs extends ItemIdentity {
  psa_capacity_lpm: number
  psa_power_kw: number
  /** Share of total power drawn by the compressor (rest = balance-of-plant). */
  psa_compressor_power_fraction: number
  /** Production hours ÷ running hours — the compressor runs only this fraction. */
  psa_compressor_run_fraction: number
  /** Average capacity utilization (0–1): plant may throttle below rated LPM. */
  psa_capacity_utilization: number
  electricity_rate_per_kwh: number
  electricity_fixed_monthly: number
  psa_plant_cost: number
  psa_plant_life_years: number
  /** Annual AMC/CMC cost. If null, auto-derived as 3.27% of plant cost. */
  psa_amc_annual: number | null
  psa_repair_annual: number
  /** Annual spend on consumables/spare parts not covered by AMC. */
  psa_consumables_annual: number
  psa_run_hours_monthly: number
}

/** LMO inputs — spec section 4b. */
export interface LmoInputs extends ItemIdentity {
  /** Tank capacity (KL) — descriptive only (identifies the tank); not a cost driver. */
  lmo_capacity_kl: number
  lmo_monthly_cu_m: number
  lmo_rental_monthly: number
  lmo_refill_base_per_litre: number
  lmo_refill_gst: number
  lmo_handling_base_per_litre: number
  lmo_handling_gst: number
  lmo_tank_cost: number
  lmo_tank_life_years: number
  /** Monthly boil-off / handling loss as a fraction (0–1) of delivered volume. */
  lmo_loss_pct: number
}

/** Cylinder inputs — spec section 4c. */
export interface CylinderInputs extends ItemIdentity {
  cyl_type: CylinderType
  cyl_refill_cost: number
  cyl_monthly_count: number
  cyl_purchase_price: number
  cyl_lifetime_years: number
  /** Cylinders owned. If null, assume = monthly count (one rotation/month). */
  cyl_owned_count: number | null
  cyl_hydrotest_cost: number
  cyl_hydrotest_interval_years: number
  /** Transport cost per delivery trip (INR). */
  cyl_transport_per_trip: number
  /** Cylinders carried per trip (to derive per-cylinder transport cost). */
  cyl_cylinders_per_trip: number
}

/**
 * Oxygen concentrator inputs — spec section 4d, refined per survey: only
 * deployed & functional units produce, split into high-use (≥8 h/day) and
 * low-use (<8 h/day) groups.
 */
export interface OcInputs extends ItemIdentity {
  oc_high_use_units: number
  oc_high_use_hours: number
  oc_low_use_units: number
  oc_low_use_hours: number
  oc_output_lpm: number
  oc_price_per_unit: number
  oc_life_years: number
  oc_power_watts: number
  oc_electricity_rate: number
  oc_days_per_month: number
  oc_maintenance_per_unit: number
}

/**
 * Facility-level shared costs entered once, not attributed to any single
 * source: oxygen-technician HR and MGPS (pipeline) AMC/maintenance. These are
 * incurred regardless of which source is used, so they are reported separately
 * and allocated across total delivered oxygen, not folded into source rankings.
 */
export interface SharedInputs {
  hr_salary_monthly: number
  mgps_amc_annual: number
  mgps_maintenance_annual: number
  other_shared_monthly: number
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** A single named cost component of a source's monthly total (INR/month). */
export interface CostComponent {
  key: string
  label: string
  amount: number
  /** True if this component scales with run hours / volume. */
  variable: boolean
}

/** Common shape returned by every source calculator. */
export interface SourceResult {
  source: SourceType
  /** Unique instance id, e.g. "psa-0". Stable per (source, index). */
  id: string
  /** Zero-based index of this instance within its source type. */
  index: number
  /** Human label, e.g. "PSA 1500 LPM" or "Cylinders (D-type) #2". */
  label: string
  /** Oxygen the source actually delivers this month (cu m). */
  monthly_output_cu_m: number
  /** Sum of all monthly cost components (INR). */
  total_monthly_cost: number
  /** total_monthly_cost / output. Infinity if output is 0. */
  per_cu_m_capex_opex: number
  /** (total - depreciation) / output. Infinity if output is 0. */
  per_cu_m_opex_only: number
  /** Marginal cost of one more cu m. Infinity if undefined. */
  incremental_cost_per_cu_m: number
  /** Breakdown for the stacked-bar chart. */
  components: CostComponent[]
  /** Warnings/notes surfaced to the UI (edge cases, caveats). */
  notes: string[]
  /** True for sources with clinical/operational caveats (OC). */
  hasLimitations: boolean
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export interface RankEntry {
  source: SourceType
  id: string
  label: string
  value: number
}

export interface ComparisonResult {
  /** Per-source results, in input order. */
  sources: SourceResult[]
  /** Monthly demand the comparison was run against (cu m). */
  demand_cu_m: number
  /** demand - sum(outputs). Positive => sources cannot meet demand. */
  supply_gap_cu_m: number
  /** Total deliverable capacity across all enabled sources (cu m). */
  total_capacity_cu_m: number
  ranking_opex_only: RankEntry[]
  ranking_capex_opex: RankEntry[]
  ranking_incremental: RankEntry[]
  /** Facility shared overhead (HR + MGPS + other), INR/month. */
  shared_overhead_monthly: number
  /** Shared overhead allocated across delivered oxygen (INR/cu m). */
  shared_overhead_per_cu_m: number
  /** Plain-language lead recommendation (spec CALC-COMP-04, section 9b). */
  recommendation: string
  /** Supporting decision points (opex/incremental, suggested mix, gaps, caveats). */
  recommendationPoints: string[]
  notes: string[]
}

/**
 * A facility's fleet: zero or more instances of each source type, plus the
 * monthly demand. Each array entry is one physical unit (a PSA plant, an LMO
 * tank, a cylinder line, a concentrator group) and is costed independently.
 */
export interface EngineInputs {
  demand_cu_m: number
  shared?: SharedInputs
  psa?: PsaInputs[]
  lmo?: LmoInputs[]
  cylinder?: CylinderInputs[]
  oc?: OcInputs[]
}
