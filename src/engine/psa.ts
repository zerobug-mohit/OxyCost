// PSA (pressure swing adsorption) cost calculator.
// Refined per facility survey (spec section 4a):
//  - Oxygen is produced only while the compressor runs. The compressor runs a
//    fraction of total plant run hours (production hrs = run hrs × fraction).
//  - The compressor dominates power; the balance-of-plant draws the remainder
//    whenever the plant is on. So electricity is split across the two.
//  - The plant may run below rated capacity (utilization) to match demand;
//    output scales with utilization while compressor energy stays flat (a
//    throttled compressor draws ~the same power, so per-unit cost rises).
// Technician HR is now a shared facility cost (see SharedInputs), not here.

import { litresToCuM } from './conversions'
import { MINUTES_PER_HOUR, MONTHS_PER_YEAR, PSA_AMC_RATE } from './constants'
import type { CostComponent, PsaInputs, SourceResult } from './types'

/** Plant cost that actually drives depreciation/AMC: zero when the plant is rented. */
export function effectivePsaPlantCost(input: PsaInputs): number {
  return input.psa_ownership === 'rented' ? 0 : input.psa_plant_cost
}

/** Resolve AMC: explicit value, else 3.27% of the (owned) plant cost (spec 4a default). */
export function resolvePsaAmc(input: PsaInputs): number {
  return input.psa_amc_annual ?? PSA_AMC_RATE * effectivePsaPlantCost(input)
}

export function calcPsa(input: PsaInputs): SourceResult {
  const runFraction = clampFraction(input.psa_compressor_run_fraction)
  const powerFraction = clampFraction(input.psa_compressor_power_fraction)
  const utilization = Math.max(0, input.psa_capacity_utilization)

  // CALC-PSA-01: production (compressor) hours = run hours × compressor-run fraction.
  const production_hours = input.psa_run_hours_monthly * runFraction

  // CALC-PSA-02: oxygen produced — at the (possibly throttled) capacity.
  const effective_lpm = input.psa_capacity_lpm * utilization
  const o2_produced_litres = production_hours * MINUTES_PER_HOUR * effective_lpm
  const o2_produced_cu_m = litresToCuM(o2_produced_litres)

  // CALC-PSA-03: electricity split — compressor runs only production hours,
  // balance-of-plant draws power for all run hours.
  const compressor_kw = input.psa_power_kw * powerFraction
  const bop_kw = input.psa_power_kw * (1 - powerFraction)
  const electricity_kwh_consumed =
    compressor_kw * production_hours + bop_kw * input.psa_run_hours_monthly

  // CALC-PSA-04..09: cost components.
  const cost_electricity_usage =
    electricity_kwh_consumed * input.electricity_rate_per_kwh
  const cost_electricity_fixed = input.electricity_fixed_monthly
  const amc_annual = resolvePsaAmc(input)
  const cost_maintenance = amc_annual / MONTHS_PER_YEAR
  const cost_repairs = input.psa_repair_annual / MONTHS_PER_YEAR
  const cost_consumables = input.psa_consumables_annual / MONTHS_PER_YEAR
  // Owned: depreciate the capital cost. Rented: no depreciation, pay a fixed
  // monthly rent instead. Only one is ever non-zero (driven by ownership).
  const rented = input.psa_ownership === 'rented'
  const cost_rental = rented ? Math.max(0, input.psa_rental_monthly) : 0
  const cost_depreciation = rented
    ? 0
    : input.psa_plant_cost / input.psa_plant_life_years / MONTHS_PER_YEAR

  // CALC-PSA-10: total monthly cost (excludes shared HR — billed at facility level).
  const total_monthly_cost =
    cost_electricity_usage +
    cost_electricity_fixed +
    cost_maintenance +
    cost_repairs +
    cost_consumables +
    cost_rental +
    cost_depreciation

  // CALC-PSA-11..13: per-unit costs. Guard divide-by-zero with Infinity.
  const hasOutput = o2_produced_cu_m > 0
  const per_cu_m_capex_opex = hasOutput
    ? total_monthly_cost / o2_produced_cu_m
    : Infinity
  const per_cu_m_opex_only = hasOutput
    ? (total_monthly_cost - cost_depreciation) / o2_produced_cu_m
    : Infinity
  const incremental_cost_per_cu_m = hasOutput
    ? cost_electricity_usage / o2_produced_cu_m
    : Infinity

  const components: CostComponent[] = [
    { key: 'electricity_usage', label: 'Electricity (usage)', amount: cost_electricity_usage, variable: true },
    { key: 'electricity_fixed', label: 'Electricity (fixed)', amount: cost_electricity_fixed, variable: false },
    { key: 'maintenance', label: 'Maintenance (AMC/CMC)', amount: cost_maintenance, variable: false },
    { key: 'repairs', label: 'Repairs', amount: cost_repairs, variable: false },
    { key: 'consumables', label: 'Consumables / spares', amount: cost_consumables, variable: false },
    { key: 'rental', label: 'Plant rental', amount: cost_rental, variable: false },
    { key: 'depreciation', label: 'Depreciation', amount: cost_depreciation, variable: false },
  ]

  const notes = buildPsaNotes(input, production_hours, o2_produced_cu_m, utilization)

  return {
    source: 'psa',
    id: 'psa-0',
    index: 0,
    label: `PSA ${input.psa_capacity_lpm} LPM`,
    monthly_output_cu_m: o2_produced_cu_m,
    total_monthly_cost,
    per_cu_m_capex_opex,
    per_cu_m_opex_only,
    incremental_cost_per_cu_m,
    components,
    notes,
    hasLimitations: false,
  }
}

function clampFraction(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

function buildPsaNotes(
  input: PsaInputs,
  productionHours: number,
  outputCuM: number,
  utilization: number,
): string[] {
  const notes: string[] = []

  if (input.psa_run_hours_monthly <= 0 || outputCuM <= 0) {
    notes.push('PSA is not producing any oxygen at 0 run hours.')
  } else if (input.psa_run_hours_monthly < 60) {
    notes.push(
      'Low utilization (under 2 hrs/day). Fixed costs dominate at this run level, making PSA expensive per unit.',
    )
  }

  if (input.psa_ownership === 'rented') {
    notes.push(
      input.psa_rental_monthly > 0
        ? 'Plant is rented — a fixed monthly rent is charged instead of depreciation; the purchase cost is ignored.'
        : 'Plant is marked rented but the monthly rent is 0 — enter the rent for a complete capex+opex view.',
    )
  }

  if (input.psa_run_hours_monthly > 0 && productionHours <= 0) {
    notes.push(
      'Compressor-run fraction is 0, so no oxygen is produced even though the plant is on. Set a realistic fraction (≈0.9).',
    )
  }

  if (utilization > 0 && utilization < 1) {
    notes.push(
      `Running at ${Math.round(utilization * 100)}% of rated capacity — per-unit cost is higher than at full load because energy and fixed costs are spread over less oxygen.`,
    )
  }

  const monthlyUtil = input.psa_run_hours_monthly / 720
  if (monthlyUtil > 0 && monthlyUtil < 0.3) {
    notes.push(
      `PSA runs only ${Math.round(monthlyUtil * 100)}% of the month — underutilized.`,
    )
  }

  return notes
}
