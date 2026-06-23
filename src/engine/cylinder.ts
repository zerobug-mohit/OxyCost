// Cylinder cost calculator.
// Implements CALC-CYL-01 .. CALC-CYL-12 from oxygencost_spec.md section 4c.
// Validated: D-type @ 395 -> 56.43/cu m opex; B-type @ 150 -> 100/cu m opex.

import { CYL_VOLUME, MONTHS_PER_YEAR } from './constants'
import type { CostComponent, CylinderInputs, SourceResult } from './types'

export function calcCylinder(input: CylinderInputs): SourceResult {
  // CALC-CYL-01: cu m per cylinder by type.
  const volume_per_cylinder = CYL_VOLUME[input.cyl_type]

  // CALC-CYL-02: monthly delivered volume.
  const monthly_volume_cu_m = input.cyl_monthly_count * volume_per_cylinder

  // CALC-CYL-03: total refill opex.
  const cost_refills = input.cyl_refill_cost * input.cyl_monthly_count

  // CALC-CYL-03b: transport — per-trip cost spread over cylinders per trip.
  const transport_per_cylinder =
    input.cyl_cylinders_per_trip > 0
      ? input.cyl_transport_per_trip / input.cyl_cylinders_per_trip
      : 0
  const cost_transport = transport_per_cylinder * input.cyl_monthly_count
  const transport_per_cu_m = transport_per_cylinder / volume_per_cylinder

  // CALC-CYL-04 / 12: opex (and incremental) per cu m = refill + transport.
  const per_cu_m_refill = input.cyl_refill_cost / volume_per_cylinder
  const incremental_cost_per_cu_m = per_cu_m_refill + transport_per_cu_m

  // CALC-CYL-05: if owned count is not given, assume each cylinder is used
  // once per month (owned = monthly count).
  const owned = input.cyl_owned_count ?? input.cyl_monthly_count

  // CALC-CYL-06 / 07: capex amortization per cu m via rotations over lifetime.
  let capex_per_cu_m = 0
  let capex_monthly = 0
  if (owned > 0) {
    capex_monthly =
      (owned * input.cyl_purchase_price) /
      (input.cyl_lifetime_years * MONTHS_PER_YEAR)
    capex_per_cu_m =
      monthly_volume_cu_m > 0 ? capex_monthly / monthly_volume_cu_m : 0
  }

  // CALC-CYL-08 / 09: hydrostatic testing amortized monthly + per cu m.
  const hydrotest_monthly_cost =
    input.cyl_hydrotest_interval_years > 0
      ? (owned * input.cyl_hydrotest_cost) /
        (input.cyl_hydrotest_interval_years * MONTHS_PER_YEAR)
      : 0
  const hydrotest_per_cu_m =
    monthly_volume_cu_m > 0 ? hydrotest_monthly_cost / monthly_volume_cu_m : 0

  // CALC-CYL-11: total monthly cost.
  const total_monthly_cost =
    cost_refills + cost_transport + capex_monthly + hydrotest_monthly_cost

  // CALC-CYL-10: per-unit total. opex_only excludes purchase amortization
  // (capex) but keeps refill, transport and the periodic hydrotest costs.
  const hasVolume = monthly_volume_cu_m > 0
  const per_cu_m_opex = per_cu_m_refill + transport_per_cu_m
  const per_cu_m_capex_opex = hasVolume
    ? per_cu_m_opex + capex_per_cu_m + hydrotest_per_cu_m
    : Infinity
  const per_cu_m_opex_only = hasVolume
    ? per_cu_m_opex + hydrotest_per_cu_m
    : Infinity

  const components: CostComponent[] = [
    { key: 'refills', label: 'Cylinder refills', amount: cost_refills, variable: true },
    { key: 'transport', label: 'Transport', amount: cost_transport, variable: true },
    { key: 'capex', label: 'Cylinder purchase (amortized)', amount: capex_monthly, variable: false },
    { key: 'hydrotest', label: 'Hydrostatic testing', amount: hydrotest_monthly_cost, variable: false },
  ]

  const notes: string[] = []
  if (!hasVolume) {
    notes.push('Enter a monthly cylinder count to cost this source.')
  }

  const typeLabel = input.cyl_type === 'd_type' ? 'D-type, 7 cu m' : 'B-type, 1.5 cu m'

  return {
    source: 'cylinder',
    id: 'cylinder-0',
    index: 0,
    label: `Cylinders (${typeLabel})`,
    monthly_output_cu_m: monthly_volume_cu_m,
    total_monthly_cost,
    per_cu_m_capex_opex,
    per_cu_m_opex_only,
    incremental_cost_per_cu_m,
    components,
    notes,
    hasLimitations: false,
  }
}
