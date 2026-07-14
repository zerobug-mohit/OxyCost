// Per-input-field "unit economics" for the facility calculator. Facility inputs
// interact multiplicatively (electricity = power × run-hours × rate), so instead
// of a plain per-unit cost we show a MARGINAL sensitivity: how much one more unit
// of this input adds, given the current values of the fields it depends on. Each
// line links (via pills) to those dependent fields in the same panel. The line
// is hidden until the dependencies have values, so a bare "₹0" never shows.
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

/**
 * Marginal economics for a facility input field, or null when it isn't
 * meaningful yet (a dependency is still zero/blank). Text reads
 * "+1 <unit> ≈ ₹<amount> …" with the drivers shown as clickable pills.
 */
export function facilityFieldEcon(
  source: SourceType,
  field: string,
  v: PsaInputs | LmoInputs | CylinderInputs | OcInputs,
): EconPart[] | null {
  if (source === 'psa') {
    const p = v as PsaInputs
    const rate = p.electricity_rate_per_kwh
    if (field === 'psa_power_kw') {
      const hrs = p.psa_run_hours_monthly
      if (hrs <= 0 || rate <= 0) return null
      return [
        `+1 kW ≈ ${inr(hrs * rate)}/mo more electricity (`,
        ref(`${n(hrs)} run hrs`, 'psa_run_hours_monthly'),
        ' × ',
        ref(`₹${rate}/kWh`, 'electricity_rate_per_kwh'),
        ')',
      ]
    }
    if (field === 'psa_run_hours_monthly') {
      const power = p.psa_power_kw
      if (power <= 0 || rate <= 0) return null
      return [
        `+1 hr/mo ≈ ${inr(power * rate)} more electricity (`,
        ref(`${n(power)} kW`, 'psa_power_kw'),
        ' × ',
        ref(`₹${rate}/kWh`, 'electricity_rate_per_kwh'),
        ')',
      ]
    }
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
      if (!(perCuM > 0)) return null
      return [
        `+1 cu m ≈ ${inr(perCuM)} — `,
        ref('refilling', 'lmo_refill_base_per_litre'),
        ' + ',
        ref('handling', 'lmo_handling_base_per_litre'),
      ]
    }
    return null
  }
  if (source === 'cylinder') {
    const p = v as CylinderInputs
    if (field === 'cyl_monthly_count') {
      const transportPerCyl = p.cyl_cylinders_per_trip > 0 ? p.cyl_transport_per_trip / p.cyl_cylinders_per_trip : 0
      const per = p.cyl_refill_cost + transportPerCyl
      if (!(per > 0)) return null
      return [
        `+1 cylinder/mo ≈ ${inr(per)} (`,
        ref(`${inr(p.cyl_refill_cost)} refill`, 'cyl_refill_cost'),
        ' + ',
        ref(`${inr(transportPerCyl)} transport`, 'cyl_transport_per_trip'),
        ')',
      ]
    }
    if (field === 'cyl_owned_count') {
      const testMo = p.cyl_hydrotest_interval_years > 0 ? p.cyl_hydrotest_cost / (p.cyl_hydrotest_interval_years * 12) : 0
      const deprMo = p.cyl_lifetime_years > 0 ? p.cyl_purchase_price / (p.cyl_lifetime_years * 12) : 0
      const per = testMo + deprMo
      if (!(per > 0)) return null
      return [
        `+1 owned ≈ ${inr(per)}/mo (`,
        ref(`${inr(testMo)} testing`, 'cyl_hydrotest_cost'),
        ' + ',
        ref(`${inr(deprMo)} depreciation`, 'cyl_purchase_price'),
        ')',
      ]
    }
    return null
  }
  if (source === 'oc') {
    const p = v as OcInputs
    if (field === 'oc_high_use_units' || field === 'oc_low_use_units') {
      const hrs = field === 'oc_high_use_units' ? p.oc_high_use_hours : p.oc_low_use_hours
      const elec = (p.oc_power_watts / 1000) * hrs * p.oc_days_per_month * p.oc_electricity_rate
      if (!(elec > 0)) return null
      return [
        `+1 unit ≈ ${inr(elec)}/mo electricity (at ${n(hrs)} h/day × `,
        ref(`₹${p.oc_electricity_rate}/kWh`, 'oc_electricity_rate'),
        ')',
      ]
    }
    return null
  }
  return null
}
