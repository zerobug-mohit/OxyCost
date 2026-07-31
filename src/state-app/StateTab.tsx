// State / District oxygen budgeting tab. Same Inputs | Output split as the
// facility calculator. The user enters facility counts by typical size; the engine
// expands each into a data-derived archetype and rolls up the annual budget.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeStateCost,
  estimateStateSupply,
  initialStateInputs,
} from '../state-engine'
import { exportStateWorkbook, importStateWorkbook } from '../io/stateWorkbook'
import type { StateScenarioIO } from '../io/stateWorkbook'
import type { BandKey, BandProfile, DirectInputs, StateInputs, StateMode, StateRates } from '../state-engine'
import type { CostUnit } from '../utils/format'
import type { TabKey } from '../components/layout/Header'
import { applyDemandOverrides, computeDistrictDemand } from '../demand-engine'
import { DemandOutput } from '../demand-app/DemandOutput'
import { Collapsible } from '../components/shared/Collapsible'
import { Explainer } from '../components/shared/Explainer'
import { Tooltip } from '../components/shared/Tooltip'
import { StepProgress } from '../components/layout/StepProgress'
import { StepNav } from '../components/shared/StepNav'
import { CostUnitToggle } from '../components/results/CostUnitContext'
import { StateInputsPanel } from './StateInputs'
import { StateOutput } from './StateOutput'
import type { BudgetPeriod } from './StateOutput'
import { DistrictDemandInputs, initialDistrictDemand } from './DistrictDemandInputs'
import type { DistrictDemandState } from './DistrictDemandInputs'
import { StateCoverageBar } from './StateCoverageBar'
import { StateScenarioBar, STATE_SCENARIO_COLORS, stateMetrics } from './StateScenarioBar'
import type { StateScenario } from './StateScenarioBar'

// Keep the tab's working state across tab switches (this component unmounts when
// you leave the tab) but NOT across a page reload. A module-level variable does
// exactly that: it lives as long as the page is open, and is wiped when the page
// reloads (the module re-runs), so a reload starts fresh.
interface SavedState {
  inputs: StateInputs
  demand: DistrictDemandState
  demandOverrides: Record<string, number>
  scenarios: StateScenario[]
  activeScenarioId: string | null
  budgetPeriod: BudgetPeriod
  demandUnit: CostUnit
}
let memoryCache: SavedState | null = null
function loadSaved(): Partial<SavedState> {
  return memoryCache ?? {}
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
function TrayHead({ kicker, title, tip }: { kicker: string; title: string; tip?: string }) {
  return (
    <span className="step-heading">
      <span className="step-kicker">{kicker}</span>
      <span className="step-title">{title}{tip && <Tooltip text={tip} />}</span>
    </span>
  )
}

/** A locked output tray (mirrors the facility StepCard's locked state): a Locked
 *  badge and a prompt telling the user what to finish, instead of the content. */
function LockedTray({ kicker, title, tip, prompt }: { kicker: string; title: string; tip?: string; prompt: React.ReactNode }) {
  return (
    <div className="card step-card locked">
      <div className="collapse-summary is-locked">
        <span className="collapse-caret locked-caret" aria-hidden>▸</span>
        <span className="collapse-summary-content step-heading">
          <span className="step-kicker">{kicker}</span>
          <span className="step-title">{title}{tip && <Tooltip text={tip} />}</span>
        </span>
        <span className="locked-tag">Locked</span>
      </div>
      <div className="collapse-body locked-body">{prompt}</div>
    </div>
  )
}

export function StateTab({ onNavigate, tourActive }: { onNavigate?: (tab: TabKey, anchor?: string) => void; tourActive?: boolean }) {
  const saved = useMemo(loadSaved, [])
  const [inputs, setInputs] = useState<StateInputs>(() => saved.inputs ?? initialStateInputs())

  const result = useMemo(() => computeStateCost(inputs), [inputs])
  const supply = useMemo(() => estimateStateSupply(inputs, result), [inputs, result])

  // Step 1 — demand estimate for the chosen area (baked case-mix model).
  const [demand, setDemand] = useState<DistrictDemandState>(() => saved.demand ?? initialDistrictDemand())
  // Per-node demand overrides (annual MT, keyed by breakdown node). Cleared when
  // the area (state/district) changes so stale keys can't linger.
  const [demandOverrides, setDemandOverrides] = useState<Record<string, number>>(() => saved.demandOverrides ?? {})
  const patchDemand = (patch: Partial<DistrictDemandState>) => {
    if ('state' in patch || 'district' in patch) setDemandOverrides({})
    setDemand((d) => ({ ...d, ...patch }))
  }
  // While the state tutorial runs, seed a whole-state area and a few facilities
  // (if the user hasn't entered any) so the demand AND budget walkthroughs have
  // data to spotlight — otherwise the costing output would show as Locked.
  useEffect(() => {
    if (!tourActive) return
    setDemand((d) => (d.areaChosen ? d : { ...d, areaChosen: true }))
    setInputs((s) => {
      const total = s.counts['<10'] + s.counts['10-29'] + s.counts['30-59'] + s.counts['60+']
      return total > 0 ? s : { ...s, counts: { ...s.counts, '10-29': 8, '30-59': 4, '60+': 2 } }
    })
  }, [tourActive])
  const setDemandOverride = (key: string, annualMT: number) =>
    setDemandOverrides((o) => ({ ...o, [key]: annualMT }))
  const resetDemandOverride = (key: string) =>
    setDemandOverrides((o) => { const n = { ...o }; delete n[key]; return n })
  const baseDemand = useMemo(
    () =>
      demand.areaChosen
        ? computeDistrictDemand({ state: demand.state, district: demand.district }, demand.factors, demand.seasonality, demand.scenario, demand.surge)
        // No area chosen yet → an empty estimate (a non-existent district → total 0).
        : computeDistrictDemand({ state: demand.state, district: '(no area)' }, demand.factors, demand.seasonality, demand.scenario, demand.surge),
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
  // Reset just the Step-1 demand selection (area, scenario) and clear overrides.
  const resetDemand = () => { setDemand(initialDistrictDemand()); setDemandOverrides({}) }

  // Excel export / import (ExcelJS is lazy-loaded inside these).
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ioBusy, setIoBusy] = useState(false)
  const onExport = async () => {
    if (demandResult.annualMT <= 0 && result.totalFacilities === 0 && scenarios.length === 0) {
      window.alert(
        'Nothing to export yet.\n\nEstimate demand in Step 1 (choose an area) or add cost inputs in Step 2 before downloading the Excel workbook.',
      )
      return
    }
    setIoBusy(true)
    try {
      await exportStateWorkbook(
        inputs,
        { state: demand.state, district: demand.district, scenario: demand.scenario },
        demandOverrides,
        scenarios.map((s) => ({
          name: s.name,
          inputs: s.inputs,
          demand: { state: s.demand.state, district: s.demand.district, scenario: s.demand.scenario },
          demandOverrides: s.demandOverrides,
        })),
      )
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
      const { inputs: imported, demand: dm, demandOverrides: ov, scenarios: scs } = await importStateWorkbook(file)
      setInputs(imported)
      if (dm) setDemand({ ...initialDistrictDemand(), state: dm.state, district: dm.district, areaChosen: true, scenario: dm.scenario === 'pandemic' ? 'pandemic' : 'normal' })
      setDemandOverrides(ov ?? {})
      setScenarios(scs.slice(0, 3).map((sc, i) => scenarioFromIO(sc, STATE_SCENARIO_COLORS[i], `imp${Date.now()}-${i}`)))
      setActiveScenarioId(null)
    } catch (err) {
      window.alert(`Import failed: ${(err as Error).message}`)
    } finally {
      setIoBusy(false)
    }
  }

  // Budget display period (year / month) — shared by the scenario compare and output.
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(() => saved.budgetPeriod ?? 'year')
  // Demand display unit (cu m / D-type cyl / kg) — the demand output owns the
  // toggle but the coverage bar shares the choice, so it lives here.
  const [demandUnit, setDemandUnit] = useState<CostUnit>(() => saved.demandUnit ?? 'cu_m')

  // Guided step tracker (both steps stay open; this drives the progress bar +
  // Next/Back and scrolls to the step or the output).
  const [currentStep, setCurrentStep] = useState(1)
  const goToStep = (n: number) => {
    setCurrentStep(n)
    setTimeout(() => document.getElementById(`state-step-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
  }
  const goToOutput = () => {
    setTimeout(() => document.getElementById('state-output-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
  }

  // Saved scenarios (up to 3): compare demand + annual budget, load back to edit.
  const [scenarios, setScenarios] = useState<StateScenario[]>(() => saved.scenarios ?? [])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(() => saved.activeScenarioId ?? null)

  // Keep the working state so switching tabs (which unmounts this component)
  // doesn't wipe it. Held in memory only, so a page reload starts fresh.
  useEffect(() => {
    memoryCache = { inputs, demand, demandOverrides, scenarios, activeScenarioId, budgetPeriod, demandUnit }
  }, [inputs, demand, demandOverrides, scenarios, activeScenarioId, budgetPeriod, demandUnit])
  // Step completion (drives the progress ticks AND the coverage bar's visibility).
  // Step 1 is done once the user has actively chosen an area and it yields demand
  // — a pre-selected state alone shouldn't complete it.
  const step1Done = demand.areaChosen && demandResult.annualMT > 0
  const step2Done = result.totalFacilities > 0
  // The costing output stays locked until the demand is estimated AND cost inputs
  // are entered — prompting for whichever is missing (demand first, then Step 2).
  const costLockedPrompt: React.ReactNode = !step1Done
    ? <>Estimate demand for an area in <strong>Step 1</strong> first.</>
    : inputs.mode === 'direct'
      ? <>Enter your district&apos;s equipment totals in <strong>Step 2</strong>.</>
      : <>Add at least one facility (by size) in <strong>Step 2</strong>.</>
  const demandArea = demand.district ?? `${demand.state} (whole state)`
  // A scenario is saveable once there's something to compare — a demand estimate
  // and/or entered facilities.
  const hasSomething = result.totalFacilities > 0 || demandResult.annualMT > 0
  const currentMetrics = hasSomething ? stateMetrics(result, demandArea, demandResult.annualMT) : null
  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T
  // Rebuild a saved scenario from an imported workbook sheet (recompute metrics).
  const scenarioFromIO = (io: StateScenarioIO, color: string, id: string): StateScenario => {
    const d: DistrictDemandState = { ...initialDistrictDemand(), state: io.demand.state, district: io.demand.district, areaChosen: true, scenario: io.demand.scenario === 'pandemic' ? 'pandemic' : 'normal' }
    const res = computeStateCost(io.inputs)
    const dRes = applyDemandOverrides(computeDistrictDemand({ state: d.state, district: d.district }, d.factors, d.seasonality, d.scenario, d.surge), io.demandOverrides, d.seasonality)
    const area = d.district ?? `${d.state} (whole state)`
    return { id, name: io.name, color, inputs: clone(io.inputs), demand: d, demandOverrides: clone(io.demandOverrides), ...stateMetrics(res, area, dRes.annualMT) }
  }
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
          <ColumnHeader title="Inputs" sub="counts by facility size · rates · model" />
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

          <StepProgress
            steps={[
              { n: 1, label: 'Demand', complete: step1Done },
              { n: 2, label: 'Cost inputs', complete: step2Done },
            ]}
            current={currentStep}
            onGo={goToStep}
          />

          <div data-tour="state-demand" id="state-step-1">
          <Collapsible
            className="card step-card"
            defaultOpen
            summary={<TrayHead kicker="Step 1" title="Estimate demand" tip="The whole budget is sized against this demand. Pick the area and the tool estimates it from baked per-facility survey data." />}
          >
            <Explainer>
              <strong>What to do:</strong> pick a <strong>state</strong>, then choose a{' '}
              <strong>district</strong> (or the whole state). The tool sums the baked per-facility
              oxygen demand for that area; the total and its breakdown by district and individual
              facility appear under <em>Demand output</em> on the right. Choose{' '}
              <strong>Normal</strong> or <strong>Pandemic</strong> to size for a surge.
            </Explainer>
            <div className="tray-reset">
              <button type="button" className="btn-reset" onClick={resetDemand}>↺ Reset all</button>
            </div>
            <DistrictDemandInputs value={demand} onChange={patchDemand} />
            <StepNav
              onNext={() => goToStep(2)}
              nextLabel="Next: cost inputs"
              ready={step1Done}
              todoHint="Choose a district (or whole state) to estimate demand"
            />
          </Collapsible>
          </div>

          <div data-tour="state-cost-inputs" id="state-step-2">
          <Collapsible
            className="card step-card"
            defaultOpen
            summary={<TrayHead kicker="Step 2" title="Cost inputs" tip="Tell the tool what oxygen infrastructure the area has — either as facility counts by size (the model fills in each one) or as your own equipment totals." />}
          >
            <Explainer>
              <strong>What to do:</strong> choose how to supply the equipment — enter how many
              facilities you have of each <strong>typical size</strong> and the model predicts each
              one&apos;s oxygen setup, or switch to entering your district&apos;s{' '}
              <strong>equipment totals</strong> directly. Yellow figures are editable presets — type
              over any with your real values. The budget appears under <em>Costing output</em>{' '}
              on the right (toggle yearly / monthly at the top).
              <br />
              <span className="muted">Keeping it simple? The presets — rates, plant costs and the
              modelled per-facility setup — already work out of the box. Opening the{' '}
              <em>“advanced”</em> sections to change them is optional and meant for advanced users.</span>
            </Explainer>
            <div className="tray-reset">
              <button type="button" className="btn-reset" onClick={reset}>↺ Reset all</button>
            </div>
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
              onNavigate={onNavigate}
            />
            <StepNav
              onBack={() => goToStep(1)}
              backLabel="Demand"
              onNext={goToOutput}
              nextLabel="See the budget"
              ready={result.totalFacilities > 0}
              todoHint="Add facilities or equipment to see the budget"
            />
          </Collapsible>
          </div>
        </div>
        <div>
          <div id="state-output-top">
            <ColumnHeader title="Output" sub="demand & annual budget · updates live" />
          </div>

          {hasSomething && (
            <div className="output-controls">
              <CostUnitToggle value={demandUnit} onChange={setDemandUnit} label="Show demand in" />
              <span className="cost-unit-toggle">
                <span className="cost-unit-label">Period</span>
                <span className="scenario-toggle" role="group" aria-label="Period">
                  <button type="button" className={budgetPeriod === 'year' ? 'active' : ''} onClick={() => setBudgetPeriod('year')}>Yearly</button>
                  <button type="button" className={budgetPeriod === 'month' ? 'active' : ''} onClick={() => setBudgetPeriod('month')}>Monthly</button>
                </span>
              </span>
            </div>
          )}

          {step1Done && step2Done && supply.annualMT > 0 && (
            <div data-tour="state-coverage" style={{ marginBottom: 12 }}>
              <StateCoverageBar supply={supply} demandMT={demandResult.annualMT} unit={demandUnit} period={budgetPeriod} />
            </div>
          )}

          <div data-tour="state-scenario">
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
          </div>

          <div data-tour="state-demand-output">
          <Collapsible className="card step-card" defaultOpen summary={<TrayHead kicker="Demand" title="Demand output" tip="The estimated oxygen demand for the area — the total and its drill-down by district, facility type and individual facility. Every value is editable." />}>
            <DemandOutput
              result={demandResult}
              breakdownTitle={demand.district ? `${demand.district} demand` : `Demand by district — ${demand.state}`}
              emptyHint=""
              unit={demandUnit}
              hideToggle
              editable
              overrides={demandOverrides}
              onEdit={setDemandOverride}
              onReset={resetDemandOverride}
            />
          </Collapsible>
          </div>

          <div data-tour="state-budget">
          {step1Done && step2Done ? (
            <Collapsible className="card step-card" defaultOpen summary={<TrayHead kicker="Costing" title="Costing output" tip="The estimated oxygen budget for the area, broken down by source and facility size — shown yearly or monthly. Unlocks once Steps 1–2 are complete." />}>
              <StateOutput result={result} rates={inputs.rates} mode={inputs.mode} direct={inputs.direct} scenarios={scenarios} period={budgetPeriod} onPeriodChange={setBudgetPeriod} hidePeriodToggle />
            </Collapsible>
          ) : (
            <LockedTray kicker="Costing" title="Costing output" tip="The estimated oxygen budget for the area, broken down by source and facility size — shown yearly or monthly. Unlocks once Steps 1–2 are complete." prompt={costLockedPrompt} />
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
