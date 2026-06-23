// LMO (liquid medical oxygen) cost calculator.
// Refined per facility survey (spec section 4b):
//  - Boil-off / handling loss: cryogenic LMO evaporates over time, so a facility
//    must purchase more than it delivers. `lmo_loss_pct` inflates the variable
//    (refilling + handling) cost per delivered cu m by 1/(1 − loss).
//  - Operator HR is now a shared facility cost (see SharedInputs), not here.
// `lmo_monthly_cu_m` is the oxygen DELIVERED (used) per month, in cu m gas;
// purchased volume = delivered / (1 − loss).

import { cuMToLmoLitres } from './conversions'
import { LMO_EXPANSION, MONTHS_PER_YEAR } from './constants'
import type { CostComponent, LmoInputs, SourceResult } from './types'

export function calcLmo(input: LmoInputs): SourceResult {
  const volume = input.lmo_monthly_cu_m // delivered cu m of gas

  // Boil-off loss multiplier (clamped to a sane range).
  const loss = Math.min(0.95, Math.max(0, input.lmo_loss_pct))
  const lossFactor = 1 / (1 - loss)

  // CALC-LMO-01: gas cu m -> LMO litres (informational basis).
  const lmo_volume_litres = cuMToLmoLitres(volume)

  // CALC-LMO-02: fixed monthly rental.
  const cost_rental = input.lmo_rental_monthly

  // CALC-LMO-03/04: per-cu-m variable rates (per PURCHASED cu m). 0.861 converts
  // per-litre-LMO to per-cu-m-gas.
  const cost_refilling_per_cu_m =
    (input.lmo_refill_base_per_litre * (1 + input.lmo_refill_gst)) / LMO_EXPANSION
  const cost_handling_per_cu_m =
    (input.lmo_handling_base_per_litre * (1 + input.lmo_handling_gst)) /
    LMO_EXPANSION

  // CALC-LMO-05/06: totals — scaled up by the loss factor (we pay for purchased,
  // not just delivered, volume).
  const total_refilling = cost_refilling_per_cu_m * volume * lossFactor
  const total_handling = cost_handling_per_cu_m * volume * lossFactor

  // CALC-LMO-07: depreciation of the cryogenic vessel.
  const cost_depreciation =
    input.lmo_tank_cost / input.lmo_tank_life_years / MONTHS_PER_YEAR

  // CALC-LMO-08: total monthly cost (excludes shared operator HR).
  const total_monthly_cost =
    cost_rental + total_refilling + total_handling + cost_depreciation

  // CALC-LMO-09..11: per-unit costs (over DELIVERED volume).
  const hasVolume = volume > 0
  const per_cu_m_capex_opex = hasVolume ? total_monthly_cost / volume : Infinity
  const per_cu_m_opex_only = hasVolume
    ? (total_monthly_cost - cost_depreciation) / volume
    : Infinity
  // Marginal cost of one more DELIVERED cu m = (refill + handling) × loss factor.
  const incremental_cost_per_cu_m =
    (cost_refilling_per_cu_m + cost_handling_per_cu_m) * lossFactor

  const components: CostComponent[] = [
    { key: 'rental', label: 'Tank rental', amount: cost_rental, variable: false },
    { key: 'refilling', label: 'Refilling', amount: total_refilling, variable: true },
    { key: 'handling', label: 'Handling & transport', amount: total_handling, variable: true },
    { key: 'depreciation', label: 'Depreciation', amount: cost_depreciation, variable: false },
  ]

  const notes: string[] = []
  if (!hasVolume) {
    notes.push('Enter a monthly LMO consumption to cost this source.')
  }
  if (loss > 0) {
    notes.push(
      `Boil-off loss of ${Math.round(loss * 100)}% means you purchase ${(lossFactor).toFixed(2)}× the delivered volume; refilling and handling costs are scaled up accordingly.`,
    )
  }
  void lmo_volume_litres

  return {
    source: 'lmo',
    id: 'lmo-0',
    index: 0,
    label: 'LMO (liquid)',
    monthly_output_cu_m: volume,
    total_monthly_cost,
    per_cu_m_capex_opex,
    per_cu_m_opex_only,
    incremental_cost_per_cu_m,
    components,
    notes,
    hasLimitations: false,
  }
}
