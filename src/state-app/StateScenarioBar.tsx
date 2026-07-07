// Save up to 3 district/state configurations and compare their annual budgets
// side by side — the state-tab counterpart of the facility ScenarioBar. A
// scenario snapshots the full inputs (so it can be loaded back to edit) plus
// the headline metrics and the by-source breakdown for the compare table.
import type { CostGroup, StateInputs, StateResult } from '../state-engine'
import { formatINR, formatLakhs, formatNumber } from '../utils/format'

export interface StateScenarioMetrics {
  total: number
  recurring: number
  oneTime: number
  costPerFuncBed: number
  totalFacilities: number
  byGroup: Partial<Record<CostGroup, number>>
}
export interface StateScenario extends StateScenarioMetrics {
  id: string
  name: string
  color: string
  /** Cloned inputs, so the scenario can be loaded back into the editor. */
  inputs: StateInputs
}

/** Grey shades for saved scenarios (de-emphasised vs the live "Now" column). */
export const STATE_SCENARIO_COLORS = ['#556069', '#7a868d', '#a3adb2']

const GROUP_ROWS: { group: CostGroup; label: string }[] = [
  { group: 'psa', label: 'PSA plants' },
  { group: 'lmo', label: 'LMO' },
  { group: 'cylinder', label: 'Cylinders' },
  { group: 'oc', label: 'Concentrators' },
  { group: 'mgps', label: 'MGPS / pipeline' },
  { group: 'oximeter', label: 'Pulse oximeters' },
  { group: 'hr', label: 'Human resources' },
  { group: 'training', label: 'Training' },
  { group: 'iec', label: 'IEC / printing' },
]

/** Pull the comparable metrics out of a computed result. */
export function stateMetrics(r: StateResult): StateScenarioMetrics {
  const byGroup: Partial<Record<CostGroup, number>> = {}
  for (const g of r.byGroup) byGroup[g.group] = g.annual
  return {
    total: r.total,
    recurring: r.recurringTotal,
    oneTime: r.oneTimeTotal,
    costPerFuncBed: r.costPerFuncBed,
    totalFacilities: r.totalFacilities,
    byGroup,
  }
}

interface Props {
  scenarios: StateScenario[]
  /** Live metrics for the current inputs (the "Now" column), or null if empty. */
  current: StateScenarioMetrics | null
  activeId: string | null
  canSave: boolean
  onSave: () => void
  onUpdate: (id: string) => void
  onLoad: (id: string) => void
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
}

export function StateScenarioBar({
  scenarios,
  current,
  activeId,
  canSave,
  onSave,
  onUpdate,
  onLoad,
  onRename,
  onRemove,
}: Props) {
  interface Col {
    key: string
    label: string
    color?: string
    m: StateScenarioMetrics
  }
  const cols: Col[] = []
  if (current) cols.push({ key: 'now', label: 'Now', m: current })
  for (const s of scenarios) cols.push({ key: s.id, label: s.name, color: s.color, m: s })

  // Lowest value in a row (across columns) — the leanest option for that line.
  const rowMin = (get: (m: StateScenarioMetrics) => number) => {
    const vs = cols.map((c) => get(c.m)).filter((v) => Number.isFinite(v) && v > 0)
    return vs.length ? Math.min(...vs) : NaN
  }
  const money = (v: number | undefined) => (v != null && Number.isFinite(v) && v > 0 ? formatLakhs(v) : '—')

  const metricRow = (label: string, get: (m: StateScenarioMetrics) => number, lead = false) => {
    const min = rowMin(get)
    return (
      <tr className={lead ? 'scenario-lead' : undefined}>
        <td>{label}</td>
        {cols.map((c) => {
          const v = get(c.m)
          const isBest = cols.length > 1 && Number.isFinite(v) && v > 0 && Math.abs(v - min) < 1
          return (
            <td key={c.key} className={`num${isBest ? ' scenario-best' : ''}`}>
              {money(v)}
            </td>
          )
        })}
      </tr>
    )
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
          title={canSave ? 'Save the current inputs & budget as a scenario' : 'Enter facilities/equipment first (max 3 scenarios)'}
        >
          + Save current
        </button>
      </div>
      <p className="small muted" style={{ margin: '2px 0 0' }}>
        Save up to 3 plans (different states, mixes, or rates), then <strong>load</strong> one to
        edit it or compare their annual budgets below.
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
                  {formatLakhs(s.total)}/yr · {formatNumber(s.totalFacilities)} fac.
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

          <div className="scenario-reco-scroll">
            <table className="scenario-table">
              <thead>
                <tr>
                  <th>Annual budget (₹)</th>
                  {cols.map((c) => (
                    <th key={c.key} className="num" style={c.color ? { color: c.color } : undefined}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricRow('Total / year', (m) => m.total, true)}
                {metricRow('Recurring / year', (m) => m.recurring)}
                {metricRow('One-time (year 1)', (m) => m.oneTime)}
                <tr>
                  <td>Cost / functional bed</td>
                  {cols.map((c) => (
                    <td key={c.key} className="num">
                      {c.m.costPerFuncBed > 0 ? formatINR(c.m.costPerFuncBed, 0) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Facilities</td>
                  {cols.map((c) => (
                    <td key={c.key} className="num">{formatNumber(c.m.totalFacilities)}</td>
                  ))}
                </tr>
                <tr className="scenario-sep">
                  <td colSpan={cols.length + 1} className="scenario-sub">By source · ₹/year</td>
                </tr>
                {GROUP_ROWS.map((g) => metricRow(g.label, (m) => m.byGroup[g.group] ?? 0))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            Annual cost by scenario; the <span className="scenario-best-key">lowest</span> in each
            row is highlighted. &quot;—&quot; means that source has no cost in that scenario.
          </p>
        </>
      )}
    </div>
  )
}
