// Scenario manager: save up to 3 result snapshots, rename them, load one back
// into the editor to tweak, update it, or remove it — plus a side-by-side
// compare table. Frozen scenarios are also drawn as greyed overlays on the
// cost charts (see CostComparisonBar / PerUnitCurveChart).
import type { CostView, EngineInputs } from '../../engine'
import type { AppState } from '../../state'
import { formatNumber, formatRate } from '../../utils/format'

/** Comparable metrics captured when a scenario is saved. */
export interface ScenarioMetrics {
  cheapest: Record<CostView, number>
  pickLabel: string
  totalCapacity: number
  allInWithShared: number
}

/** One source's per-cu-m cost under each view, for the grouped-bar overlay. */
export interface ScenarioSourceCost {
  label: string
  opex_only: number
  capex_opex: number
  incremental: number
}

export interface Scenario extends ScenarioMetrics {
  id: string
  name: string
  color: string
  /** Producing sources' per-cu-m costs at save time (for the bar overlay). */
  perSource: ScenarioSourceCost[]
  /** Frozen fleet inputs, to redraw the cost-vs-volume curve as a ghost line. */
  inputs: EngineInputs
  /** Full editor state, so the scenario can be loaded back for editing. */
  state: AppState
}

/** Grey shades for frozen scenarios — de-emphasised vs the live coloured data. */
export const SCENARIO_COLORS = ['#556069', '#7a868d', '#a3adb2']

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
  activeId: string | null
  canSave: boolean
  onSave: () => void
  onUpdate: (id: string) => void
  onLoad: (id: string) => void
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
}

export function ScenarioBar({
  scenarios,
  current,
  costView,
  activeId,
  canSave,
  onSave,
  onUpdate,
  onLoad,
  onRename,
  onRemove,
}: Props) {
  const cost = (v: number) => (Number.isFinite(v) ? formatRate(v) : '—')

  const cols: { key: string; label: string; color?: string; m: ScenarioMetrics }[] = []
  if (current) cols.push({ key: 'now', label: 'Now', m: current })
  for (const s of scenarios) cols.push({ key: s.id, label: s.name, color: s.color, m: s })
  const bestOf = (getter: (m: ScenarioMetrics) => number) => {
    const vals = cols.map((c) => getter(c.m)).filter(Number.isFinite)
    return vals.length ? Math.min(...vals) : NaN
  }

  return (
    <div className="scenario-panel">
      <div className="scenario-panel-head">
        <span className="scenario-title">Compare scenarios</span>
        <button
          type="button"
          className="scenario-save"
          disabled={!canSave}
          onClick={onSave}
          title={canSave ? 'Save the current inputs & results as a scenario' : 'Complete the inputs (max 3 scenarios)'}
        >
          + Save current
        </button>
      </div>
      <p className="small muted" style={{ margin: '2px 0 0' }}>
        Save up to 3 input combinations, then <strong>load</strong> one to edit it or
        compare them below and on the charts. Grey bars/lines on the charts are the frozen
        scenarios.
      </p>

      {scenarios.length > 0 && (
        <>
          <div className="scenario-list">
            {scenarios.map((s) => (
              <div className={`scenario-item${activeId === s.id ? ' active' : ''}`} key={s.id}>
                <span className="scenario-dot" style={{ background: s.color }} />
                <input
                  className="scenario-name"
                  value={s.name}
                  onChange={(e) => onRename(s.id, e.target.value)}
                  aria-label="Scenario name"
                  maxLength={28}
                />
                <span className="scenario-metric">
                  {s.pickLabel} · {cost(s.cheapest.capex_opex)}
                </span>
                <span className="scenario-item-actions">
                  <button
                    type="button"
                    className={`scenario-act${activeId === s.id ? ' on' : ''}`}
                    onClick={() => onLoad(s.id)}
                    title="Load this scenario into the editor to change its inputs"
                  >
                    {activeId === s.id ? 'Editing' : 'Load'}
                  </button>
                  <button
                    type="button"
                    className="scenario-act"
                    disabled={!current}
                    onClick={() => onUpdate(s.id)}
                    title="Overwrite this scenario with the current inputs"
                  >
                    Update
                  </button>
                  <button type="button" className="scenario-x" onClick={() => onRemove(s.id)} title="Remove scenario">
                    ✕
                  </button>
                </span>
              </div>
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
                      const isBest = cols.length > 1 && Number.isFinite(v) && Math.abs(v - best) < 1e-6
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
            The <strong>◄</strong> row matches the cost view selected below; best (lowest)
            value in each cost row is highlighted. GST-inclusive.
          </p>
        </>
      )}
    </div>
  )
}

/** Per-source values for the grouped-bar overlay, keyed by source label. */
export function scenarioBarValues(s: Scenario, view: CostView): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of s.perSource) if (Number.isFinite(p[view])) out[p.label] = p[view]
  return out
}
