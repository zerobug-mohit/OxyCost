// Live demand-allocation bar (requirement 4). Shows how each source instance's
// monthly output stacks up against the demand entered in Step 1, updating as
// the user fills in source details.
import type { ComparisonResult } from '../../engine'
import { instanceColor } from '../shared/sourceColors'
import { costUnitName, cuMToVolume, formatNumber, type CostUnit } from '../../utils/format'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  result: ComparisonResult
  demand: number
  /** Display unit shared with the "Show demand in" toggle (defaults to cu m). */
  unit?: CostUnit
}

export function DemandAllocationBar({ result, demand, unit = 'cu_m' }: Props) {
  if (demand <= 0) return null

  const un = costUnitName(unit)
  const fmt = (cuM: number) => `${formatNumber(Math.round(cuMToVolume(cuM, unit)))} ${un}`

  const segments = result.sources
    .filter((s) => Number.isFinite(s.monthly_output_cu_m) && s.monthly_output_cu_m > 0)
    .map((s) => ({
      id: s.id,
      label: s.label,
      output: s.monthly_output_cu_m,
      color: instanceColor(s.source, s.index),
    }))

  const total = segments.reduce((a, s) => a + s.output, 0)
  const pct = (total / demand) * 100
  const over = total > demand
  // Scale segment widths against demand (or against total if over capacity).
  const scaleBase = over ? total : demand

  return (
    <div className="alloc">
      <div className="alloc-head">
        <span className="alloc-title">
          Coverage of demand
          <Tooltip
            text="The combined monthly output of every source you have entered, stacked against your Step 1 demand."
            effect="Aim for 100%. Below 100% there is a supply gap; above 100% you have spare capacity (shown hatched)."
          />
        </span>
        <span
          className="alloc-pct"
          style={{ color: over ? 'var(--c-warn)' : pct >= 99.5 ? 'var(--c-best-text)' : 'var(--c-text)' }}
        >
          {fmt(total)} / {fmt(demand)} &middot; {pct.toFixed(0)}%
        </span>
      </div>

      <div className="alloc-track">
        {segments.map((s) => (
          <div
            key={s.id}
            className="alloc-seg"
            style={{ width: `${(s.output / scaleBase) * 100}%`, background: s.color }}
            title={`${s.label}: ${fmt(s.output)}`}
          />
        ))}
        {!over && total < demand && (
          <div
            className="alloc-seg"
            style={{ width: `${((demand - total) / scaleBase) * 100}%`, background: 'transparent' }}
          />
        )}
        {over && (
          <div
            className="alloc-seg alloc-over"
            style={{ width: `${((total - demand) / scaleBase) * 100}%` }}
            title={`Spare capacity: ${fmt(total - demand)}`}
          />
        )}
      </div>

      <div className="alloc-legend">
        {segments.map((s) => (
          <span key={s.id} className="lg">
            <span className="src-dot" style={{ background: s.color, margin: 0 }} />
            {s.label} — {fmt(s.output)}
          </span>
        ))}
        {segments.length === 0 && <span>No source output yet — complete the fields below.</span>}
      </div>
    </div>
  )
}
