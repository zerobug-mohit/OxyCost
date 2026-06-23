// Oxygen concentrator cost calculator.
// Refined per facility survey (spec section 4d): only DEPLOYED & FUNCTIONAL
// units produce, split into high-use (≥8 h/day) and low-use (<8 h/day) groups
// with their own daily run hours. OC results always carry clinical-limitation
// notes.

import { litresToCuM } from './conversions'
import { MINUTES_PER_HOUR, MONTHS_PER_YEAR, OC_LIMITATIONS } from './constants'
import type { CostComponent, OcInputs, SourceResult } from './types'

export function calcConcentrator(input: OcInputs): SourceResult {
  const deployed_units = input.oc_high_use_units + input.oc_low_use_units

  // CALC-OC-01: total unit-hours per month across both use groups.
  const daily_unit_hours =
    input.oc_high_use_units * input.oc_high_use_hours +
    input.oc_low_use_units * input.oc_low_use_hours
  const monthly_unit_hours = daily_unit_hours * input.oc_days_per_month

  // CALC-OC-02/03: output (litres then cu m).
  const monthly_output_litres =
    monthly_unit_hours * input.oc_output_lpm * MINUTES_PER_HOUR
  const monthly_output_cu_m = litresToCuM(monthly_output_litres)

  // CALC-OC-04/05: electricity (scales with unit-hours).
  const monthly_electricity_kwh =
    monthly_unit_hours * (input.oc_power_watts / 1000)
  const cost_electricity = monthly_electricity_kwh * input.oc_electricity_rate

  // CALC-OC-06/07: depreciation and maintenance, over deployed units.
  const cost_depreciation =
    (deployed_units * input.oc_price_per_unit) /
    (input.oc_life_years * MONTHS_PER_YEAR)
  const cost_maintenance =
    (deployed_units * input.oc_maintenance_per_unit) / MONTHS_PER_YEAR

  // CALC-OC-08: total monthly cost.
  const total_monthly_cost = cost_electricity + cost_depreciation + cost_maintenance

  // CALC-OC-09..11: per-unit costs.
  const hasOutput = monthly_output_cu_m > 0
  const per_cu_m_capex_opex = hasOutput
    ? total_monthly_cost / monthly_output_cu_m
    : Infinity
  const per_cu_m_opex_only = hasOutput
    ? (cost_electricity + cost_maintenance) / monthly_output_cu_m
    : Infinity
  const incremental_cost_per_cu_m = hasOutput
    ? cost_electricity / monthly_output_cu_m
    : Infinity

  const components: CostComponent[] = [
    { key: 'electricity', label: 'Electricity', amount: cost_electricity, variable: true },
    { key: 'maintenance', label: 'Maintenance', amount: cost_maintenance, variable: false },
    { key: 'depreciation', label: 'Depreciation', amount: cost_depreciation, variable: false },
  ]

  const notes: string[] = []
  if (!hasOutput) {
    notes.push('Enter deployed concentrator units and their run hours to cost this source.')
  }

  return {
    source: 'oc',
    id: 'oc-0',
    index: 0,
    label: `Concentrators (${deployed_units} deployed)`,
    monthly_output_cu_m,
    total_monthly_cost,
    per_cu_m_capex_opex,
    per_cu_m_opex_only,
    incremental_cost_per_cu_m,
    components,
    // OC limitations are always surfaced (spec section 4d).
    notes: [...notes, ...OC_LIMITATIONS],
    hasLimitations: true,
  }
}
