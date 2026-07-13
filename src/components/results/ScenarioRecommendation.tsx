// Cross-scenario recommendation: compares the current inputs and every saved
// scenario across all three cost bases (all-in, running-only, marginal) and
// names the single cheapest way to supply oxygen. Shown in the Recommendation
// section once the user has saved at least one scenario.
import type { CostView } from '../../engine'
import type { ScenarioSourceCost } from './ScenarioBar'
import { costUnitName, formatRate } from '../../utils/format'
import { useCostUnit } from './CostUnitContext'

/** One column of the comparison: current inputs or a saved scenario. */
export interface RecoConfig {
  key: string
  label: string
  color?: string
  perSource: ScenarioSourceCost[]
}

const VIEWS: { view: CostView; label: string; help: string }[] = [
  { view: 'capex_opex', label: 'All-in (capex + opex)', help: 'includes equipment cost' },
  { view: 'opex_only', label: 'Running only (opex)', help: 'excludes equipment cost' },
  { view: 'incremental', label: 'Marginal (next cu m)', help: 'cost of each extra cu m' },
]

interface Best {
  label: string
  val: number
}

/** Cheapest source (and its cost) under one cost view within a config. */
function bestUnder(perSource: ScenarioSourceCost[], view: CostView): Best | null {
  let best: Best | null = null
  for (const p of perSource) {
    const v = p[view]
    if (v != null && Number.isFinite(v) && (best == null || v < best.val)) {
      best = { label: p.label, val: v }
    }
  }
  return best
}

export function ScenarioRecommendation({ configs }: { configs: RecoConfig[] }) {
  const unit = useCostUnit()
  // Lowest all-in = the config + source with the lowest all-in cost per unit.
  let winner: { config: RecoConfig; best: Best } | null = null
  for (const c of configs) {
    const b = bestUnder(c.perSource, 'capex_opex')
    if (b && (winner == null || b.val < winner.best.val)) winner = { config: c, best: b }
  }

  // Per-view cheapest across all configs, to highlight the winning cell.
  const rowMin = (view: CostView) => {
    const vals = configs
      .map((c) => bestUnder(c.perSource, view)?.val)
      .filter((v): v is number => v != null && Number.isFinite(v))
    return vals.length ? Math.min(...vals) : NaN
  }

  return (
    <div className="scenario-reco">
      {winner && (
        <div className="scenario-reco-headline">
          <span className="scenario-reco-tag">Lowest all-in</span>
          <span>
            The lowest all-in cost is <strong>{winner.best.label}</strong> at{' '}
            <strong>{formatRate(winner.best.val, unit)}</strong>
            {configs.length > 1 && (
              <>
                {' '}
                in <strong>{winner.config.label}</strong>
              </>
            )}
            .
          </span>
        </div>
      )}

      <div className="scenario-reco-scroll">
        <table className="scenario-table scenario-reco-table">
          <thead>
            <tr>
              <th>Cheapest source · ₹/{costUnitName(unit)}</th>
              {configs.map((c) => (
                <th key={c.key} className="num" style={c.color ? { color: c.color } : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VIEWS.map(({ view, label, help }) => {
              const min = rowMin(view)
              return (
                <tr key={view}>
                  <td>
                    {label}
                    <span className="scenario-reco-help"> · {help}</span>
                  </td>
                  {configs.map((c) => {
                    const b = bestUnder(c.perSource, view)
                    const isBest = b != null && Math.abs(b.val - min) < 1e-6
                    return (
                      <td key={c.key} className={`num${isBest ? ' scenario-best' : ''}`}>
                        {b ? (
                          <>
                            {formatRate(b.val, unit)}
                            <span className="scenario-reco-src">{b.label}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        <strong>All-in</strong> includes equipment cost (depreciation if owned, rental if
        rented); <strong>running</strong> excludes it; <strong>marginal</strong> is the cost
        of each additional cu m. All figures GST-inclusive. The highlighted option is the lowest
        all-in cost.
      </p>
    </div>
  )
}
