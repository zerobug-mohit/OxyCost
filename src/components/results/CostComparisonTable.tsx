// Side-by-side comparison table (spec section 9b). Shows the per-cu-m cost for
// the *active* cost view only — the whole column is highlighted and the cheapest
// cell is marked green — so the table fits without horizontal scrolling.
import type { ComparisonResult, CostView, SourceResult } from '../../engine'
import { formatINR, formatNumber, formatRate } from '../../utils/format'
import { instanceColor } from '../shared/sourceColors'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  result: ComparisonResult
  costView: CostView
  onSelect?: (id: string) => void
  selected?: string | null
}

const VIEW: Record<CostView, { label: string; tip: string }> = {
  opex_only: {
    label: 'Opex / cu m',
    tip: 'Running cost per cu m excluding all capital/depreciation. Relevant when the equipment is already owned.',
  },
  capex_opex: {
    label: 'Capex+Opex / cu m',
    tip: 'Total cost of ownership per cu m, including straight-line depreciation. Relevant when acquiring a source.',
  },
  incremental: {
    label: 'Incremental / cu m',
    tip: 'Marginal cost of one more cu m with fixed costs treated as sunk. Relevant for comparing which source is cheapest for additional volume.',
  },
}

function pick(s: SourceResult, view: CostView): number {
  return view === 'opex_only'
    ? s.per_cu_m_opex_only
    : view === 'incremental'
      ? s.incremental_cost_per_cu_m
      : s.per_cu_m_capex_opex
}

export function CostComparisonTable({ result, costView, onSelect, selected }: Props) {
  const { sources } = result
  const view = VIEW[costView]

  // Cheapest producing source on the active view.
  let bestIdx = -1
  let bestVal = Infinity
  sources.forEach((s, i) => {
    const v = pick(s, costView)
    if (Number.isFinite(v) && v < bestVal) {
      bestVal = v
      bestIdx = i
    }
  })

  return (
    <table className="cmp fit">
      <thead>
        <tr>
          <th>Source</th>
          <th className="active-col">
            {view.label} <Tooltip text={view.tip} />
          </th>
          <th>
            Monthly total{' '}
            <Tooltip text="Sum of all monthly cost components for this source at the current inputs (GST-inclusive)." />
          </th>
          <th>
            Output{' '}
            <Tooltip
              text="Oxygen this source delivers per month at the current inputs (cu m)."
              effect="The sum of these is compared against your demand to flag a supply gap."
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {sources.map((s, i) => (
          <tr
            key={s.id}
            className={`${s.hasLimitations ? 'has-limit' : ''} ${
              onSelect ? 'clickable' : ''
            } ${selected === s.id ? 'row-selected' : ''}`}
            onClick={onSelect ? () => onSelect(s.id) : undefined}
          >
            <td>
              <span
                className="src-dot"
                style={{ background: instanceColor(s.source, s.index) }}
              />
              {s.label}
              {s.hasLimitations && (
                <Tooltip text="Clinical limitations apply — low purity and flow; supplementary use only." />
              )}
            </td>
            <td className={`active-col ${i === bestIdx ? 'best' : ''}`}>
              {formatRate(pick(s, costView))}
            </td>
            <td>{formatINR(s.total_monthly_cost, 0)}</td>
            <td>{formatNumber(s.monthly_output_cu_m)} cu m</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
