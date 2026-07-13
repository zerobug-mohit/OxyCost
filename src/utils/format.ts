// Formatting helpers — INR currency and number display (spec section 7, utils).

/** Non-breaking space, used to keep units like "cu m" together on one line. */
const NBSP = String.fromCharCode(0xa0)

/** Format an INR amount. Returns an em-dash for non-finite values. */
export function formatINR(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`
}

/** Display unit for per-unit oxygen cost. Values are stored per cu m of gas. */
export type CostUnit = 'cu_m' | 'nm3' | 'kg'

/** Conversion + labels from a per-cu-m value. 1 kg O₂ ≈ 0.7 cu m of gas. */
export const COST_UNITS: { key: CostUnit; label: string; factor: number }[] = [
  { key: 'cu_m', label: `/cu${NBSP}m`, factor: 1 },
  { key: 'nm3', label: '/Nm³', factor: 1 },
  { key: 'kg', label: '/kg', factor: 0.7 },
]

/** Short unit name for prose (no leading slash). */
export function costUnitName(unit: CostUnit): string {
  return unit === 'kg' ? 'kg' : unit === 'nm3' ? 'Nm³' : `cu${NBSP}m`
}

/** Format an INR per-unit rate, converting the stored per-cu-m value to `unit`. */
export function formatRate(value: number, unit: CostUnit = 'cu_m'): string {
  if (!Number.isFinite(value)) return '—'
  const u = COST_UNITS.find((x) => x.key === unit) ?? COST_UNITS[0]
  return `₹${(value * u.factor).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${u.label}`
}

/**
 * Keep the unit "cu m" on one line in free-flowing text (e.g. the recommendation
 * and chart insights) by replacing its space with a non-breaking space.
 */
export function protectUnits(text: string): string {
  return text.replace(/cu m/g, `cu${NBSP}m`)
}

/** Format a plain number (e.g. cu m) with Indian grouping. */
export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
}

/** Compact INR for large amounts (lakhs/crores hint), used in tooltips. */
export function formatLakhs(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} cr`
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)} lakh`
  return formatINR(value, 0)
}
