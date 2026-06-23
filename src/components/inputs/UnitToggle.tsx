// Small read-only converter display: shows an LPM value as cu m/hr and Nm3/hr
// (spec section 3b, 7 inputs/UnitToggle).
import { lpmToCuMPerHour, lpmToNm3PerHour } from '../../engine'

export function UnitToggle({ lpm }: { lpm: number }) {
  if (!lpm) return null
  return (
    <span className="preset-hint">
      = {lpmToCuMPerHour(lpm).toFixed(2)} cu m/hr · {lpmToNm3PerHour(lpm).toFixed(2)}{' '}
      Nm³/hr
    </span>
  )
}
