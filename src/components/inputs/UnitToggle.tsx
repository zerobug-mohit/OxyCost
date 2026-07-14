// Small read-only converter display: shows an LPM value as cu m/hr and Nm3/hr
// (spec section 3b, 7 inputs/UnitToggle).
import { lpmToCuMPerHour, lpmToNm3PerHour } from '../../engine'

// Show whole numbers without decimals (60, not 60.00) and keep up to two
// decimals only when the conversion is not a round figure.
const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

export function UnitToggle({ lpm }: { lpm: number }) {
  if (!lpm) return null
  return (
    <span className="preset-hint">
      = {fmt(lpmToCuMPerHour(lpm))} cu m/hr · {fmt(lpmToNm3PerHour(lpm))} Nm³/hr
    </span>
  )
}
