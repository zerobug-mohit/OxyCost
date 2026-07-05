// Freeze up to 3 result snapshots ("scenarios") and compare them side by side.
// The frozen scenarios are also drawn as reference lines on the cost charts, so
// the user can see whether a new input combination beats the ones they saved.
import type { CostView } from '../../engine'
import { formatNumber, formatRate } from '../../utils/format'

/** Comparable metrics captured when a scenario is frozen. */
export interface ScenarioMetrics {
  cheapest: Record<CostView, number>
  pickLabel: string
  totalCapacity: number
  allInWithShared: number
}

export interface Scenario extends ScenarioMetrics {
  id: string
  label: string
  color: string
}

/** Palette for frozen scenarios — distinct from the source colours. */
export const SCENARIO_COLORS = ['#e8590c', '#9c36b5', '#1971c2']

const VIEW_LABEL: Record<CostView, string> = {
  capex_opex: 'Cheapest all-in',
  opex_only: 'Cheapest to run',
  incremental: 'Lowest marginal',
}

interface Props {
  scenarios: Scenario[]
  /** Live metrics for the current inputs (the "Now" column), or null if locked. */
  current: ScenarioMetrics | null
  costView: CostView
  canFreeze: boolean
  onFreeze: () => void
  onRemove: (id: string) => void
}

export function ScenarioBar({ scenarios, current, costView, canFreeze, onFreeze, onRemove }: Props) {
  const cost = (v: number) => (Number.isFinite(v) ? formatRate(v) : '—')

  // Highlight the best (min) value in each cost row across Now + scenarios.
  const cols: { key: string; label: string; color?: string; m: ScenarioMetrics }[] = []
  if (current) cols.push({ key: 'now', label: 'Now', m: current })
  for (const s of scenarios) cols.push({ key: s.id, label: s.label, color: s.color, m: s })
  const bestOf = (getter: (m: ScenarioMetrics) => number) => {
    const vals = cols.map((c) => getter(c.m)).filter(Number.isFinite)
    return vals.length ? Math.min(...vals) : NaN
  }

  return (
    <div className="scenario-bar">
      <div className="scenario-head">
        <button
          type="button"
          className="scenario-freeze"
          disabled={!canFreeze}
          onClick={onFreeze}
          title={canFreeze ? 'Save the current results to compare' : 'Complete the inputs (max 3 scenarios)'}
        >
          📌 Freeze this scenario
        </button>
        <span className="small muted">
          Save up to 3 input combinations to compare — frozen scenarios also appear as
          reference lines on the charts.
        </span>
      </div>

      {scenarios.length > 0 && (
        <>
          <div className="scenario-chips">
            {scenarios.map((s) => (
              <span className="scenario-chip" key={s.id} style={{ borderColor: s.color }}>
                <span className="scenario-dot" style={{ background: s.color }} />
                <strong>{s.label}</strong> {s.pickLabel} · {cost(s.cheapest.capex_opex)}
                <button type="button" className="scenario-x" onClick={() => onRemove(s.id)} title="Remove scenario">
                  ✕
                </button>
              </span>
            ))}
          </div>

          <table className="scenario-table">
            <thead>
              <tr>
                <th>Metric</th>
                {cols.map((c) => (
                  <th key={c.key} className="num" style={c.color ? { color: c.color } : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Recommended</td>
                {cols.map((c) => (
                  <td key={c.key} className="num">{c.m.pickLabel}</td>
                ))}
              </tr>
              {(['capex_opex', 'opex_only', 'incremental'] as CostView[]).map((view) => {
                const best = bestOf((m) => m.cheapest[view])
                return (
                  <tr key={view} className={view === costView ? 'scenario-active' : ''}>
                    <td>{VIEW_LABEL[view]}{view === costView ? ' ◄' : ''}</td>
                    {cols.map((c) => {
                      const v = c.m.cheapest[view]
                      const isBest = Number.isFinite(v) && Math.abs(v - best) < 1e-6
                      return (
                        <td key={c.key} className={`num${isBest ? ' scenario-best' : ''}`}>{cost(v)}</td>
                      )
                    })}
                  </tr>
                )
              })}
              <tr>
                <td>All-in incl. shared</td>
                {cols.map((c) => (
                  <td key={c.key} className="num">{cost(c.m.allInWithShared)}</td>
                ))}
              </tr>
              <tr>
                <td>Total capacity</td>
                {cols.map((c) => (
                  <td key={c.key} className="num">{formatNumber(c.m.totalCapacity)} cu m</td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            The <strong>◄</strong> row matches the cost view selected below. Best (lowest)
            value in each cost row is highlighted. GST-inclusive.
          </p>
        </>
      )}
    </div>
  )
}

/** Reference-line mark for the charts: the scenario's cheapest cost on `view`. */
export function scenarioMark(s: Scenario, view: CostView): { label: string; color: string; value: number } {
  return { label: s.label, color: s.color, value: s.cheapest[view] }
}
