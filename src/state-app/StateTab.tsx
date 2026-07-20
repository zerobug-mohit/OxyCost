// State / District oxygen budgeting tab. Same Inputs | Output split as the
// facility calculator. The user enters facility counts by bed band; the engine
// expands each into a data-derived archetype and rolls up the annual budget.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeStateCost,
  initialStateInputs,
} from '../state-engine'
import { exportStateWorkbook, importStateWorkbook } from '../io/stateWorkbook'
import type { BandKey, BandProfile, DirectInputs, StateInputs, StateMode, StateRates } from '../state-engine'
import type { TabKey } from '../components/layout/Header'
import { applyDemandOverrides, computeDistrictDemand } from '../demand-engine'
import { DemandOutput } from '../demand-app/DemandOutput'
import { Collapsible } from '../components/shared/Collapsible'
import { StateInputsPanel } from './StateInputs'
import { StateOutput } from './StateOutput'
import type { BudgetPeriod } from './StateOutput'
import { DistrictDemandInputs, initialDistrictDemand } from './DistrictDemandInputs'
import type { DistrictDemandState } from './DistrictDemandInputs'
import { StateScenarioBar, STATE_SCENARIO_COLORS, stateMetrics } from './StateScenarioBar'
import type { StateScenario } from './StateScenarioBar'

// Persist the tab's working state across tab switches (the component unmounts
// when you leave the tab) and page reloads. Stored only in this browser tab's
// sessionStorage — nothing leaves the page.
const SS_KEY = 'oxycost.stateTab.v1'
interface SavedState {
  inputs: StateInputs
  demand: DistrictDemandState
  demandOverrides: Record<string, number>
  scenarios: StateScenario[]
  activeScenarioId: string | null
  budgetPeriod: BudgetPeriod
}
function loadSaved(): Partial<SavedState> {
  try {
    return JSON.parse(sessionStorage.getItem(SS_KEY) || '{}') as Partial<SavedState>
  } catch {
    return {}
  }
}

function ColumnHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="col-header">
      <span className="col-title">{title}</span>
      <span className="col-sub">{sub}</span>
    </div>
  )
}

/** Card-style tray header matching the facility tab's output trays. */
function TrayHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <span className="step-heading">
      <span className="step-kicker">{kicker}</span>
      <span className="step-title">{title}</span>
    </span>
  )
}

export function StateTab({ onNavigate }: { onNavigate?: (tab: TabKey, anchor?: string) => void }) {
  const saved = useMemo(loadSaved, [])
  const [inputs, setInputs] = useState<StateInputs>(() => saved.inputs ?? initialStateInputs())

  const result = useMemo(() => computeStateCost(inputs), [inputs])

  // Step 1 — demand estimate for the chosen area (baked case-mix model).
  const [demand, setDemand] = useState<DistrictDemandState>(() => saved.demand ?? initialDistrictDemand())
  // Per-node demand overrides (annual MT, keyed by breakdown node). Cleared when
  // the area (state/district) changes so stale keys can't linger.
  const [demandOverrides, setDemandOverrides] = useState<Record<string, number>>(() => saved.demandOverrides ?? {})
  const patchDemand = (patch: Partial<DistrictDemandState>) => {
    if ('state' in patch || 'district' in patch) setDemandOverrides({})
    setDemand((d) => ({ ...d, ...patch }))
  }
  const setDemandOverride = (key: string, annualMT: number) =>
    setDemandOverrides((o) => ({ ...o, [key]: annualMT }))
  const resetDemandOverride = (key: string) =>
    setDemandOverrides((o) => { const n = { ...o }; delete n[key]; return n })
  const baseDemand = useMemo(
    () => computeDistrictDemand({ state: demand.state, district: demand.district }, demand.factors, demand.seasonality, demand.scenario, demand.surge),
    [demand],
  )
  const demandResult = useMemo(
    () => applyDemandOverrides(baseDemand, demandOverrides, demand.seasonality),
    [baseDemand, demandOverrides, demand.seasonality],
  )

  const setCount = (band: BandKey, n: number) =>
    setInputs((s) => ({ ...s, counts: { ...s.counts, [band]: n } }))
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

  // Excel export / import (ExcelJS is lazy-loaded inside these).
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ioBusy, setIoBusy] = useState(false)
  const onExport = async () => {
    setIoBusy(true)
    try {
      await exportStateWorkbook(inputs)
    } catch (e) {
      window.alert(`Export failed: ${(e as Error).message}`)
    } finally {
      setIoBusy(false)
    }
  }
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIoBusy(true)
    try {
      setInputs(await importStateWorkbook(file))
    } catch (err) {
      window.alert(`Import failed: ${(err as Error).message}`)
    } finally {
      setIoBusy(false)
    }
  }

  // Budget display period (year / month) — shared by the scenario compare and output.
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(() => saved.budgetPeriod ?? 'year')

  // Saved scenarios (up to 3): compare demand + annual budget, load back to edit.
  const [scenarios, setScenarios] = useState<StateScenario[]>(() => saved.scenarios ?? [])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(() => saved.activeScenarioId ?? null)

  // Persist the working state so switching tabs (which unmounts this component)
  // or reloading doesn't wipe it.
  useEffect(() => {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ inputs, demand, demandOverrides, scenarios, activeScenarioId, budgetPeriod }))
    } catch {
      /* storage unavailable / quota — ignore, just lose persistence */
    }
  }, [inputs, demand, demandOverrides, scenarios, activeScenarioId, budgetPeriod])
  const demandArea = demand.district ?? `${demand.state} (whole state)`
  // A scenario is saveable once there's something to compare — a demand estimate
  // and/or entered facilities.
  const hasSomething = result.totalFacilities > 0 || demandResult.annualMT > 0
  const currentMetrics = hasSomething ? stateMetrics(result, demandArea, demandResult.annualMT) : null
  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T
  const snapshot = () => ({
    inputs: clone(inputs),
    demand: clone(demand),
    demandOverrides: clone(demandOverrides),
    ...stateMetrics(result, demandArea, demandResult.annualMT),
  })
  const saveScenario = () => {
    if (scenarios.length >= 3 || !currentMetrics) return
    const id = `s${Date.now()}`
    setScenarios((cur) => [
      ...cur,
      { id, name: `Scenario ${cur.length + 1}`, color: STATE_SCENARIO_COLORS[cur.length], ...snapshot() },
    ])
    setActiveScenarioId(id)
  }
  const updateScenario = (id: string) => {
    if (!currentMetrics) return
    setScenarios((cur) => cur.map((s) => (s.id === id ? { ...s, ...snapshot() } : s)))
  }
  const loadScenario = (id: string) => {
    const sc = scenarios.find((s) => s.id === id)
    if (!sc) return
    setDemand(clone(sc.demand))
    setDemandOverrides(clone(sc.demandOverrides ?? {}))
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
    <div className="state-tab-root">
      <div className="layout-grid">
        <div>
          <ColumnHeader title="Inputs" sub="counts by bed band · rates · model" />
          <div className="io-toolbar">
            <button type="button" className="io-btn" onClick={onExport} disabled={ioBusy}>
              ⬇ Export to Excel
            </button>
            <button type="button" className="io-btn" onClick={() => fileInputRef.current?.click()} disabled={ioBusy}>
              ⬆ Import from Excel
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={onImportFile} />
            <span className="small muted io-hint">
              Save the current mode&apos;s inputs, rates &amp; calculations to a workbook, or load one back.
            </span>
          </div>

          <Collapsible className="card step-card" defaultOpen summary={<TrayHead kicker="Step 1" title="Estimate demand" />}>
            <DistrictDemandInputs value={demand} onChange={patchDemand} />
          </Collapsible>

          <Collapsible className="card step-card" defaultOpen summary={<TrayHead kicker="Step 2" title="Cost inputs" />}>
            <StateInputsPanel
              value={inputs}
              result={result}
              onCount={setCount}
              onBeds={setBeds}
              onMode={setMode}
              onDirect={setDirect}
              onOverride={setOverride}
              onResetOverride={resetOverride}
              onRates={patchRates}
              onReset={reset}
              onNavigate={onNavigate}
            />
          </Collapsible>
        </div>
        <div>
          <ColumnHeader title="Output" sub="demand & annual budget · updates live" />

          <StateScenarioBar
            scenarios={scenarios}
            current={currentMetrics}
            activeId={activeScenarioId}
            canSave={currentMetrics != null && scenarios.length < 3}
            period={budgetPeriod}
            onSave={saveScenario}
            onUpdate={updateScenario}
            onLoad={loadScenario}
            onRename={renameScenario}
            onRemove={removeScenario}
          />

          <Collapsible className="card step-card" defaultOpen summary={<TrayHead kicker="Demand" title="Demand output" />}>
            <DemandOutput
              result={demandResult}
              breakdownTitle={demand.district ? `${demand.district} demand` : `Demand by district — ${demand.state}`}
              emptyHint="No baked demand for this selection."
              editable
              overrides={demandOverrides}
              onEdit={setDemandOverride}
              onReset={resetDemandOverride}
            />
          </Collapsible>

          <Collapsible className="card step-card" defaultOpen summary={<TrayHead kicker="Costing" title="Costing output" />}>
            <StateOutput result={result} rates={inputs.rates} mode={inputs.mode} direct={inputs.direct} scenarios={scenarios} period={budgetPeriod} onPeriodChange={setBudgetPeriod} />
          </Collapsible>
        </div>
      </div>
    </div>
  )
}
