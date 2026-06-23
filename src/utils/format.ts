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

/** Format an INR per-cu-m rate. "cu m" is kept non-breaking. */
export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/cu${NBSP}m`
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
