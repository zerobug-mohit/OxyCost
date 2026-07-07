// State / District oxygen budgeting tab. Same Inputs | Output split as the
// facility calculator. The user enters facility counts by bed band; the engine
// expands each into a data-derived archetype and rolls up the annual budget.
import { useMemo, useState } from 'react'
import {
  applyStateRates,
  computeStateCost,
  initialStateInputs,
  STATE_META,
} from '../state-engine'
import type { BandKey, BandProfile, DirectInputs, StateInputs, StateMode, StateRates } from '../state-engine'
import type { TabKey } from '../components/layout/Header'
import { StateInputsPanel } from './StateInputs'
import { StateOutput } from './StateOutput'
import { StateScenarioBar, STATE_SCENARIO_COLORS, stateMetrics } from './StateScenarioBar'
import type { StateScenario } from './StateScenarioBar'

function ColumnHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="col-header">
      <span className="col-title">{title}</span>
      <span className="col-sub">{sub}</span>
    </div>
  )
}

export function StateTab({ onNavigate }: { onNavigate?: (tab: TabKey, anchor?: string) => void }) {
  const [inputs, setInputs] = useState<StateInputs>(initialStateInputs)

  const result = useMemo(() => computeStateCost(inputs), [inputs])

  const setCount = (band: BandKey, n: number) =>
    setInputs((s) => ({ ...s, counts: { ...s.counts, [band]: n } }))
  // Changing the state re-applies its observed rates; unedited sub-band mixes
  // (null) re-derive automatically for the new state.
  const setStateName = (stateName: string) =>
    setInputs((s) => ({ ...s, stateName, rates: applyStateRates(s.rates, stateName) }))
  const setBeds = (band: BandKey, oxBeds: number) =>
    setInputs((s) => ({ ...s, beds: { ...s.beds, [band]: oxBeds } }))
  const setMode = (mode: StateMode) => setInputs((s) => ({ ...s, mode }))
  const setDirect = (patch: Partial<DirectInputs>) =>
    setInputs((s) => ({ ...s, direct: { ...s.direct, ...patch } }))
  const setOverride = (band: BandKey, patch: Partial<BandProfile>) =>
    setInputs((s) => ({ ...s, overrides: { ...s.overrides, [band]: { ...s.overrides[band], ...patch } } }))
  // Clear a single override field → the variable reverts to the model default.
  const resetOverride = (band: BandKey, key: keyof BandProfile) =>
    setInputs((s) => {
      const o = { ...s.overrides[band] }
      delete o[key]
      return { ...s, overrides: { ...s.overrides, [band]: o } }
    })
  const patchRates = (patch: Partial<StateRates>) =>
    setInputs((s) => ({ ...s, rates: { ...s.rates, ...patch } }))
  const reset = () => setInputs(initialStateInputs())

  // Saved scenarios (up to 3): compare annual budgets, load one back to edit.
  const [scenarios, setScenarios] = useState<StateScenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const currentMetrics = result.totalFacilities > 0 ? stateMetrics(result) : null
  const clone = (i: StateInputs) => JSON.parse(JSON.stringify(i)) as StateInputs
  const saveScenario = () => {
    if (scenarios.length >= 3 || !currentMetrics) return
    const id = `s${Date.now()}`
    setScenarios((cur) => [
      ...cur,
      { id, name: `Scenario ${cur.length + 1}`, color: STATE_SCENARIO_COLORS[cur.length], inputs: clone(inputs), ...stateMetrics(result) },
    ])
    setActiveScenarioId(id)
  }
  const updateScenario = (id: string) => {
    if (!currentMetrics) return
    setScenarios((cur) => cur.map((s) => (s.id === id ? { ...s, inputs: clone(inputs), ...stateMetrics(result) } : s)))
  }
  const loadScenario = (id: string) => {
    const sc = scenarios.find((s) => s.id === id)
    if (!sc) return
    setInputs(clone(sc.inputs))
    setActiveScenarioId(id)
  }
  const renameScenario = (id: string, name: string) =>
    setScenarios((cur) => cur.map((s) => (s.id === id ? { ...s, name } : s)))
  const removeScenario = (id: string) => {
    setScenarios((cur) => cur.filter((s) => s.id !== id).map((s, i) => ({ ...s, color: STATE_SCENARIO_COLORS[i] })))
    if (activeScenarioId === id) setActiveScenarioId(null)
  }

  return (
    <div>
      <div className="state-intro">
        <h2 style={{ marginBottom: 4 }}>District / State oxygen budget planner</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Plan an annual medical-oxygen budget across many facilities from just a
          headcount by size. Each oxygen-bed band expands into a median facility
          profile derived from the {STATE_META ? 'WJCF 92-facility assessment' : 'survey'};
          apply your state rates and read off the estimated annual cost. All figures are
          planning estimates in ₹, inclusive of applicable taxes.
        </p>
      </div>

      <div className="layout-grid">
        <div>
          <ColumnHeader title="Inputs" sub="counts by bed band · rates · model" />
          <StateInputsPanel
            value={inputs}
            result={result}
            onCount={setCount}
            onStateName={setStateName}
            onBeds={setBeds}
            onMode={setMode}
            onDirect={setDirect}
            onOverride={setOverride}
            onResetOverride={resetOverride}
            onRates={patchRates}
            onReset={reset}
            onNavigate={onNavigate}
          />
        </div>
        <div>
          <ColumnHeader title="Output" sub="estimated annual budget · updates live" />
          <StateScenarioBar
            scenarios={scenarios}
            current={currentMetrics}
            activeId={activeScenarioId}
            canSave={currentMetrics != null && scenarios.length < 3}
            onSave={saveScenario}
            onUpdate={updateScenario}
            onLoad={loadScenario}
            onRename={renameScenario}
            onRemove={removeScenario}
          />
          <StateOutput result={result} rates={inputs.rates} mode={inputs.mode} direct={inputs.direct} />
        </div>
      </div>
    </div>
  )
}
