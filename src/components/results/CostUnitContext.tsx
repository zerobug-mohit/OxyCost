// Shares the chosen cost display unit (cu m / Nm³ / kg) with all the facility
// result components, so a single toggle reformats every per-unit cost without
// prop-drilling. Values are always stored per cu m; formatRate converts.
import { createContext, useContext } from 'react'
import type { CostUnit } from '../../utils/format'

export const CostUnitContext = createContext<CostUnit>('cu_m')
export const useCostUnit = (): CostUnit => useContext(CostUnitContext)

const LABELS: { key: CostUnit; text: string }[] = [
  { key: 'cu_m', text: 'cu m' },
  { key: 'dcyl', text: 'D-type cyl' },
  { key: 'kg', text: 'kg' },
]

/** Segmented control to pick the display unit for per-unit costs (or demand). */
export function CostUnitToggle({
  value,
  onChange,
  label = 'Show cost per',
}: {
  value: CostUnit
  onChange: (u: CostUnit) => void
  label?: string
}) {
  return (
    <span className="cost-unit-toggle">
      <span className="cost-unit-label">{label}</span>
      <span className="scenario-toggle" role="group" aria-label={label}>
        {LABELS.map((u) => (
          <button
            key={u.key}
            type="button"
            className={value === u.key ? 'active' : ''}
            onClick={() => onChange(u.key)}
          >
            {u.text}
          </button>
        ))}
      </span>
    </span>
  )
}
