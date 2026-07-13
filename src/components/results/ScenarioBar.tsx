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
  /** Live per-source costs for the "Now" column. */
  currentSources: ScenarioSourceCost[]
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
  currentSources,
  costView,
  activeId,
  canSave,
  onSave,
  onUpdate,
  onLoad,
  onRename,
  onRemove,
}: Props) {
  const cost = (v: number | undefined) => (v != null && Number.isFinite(v) ? formatRate(v) : '—')

  interface Col {
    key: string
    label: string
    color?: string
    perSource: ScenarioSourceCost[]
    m: ScenarioMetrics
  }
  const cols: Col[] = []
  if (current) cols.push({ key: 'now', label: 'Now', perSource: currentSources, m: current })
  for (const s of scenarios) cols.push({ key: s.id, label: s.name, color: s.color, perSource: s.perSource, m: s })

  // Union of every source that appears in any column (Now first).
  const sourceLabels: string[] = []
  for (const c of cols) for (const p of c.perSource) if (!sourceLabels.includes(p.label)) sourceLabels.push(p.label)
  const valOf = (c: Col, label: string): number | undefined => {
    const p = c.perSource.find((x) => x.label === label)
    return p ? p[costView] : undefined
  }
  // Cheapest source within each column (the winning source in that scenario).
  const colMin = (c: Col) => {
    const vs = sourceLabels.map((l) => valOf(c, l)).filter((v): v is number => v != null && Number.isFinite(v))
    return vs.length ? Math.min(...vs) : NaN
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
        compare them below and on the charts. Grey bars/lines on the charts are the saved
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
                <th>{VIEW_LABEL[costView]} · ₹/cu m by source</th>
                {cols.map((c) => (
                  <th key={c.key} className="num" style={c.color ? { color: c.color } : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sourceLabels.map((label) => (
                <tr key={label}>
                  <td>{label}</td>
                  {cols.map((c) => {
                    const v = valOf(c, label)
                    const isBest = v != null && Number.isFinite(v) && Math.abs(v - colMin(c)) < 1e-6
                    return (
                      <td key={c.key} className={`num${isBest ? ' scenario-best' : ''}`}>{cost(v)}</td>
                    )
                  })}
                </tr>
              ))}
              <tr className="scenario-sep">
                <td>Lowest all-in</td>
                {cols.map((c) => (
                  <td key={c.key} className="num">{c.m.pickLabel}</td>
                ))}
              </tr>
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
            Each source&apos;s cost per cu m on the <strong>{VIEW_LABEL[costView].toLowerCase()}</strong>{' '}
            view (change it below); the cheapest source in each column is highlighted.
            &quot;—&quot; means that source isn&apos;t used in that scenario. GST-inclusive.
          </p>
        </>
      )}
    </div>
  )
}

/** Compact Now / S1 / S2 / S3 toggle shown at a chart's top-right. */
export function ScenarioViewToggle({
  scenarios,
  value,
  onChange,
}: {
  scenarios: { id: string; name: string; color: string }[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  if (scenarios.length === 0) return null
  return (
    <div className="scenario-toggle" role="group" aria-label="Show data for">
      <button type="button" className={!value ? 'active' : ''} onClick={() => onChange(null)}>
        Now
      </button>
      {scenarios.map((s) => (
        <button
          key={s.id}
          type="button"
          className={value === s.id ? 'active' : ''}
          onClick={() => onChange(s.id)}
          title={s.name}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
