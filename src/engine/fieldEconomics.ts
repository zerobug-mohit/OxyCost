// Per-input-field "unit economics" for the facility calculator. Given ONE unit
// of an input (one kW, one run-hour, one cylinder/month, one cu m, one OC unit),
// this returns the monthly cost that unit drives, as clickable pills that jump
// to the related field in the same panel. Mirrors the output-side breakdown, in
// reverse. Figures are indicative ("≈") — the full working is in the output.
import type { CylinderInputs, LmoInputs, OcInputs, PsaInputs, SourceType } from './types'

/** A chunk of an economics line: plain text, or a pill linking to a sibling field. */
export type EconPart = string | { t: string; field: string }

function n(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return Math.round(v).toLocaleString('en-IN')
}
const inr = (v: number) => `₹${n(v)}`
const ref = (t: string, field: string): EconPart => ({ t, field })

const LMO_EXPANSION = 0.861 // 1 L LMO ≈ 0.861 cu m gaseous O2

/** Per-unit economics for a facility input field, or null if none is indicative. */
export function facilityFieldEcon(
  source: SourceType,
  field: string,
  v: PsaInputs | LmoInputs | CylinderInputs | OcInputs,
): EconPart[] | null {
  if (source === 'psa') {
    const p = v as PsaInputs
    if (field === 'psa_power_kw')
      return [
        'each kW ≈ ',
        ref(`${inr(p.psa_run_hours_monthly * p.electricity_rate_per_kwh)}/mo`, 'psa_run_hours_monthly'),
        ' electricity (run hrs × ',
        ref(`₹${p.electricity_rate_per_kwh}/kWh`, 'electricity_rate_per_kwh'),
        ')',
      ]
    if (field === 'psa_run_hours_monthly')
      return [
        'each hr/mo ≈ ',
        ref(`${inr(p.psa_power_kw * p.electricity_rate_per_kwh)}`, 'psa_power_kw'),
        ' electricity (power × rate)',
      ]
    return null
  }
  if (source === 'lmo') {
    const p = v as LmoInputs
    if (field === 'lmo_monthly_cu_m') {
      const grossUp = 1 - (p.lmo_loss_pct || 0)
      const perCuM =
        ((p.lmo_refill_base_per_litre * (1 + p.lmo_refill_gst) +
          p.lmo_handling_base_per_litre * (1 + p.lmo_handling_gst)) /
          LMO_EXPANSION) /
        (grossUp > 0 ? grossUp : 1)
      return ['each cu m ≈ ', ref(`${inr(perCuM)}`, 'lmo_refill_base_per_litre'), ' (refilling + handling)']
    }
    return null
  }
  if (source === 'cylinder') {
    const p = v as CylinderInputs
    if (field === 'cyl_monthly_count') {
      const transportPerCyl = p.cyl_cylinders_per_trip > 0 ? p.cyl_transport_per_trip / p.cyl_cylinders_per_trip : 0
      return [
        'each cylinder/mo ≈ ',
        ref(`${inr(p.cyl_refill_cost)}`, 'cyl_refill_cost'),
        ' refill + ',
        ref(`${inr(transportPerCyl)}`, 'cyl_transport_per_trip'),
        ' transport',
      ]
    }
    if (field === 'cyl_owned_count') {
      const testMo = p.cyl_hydrotest_interval_years > 0 ? p.cyl_hydrotest_cost / (p.cyl_hydrotest_interval_years * 12) : 0
      const deprMo = p.cyl_lifetime_years > 0 ? p.cyl_purchase_price / (p.cyl_lifetime_years * 12) : 0
      return [
        'each owned ≈ ',
        ref(`${inr(testMo)}`, 'cyl_hydrotest_cost'),
        ' testing + ',
        ref(`${inr(deprMo)}`, 'cyl_purchase_price'),
        ' depreciation /mo',
      ]
    }
    return null
  }
  if (source === 'oc') {
    const p = v as OcInputs
    if (field === 'oc_high_use_units' || field === 'oc_low_use_units') {
      const hrs = field === 'oc_high_use_units' ? p.oc_high_use_hours : p.oc_low_use_hours
      const elec = (p.oc_power_watts / 1000) * hrs * p.oc_days_per_month * p.oc_electricity_rate
      return ['each unit ≈ ', ref(`${inr(elec)}/mo`, 'oc_electricity_rate'), ` electricity (at ${n(hrs)} h/day)`]
    }
    return null
  }
  return null
}
