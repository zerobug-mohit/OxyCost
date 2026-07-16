import { useRef, useState } from 'react'
import { exportFacilityWorkbook, importFacilityWorkbook } from './io/facilityWorkbook'
import { Header } from './components/layout/Header'
import type { TabKey } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { SourceConfigurator } from './components/inputs/SourceConfigurator'
import { variantValueOf, withVariant, type VariantValue } from './variants'
import { DemandInput } from './components/inputs/DemandInput'
import { PsaInputPanel } from './components/inputs/PsaInputPanel'
import { LmoInputPanel } from './components/inputs/LmoInputPanel'
import { CylinderInputPanel } from './components/inputs/CylinderInputPanel'
import { OcInputPanel } from './components/inputs/OcInputPanel'
import { SharedCostsPanel } from './components/inputs/SharedCostsPanel'
import { SharedOverheadCard } from './components/results/SharedOverheadCard'
import { IncrementalVsTotalToggle } from './components/results/IncrementalVsTotalToggle'
import { CostComparisonTable } from './components/results/CostComparisonTable'
import { CostComparisonBar } from './components/results/CostComparisonBar'
import { PerUnitCurveChart } from './components/results/PerUnitCurveChart'
import { RingedDotIcon, PriorityBadgeIcon } from './components/results/CurveMarkers'
import { CostBreakdownChart } from './components/results/CostBreakdownChart'
import { ChartSection } from './components/results/ChartSection'
import { barInsight, curveInsight, breakdownInsight } from './components/results/insights'
import { RecommendationCard } from './components/results/RecommendationCard'
import { ScenarioBar, ScenarioViewToggle, SCENARIO_COLORS } from './components/results/ScenarioBar'
import type { Scenario, ScenarioMetrics } from './components/results/ScenarioBar'
import { CalculationDetail } from './components/results/SourceDrillDown'
import { DemandAllocationBar } from './components/results/DemandAllocationBar'
import { InfoBanner } from './components/shared/InfoBanner'
import { Explainer } from './components/shared/Explainer'
import { Tooltip } from './components/shared/Tooltip'
import { FieldLegend } from './components/shared/FieldLegend'
import { MethodologyTab } from './components/methodology/MethodologyTab'
import { GuideTab } from './components/methodology/GuideTab'
import { StateTab } from './state-app/StateTab'
import { DemandSummaryCard } from './components/results/DemandSummaryCard'
import { DemandDistrictTab } from './demand-app/DemandDistrictTab'
import { StepProgress } from './components/layout/StepProgress'
import { StepNav } from './components/shared/StepNav'
import { PlainSummary } from './components/results/PlainSummary'
import { CostUnitContext, CostUnitToggle } from './components/results/CostUnitContext'
import type { CostUnit } from './utils/format'
import { ScenarioRecommendation } from './components/results/ScenarioRecommendation'
import type { RecoConfig } from './components/results/ScenarioRecommendation'
import { formatNumber } from './utils/format'
import { focusInputField } from './utils/focusField'
import { useCalculation } from './hooks/useCalculation'
import { initialState, resetInstance } from './state'
import { SHARED_DEFAULTS } from './engine'
import type { AppState } from './state'
import { OC_LIMITATIONS, compareAllSources } from './engine'
import type {
  CylinderInputs,
  LmoInputs,
  OcInputs,
  PsaInputs,
  SharedInputs,
  SourceType,
} from './engine'
import type { ComparisonResult } from './engine'

/** Capture the comparable metrics of a result for scenario freezing/compare. */
function scenarioMetrics(result: ComparisonResult): ScenarioMetrics {
  const producing = result.sources.filter((s) => s.monthly_output_cu_m > 0)
  const minOf = (f: (s: ComparisonResult['sources'][number]) => number) => {
    const xs = producing.map(f).filter((v) => Number.isFinite(v))
    return xs.length ? Math.min(...xs) : NaN
  }
  const totalSupply = result.sources.reduce((a, s) => a + (s.monthly_output_cu_m || 0), 0)
  const sourcesMonthlyCost = result.sources.reduce((a, s) => a + (s.total_monthly_cost || 0), 0)
  const sharedMonthly = result.shared_overhead_monthly
  const totalCost = sourcesMonthlyCost + sharedMonthly
  return {
    cheapest: {
      opex_only: minOf((s) => s.per_cu_m_opex_only),
      capex_opex: minOf((s) => s.per_cu_m_capex_opex),
      incremental: minOf((s) => s.incremental_cost_per_cu_m),
    },
    pickLabel: result.recoSummary.pick?.sourceLabel ?? '—',
    totalCapacity: result.total_capacity_cu_m,
    allInWithShared: result.recoSummary.allInWithShared ?? NaN,
    totalSupply,
    sourcesMonthlyCost,
    sharedMonthly,
    totalCost,
    avgPerCuM: totalSupply > 0 ? totalCost / totalSupply : NaN,
  }
}

function StepCard({
  n,
  id,
  kicker,
  title,
  tip,
  note,
  complete,
  open,
  onToggle,
  defaultOpen = false,
  locked = false,
  lockedPrompt,
  children,
}: {
  n?: number
  id?: string
  kicker?: string
  title: string
  tip?: string
  note?: React.ReactNode
  complete?: boolean
  /** Controlled open state (for the single-open left accordion). */
  open?: boolean
  onToggle?: () => void
  defaultOpen?: boolean
  /** Locked = not expandable; shows `lockedPrompt` instead of children. */
  locked?: boolean
  lockedPrompt?: React.ReactNode
  children: React.ReactNode
}) {
  const kick = kicker ?? (n != null ? `Step ${n}` : null)
  const heading = (
    <span className="collapse-summary-content step-heading">
      {kick && <span className="step-kicker">{kick}</span>}
      <span className="step-title">
        {title}
        {tip && <Tooltip text={tip} />}
      </span>
    </span>
  )

  if (locked) {
    return (
      <div className="card step-card locked" id={id}>
        <div className="collapse-summary is-locked">
          <span className="collapse-caret locked-caret" aria-hidden>
            ▸
          </span>
          {heading}
          <span className="locked-tag">Locked</span>
        </div>
        <div className="collapse-body locked-body">{lockedPrompt}</div>
      </div>
    )
  }

  const controlled = open !== undefined
  return (
    <details className="card step-card" id={id} open={controlled ? open : defaultOpen}>
      <summary
        className="collapse-summary"
        onClick={
          controlled
            ? (e) => {
                e.preventDefault()
                onToggle?.()
              }
            : undefined
        }
      >
        <span className="collapse-caret" aria-hidden>
          ▸
        </span>
        {heading}
        <span className="step-summary-right">
          {note != null && <span className="step-summary-note">{note}</span>}
          {complete && (
            <span className="step-tick" title="Completed" aria-label="Completed">
              ✓
            </span>
          )}
        </span>
      </summary>
      <div className="collapse-body">{children}</div>
    </details>
  )
}

/** True when every source instance has its required (red) fields filled in. */
function allSourcesComplete(state: AppState): boolean {
  const numericOk =
    state.fleet.psa.every(
      (p) =>
        p.psa_capacity_lpm > 0 &&
        p.psa_power_kw > 0 &&
        p.psa_run_hours_monthly > 0,
    ) &&
    state.fleet.lmo.every((l) => l.lmo_monthly_cu_m > 0) &&
    state.fleet.cylinder.every(
      (c) => c.cyl_refill_cost > 0 && c.cyl_monthly_count > 0,
    ) &&
    state.fleet.oc.every(
      (o) => o.oc_high_use_units + o.oc_low_use_units > 0 && o.oc_output_lpm > 0,
    )
  if (!numericOk) return false

  // For 2+ units of the same variant, each identifier must be present AND unique.
  const sources: SourceType[] = ['psa', 'lmo', 'cylinder', 'oc']
  const idOf = (inst: unknown) =>
    ((inst as { item_id_value?: string }).item_id_value ?? '').trim().toLowerCase()
  return sources.every((src) => {
    const arr = state.fleet[src] as unknown[]
    return arr.every((inst) => {
      const v = variantValueOf(src, inst)
      const sameVariant = arr.filter((x) => variantValueOf(src, x) === v)
      if (sameVariant.length < 2) return true
      const id = idOf(inst)
      if (!id) return false
      // unique within the same-variant group
      return sameVariant.filter((x) => idOf(x) === id).length === 1
    })
  })
}

/** Small column header separating the Inputs and Output columns. */
function ColumnHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="col-header">
      <span className="col-title">{title}</span>
      <span className="col-sub">{sub}</span>
    </div>
  )
}


export default function App() {
  const [tab, setTab] = useState<TabKey>('guide')
  // Cross-tab navigation with optional scroll to an anchor (e.g. Methodology §).
  const navigate = (to: TabKey, anchor?: string) => {
    setTab(to)
    if (anchor) {
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    }
  }
  const [state, setState] = useState<AppState>(initialState)
  // Display unit for per-unit costs (cu m / Nm³ / kg) — facility output only.
  const [costUnit, setCostUnit] = useState<CostUnit>('cu_m')
  // Calculation section: which scenario (null = Now) and which source to trace.
  const [calcScenario, setCalcScenario] = useState<string | null>(null)
  const [calcSourceId, setCalcSourceId] = useState<string | null>(null)
  // Left-column accordion: only one step open at a time. Starts on Step 1 so a
  // first-time user is guided straight into the flow.
  const [openStep, setOpenStep] = useState<number | null>(1)
  const toggleStep = (s: number) => setOpenStep((cur) => (cur === s ? null : s))
  // Open a step and scroll it into view (used by the progress tracker & Next/Back).
  const goToStep = (s: number) => {
    setOpenStep(s)
    setTimeout(() => {
      document.getElementById(`step-${s}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }
  // From Step 3, jump the eye to the results on the right.
  const goToResults = () => {
    setTimeout(() => {
      document.getElementById('output-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 30)
  }
  const { demand, result, inputs } = useCalculation(state)

  // Excel export / import (ExcelJS is lazy-loaded inside these).
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ioBusy, setIoBusy] = useState(false)
  const onExport = async () => {
    setIoBusy(true)
    try {
      await exportFacilityWorkbook(state)
    } catch (e) {
      window.alert(`Export failed: ${(e as Error).message}`)
    } finally {
      setIoBusy(false)
    }
  }
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    setIoBusy(true)
    try {
      const imported = await importFacilityWorkbook(file)
      setState(imported)
      setOpenStep(3)
    } catch (err) {
      window.alert(`Import failed: ${(err as Error).message}`)
    } finally {
      setIoBusy(false)
    }
  }

  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }))

  // Handoff from a demand tab: set the facility calculator's monthly demand (cu m)
  // and jump to it.
  const useDemandCuM = (cuMPerMonth: number) => {
    setState((s) => ({ ...s, demandMode: 'direct', demandDirect: Math.round(cuMPerMonth) }))
    setCostUnit('cu_m')
    navigate('calculator', 'output-top')
  }

  // Per-instance patch helpers.
  const patchPsa = (i: number, p: Partial<PsaInputs>) =>
    setState((s) => {
      const psa = s.fleet.psa.map((x, j) => (j === i ? { ...x, ...p } : x))
      return { ...s, fleet: { ...s.fleet, psa } }
    })
  const patchLmo = (i: number, p: Partial<LmoInputs>) =>
    setState((s) => {
      const lmo = s.fleet.lmo.map((x, j) => (j === i ? { ...x, ...p } : x))
      return { ...s, fleet: { ...s.fleet, lmo } }
    })
  const patchCyl = (i: number, p: Partial<CylinderInputs>) =>
    setState((s) => {
      const cylinder = s.fleet.cylinder.map((x, j) => (j === i ? { ...x, ...p } : x))
      return { ...s, fleet: { ...s.fleet, cylinder } }
    })
  const patchOc = (i: number, p: Partial<OcInputs>) =>
    setState((s) => {
      const oc = s.fleet.oc.map((x, j) => (j === i ? { ...x, ...p } : x))
      return { ...s, fleet: { ...s.fleet, oc } }
    })
  const patchShared = (p: Partial<SharedInputs>) =>
    setState((s) => ({ ...s, shared: { ...s.shared, ...p } }))

  // "Reset all" for one instance: clears required fields, restores presets, but
  // keeps the variant (capacity / type / output) chosen in Step 2.
  const resetAt = (source: SourceType, i: number) =>
    setState((s) => {
      const arr = (s.fleet[source] as unknown[]).map((x, j) =>
        j === i
          ? withVariant(resetInstance(source), source, variantValueOf(source, x))
          : x,
      )
      return { ...s, fleet: { ...s.fleet, [source]: arr } }
    })
  const resetShared = () => setState((s) => ({ ...s, shared: { ...SHARED_DEFAULTS } }))

  // Step 2: set how many units of a given variant (capacity / type / output)
  // exist. New units start blank (required fields) but carry the chosen variant;
  // removing trims the extra units of that variant from the end.
  const setVariantCount = (source: SourceType, value: VariantValue, count: number) =>
    setState((s) => {
      const cur = s.fleet[source] as unknown[]
      const matchIdx = cur
        .map((inst, i) => ({ inst, i }))
        .filter((x) => variantValueOf(source, x.inst) === value)
        .map((x) => x.i)
      const have = matchIdx.length
      if (count > have) {
        const add = Array.from({ length: count - have }, () =>
          withVariant(resetInstance(source), source, value),
        )
        return { ...s, fleet: { ...s.fleet, [source]: [...cur, ...add] } }
      }
      if (count < have) {
        const remove = new Set(matchIdx.slice(count)) // drop extras from the tail
        const next = cur.filter((_, i) => !remove.has(i))
        return { ...s, fleet: { ...s.fleet, [source]: next } }
      }
      return s
    })

  const counts: Record<SourceType, number> = {
    psa: state.fleet.psa.length,
    lmo: state.fleet.lmo.length,
    cylinder: state.fleet.cylinder.length,
    oc: state.fleet.oc.length,
  }
  const totalUnits = counts.psa + counts.lmo + counts.cylinder + counts.oc

  // id -> monthly output, for per-panel contribution displays.
  const outputById = new Map(result.sources.map((s) => [s.id, s.monthly_output_cu_m]))

  // An identifier is required when 2+ units share the same variant.
  const idRequiredFor = (source: SourceType, inst: unknown): boolean => {
    const v = variantValueOf(source, inst)
    return (state.fleet[source] as unknown[]).filter(
      (x) => variantValueOf(source, x) === v,
    ).length >= 2
  }
  // A non-empty identifier is a duplicate if another same-variant unit reuses it.
  const idDuplicateFor = (source: SourceType, inst: unknown): boolean => {
    const id = ((inst as { item_id_value?: string }).item_id_value ?? '')
      .trim()
      .toLowerCase()
    if (!id) return false
    const v = variantValueOf(source, inst)
    return (
      (state.fleet[source] as unknown[]).filter(
        (x) =>
          variantValueOf(source, x) === v &&
          ((x as { item_id_value?: string }).item_id_value ?? '')
            .trim()
            .toLowerCase() === id,
      ).length >= 2
    )
  }

  const validationHints = buildValidationHints(state)
  const sourceNotes = result.sources.filter(
    (s) => !s.hasLimitations && s.notes.length > 0,
  )

  const coveragePct =
    demand > 0 ? Math.round((result.total_capacity_cu_m / demand) * 100) : 0
  const overBy = result.total_capacity_cu_m - demand
  // Block cost results whenever the fleet over-supplies demand: the comparison
  // only makes sense once sources are sized to demand. A tiny tolerance (0.5%,
  // min 5 cu m) absorbs rounding from unit conversions — anything beyond that is
  // treated as over-supply and gated. The Step 3 prompt uses the same flag, so
  // the bar, the prompt and the results are always consistent.
  const overTolerance = Math.max(5, demand * 0.005)
  const oversupplied = demand > 0 && totalUnits > 0 && overBy > overTolerance

  // Per-step completion (drives the green ticks) and overall readiness (unlocks
  // the output sections). "Minima": demand entered, at least one source, and
  // every source produces output (required fields filled), sized to demand.
  const step1Complete = demand > 0
  const step2Complete = totalUnits > 0
  const step3Complete = totalUnits > 0 && allSourcesComplete(state)
  // Results unlock once the inputs are complete. Over-supply no longer blocks
  // them — the comparison still holds; it is surfaced as a note instead.
  const showResults = step1Complete && step2Complete && step3Complete

  // Saved scenarios (up to 3): compare, load-to-edit, update, rename, remove.
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const currentMetrics = showResults ? scenarioMetrics(result) : null

  // The derived, cloneable snapshot of the current inputs/results/state.
  const buildSnapshot = () => ({
    ...scenarioMetrics(result),
    perSource: result.sources
      .filter((s) => s.monthly_output_cu_m > 0)
      .map((s) => ({
        label: s.label,
        opex_only: s.per_cu_m_opex_only,
        capex_opex: s.per_cu_m_capex_opex,
        incremental: s.incremental_cost_per_cu_m,
      })),
    // Deep clones so later edits don't mutate the snapshot.
    inputs: JSON.parse(JSON.stringify(inputs)) as typeof inputs,
    state: JSON.parse(JSON.stringify(state)) as AppState,
  })

  const saveScenario = () => {
    if (scenarios.length >= 3 || !showResults) return
    const id = `s${Date.now()}`
    setScenarios([
      ...scenarios,
      { id, name: `Scenario ${scenarios.length + 1}`, color: SCENARIO_COLORS[scenarios.length], ...buildSnapshot() },
    ])
    setActiveScenarioId(id)
  }
  const updateScenario = (id: string) => {
    if (!showResults) return
    setScenarios(scenarios.map((s) => (s.id === id ? { ...s, ...buildSnapshot() } : s)))
  }
  const loadScenario = (id: string) => {
    const sc = scenarios.find((s) => s.id === id)
    if (!sc) return
    setState(JSON.parse(JSON.stringify(sc.state)))
    setActiveScenarioId(id)
  }
  const renameScenario = (id: string, name: string) =>
    setScenarios(scenarios.map((s) => (s.id === id ? { ...s, name } : s)))
  const removeScenario = (id: string) => {
    setScenarios(scenarios.filter((s) => s.id !== id).map((s, i) => ({ ...s, color: SCENARIO_COLORS[i] })))
    if (activeScenarioId === id) setActiveScenarioId(null)
  }

  // Per-source costs of the current inputs (the "Now" column in the table).
  const currentSources = showResults
    ? result.sources
        .filter((s) => s.monthly_output_cu_m > 0)
        .map((s) => ({
          label: s.label,
          opex_only: s.per_cu_m_opex_only,
          capex_opex: s.per_cu_m_capex_opex,
          incremental: s.incremental_cost_per_cu_m,
        }))
    : []
  // Configs for the cross-scenario recommendation: current inputs + saved
  // scenarios. Used by the top summary and the Recommendation section.
  const recoConfigs: RecoConfig[] = []
  if (showResults && currentSources.length > 0)
    recoConfigs.push({ key: 'now', label: 'Current inputs', perSource: currentSources })
  for (const s of scenarios)
    recoConfigs.push({ key: s.id, label: s.name, color: s.color, perSource: s.perSource })
  // Each output chart can independently show "Now" or a saved scenario, via a
  // toggle at its top-right. The scenario dataset is recomputed on demand.
  const [barView, setBarView] = useState<string | null>(null)
  const [curveView, setCurveView] = useState<string | null>(null)
  const [breakdownView, setBreakdownView] = useState<string | null>(null)
  const datasetFor = (id: string | null) => {
    const sc = id ? scenarios.find((s) => s.id === id) ?? null : null
    return sc
      ? { result: compareAllSources(sc.inputs), inputs: sc.inputs, demand: sc.inputs.demand_cu_m, isScenario: true }
      : { result, inputs, demand, isScenario: false }
  }
  const barData = datasetFor(barView)
  const curveData = datasetFor(curveView)
  const breakdownData = datasetFor(breakdownView)
  const scenarioToggle = (value: string | null, onChange: (id: string | null) => void) => (
    <ScenarioViewToggle scenarios={scenarios} value={value} onChange={onChange} />
  )

  // Calculation section: pick a scenario (null = Now) and a source, then trace
  // its full numbers-substituted breakdown. Clicking a table row/bar/line also
  // targets this section.
  const calcData = datasetFor(calcScenario)
  const calcFleet = calcScenario
    ? scenarios.find((s) => s.id === calcScenario)?.state.fleet ?? state.fleet
    : state.fleet
  const calcSources = calcData.result.sources.filter((s) => s.monthly_output_cu_m > 0)
  const selectedCalc = calcSources.find((s) => s.id === calcSourceId) ?? calcSources[0]
  const selectedCalcInstance = selectedCalc
    ? calcFleet[selectedCalc.source][selectedCalc.index]
    : undefined
  const showCalcOn = (scenarioId: string | null) => (id: string) => {
    setCalcScenario(scenarioId)
    setCalcSourceId(id)
  }
  // Jump from a formula token to the input field that produced it (Now only —
  // the left pane shows the live inputs, not a frozen scenario's).
  const goToCalcField = (field: string) => {
    if (!selectedCalc) return
    setOpenStep(3)
    focusInputField(`${selectedCalc.source}-${selectedCalc.index}`, field)
  }

  // What the user must still do — shown on the locked output sections.
  const lockedPrompt = !step1Complete ? (
    <>Enter your monthly oxygen demand in <strong>Step 1</strong> (Inputs).</>
  ) : !step2Complete ? (
    <>Add at least one oxygen source in <strong>Step 2</strong>.</>
  ) : !step3Complete ? (
    <>
      Fill the required (red) fields for every source in <strong>Step 3</strong> so each
      one produces output.
    </>
  ) : null
  const cheapest = result.ranking_capex_opex.find((r) =>
    result.sources.some(
      (s) => s.id === r.id && s.monthly_output_cu_m > 0 && Number.isFinite(r.value),
    ),
  )


  return (
    <CostUnitContext.Provider value={costUnit}>
    <div className={`app${tab === 'calculator' ? ' app-fixed' : ''}`}>
      <Header tab={tab} onTab={setTab} />
      <main className="app-main">
        <div className="container">
          {tab === 'guide' ? (
            <GuideTab />
          ) : tab === 'methodology' ? (
            <MethodologyTab />
          ) : tab === 'state' ? (
            <StateTab onNavigate={navigate} />
          ) : tab === 'demandState' ? (
            <DemandDistrictTab onUseDemand={useDemandCuM} />
          ) : (
            <div className="layout-grid">
              {/* ---- Inputs column ---- */}
              <div>
                <ColumnHeader title="Inputs" sub="information to be filled by the user" />
                <div className="io-toolbar">
                  <button type="button" className="io-btn" onClick={onExport} disabled={ioBusy}>
                    ⬇ Export to Excel
                  </button>
                  <button
                    type="button"
                    className="io-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ioBusy}
                  >
                    ⬆ Import from Excel
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    style={{ display: 'none' }}
                    onChange={onImportFile}
                  />
                  <span className="small muted io-hint">
                    Save all inputs & calculations to a workbook, or load one back.
                  </span>
                </div>
                <StepProgress
                  steps={[
                    { n: 1, label: 'Demand', complete: step1Complete },
                    { n: 2, label: 'Sources', complete: step2Complete },
                    { n: 3, label: 'Details', complete: step3Complete },
                  ]}
                  current={openStep}
                  onGo={goToStep}
                />
                <StepCard
                  n={1}
                  id="step-1"
                  title="Estimate monthly demand"
                  tip="Everything is compared against this monthly oxygen demand. Your source units should together add up to it."
                  open={openStep === 1}
                  onToggle={() => toggleStep(1)}
                  complete={step1Complete}
                  note={demand > 0 ? `${formatNumber(demand)} cu m/mo` : undefined}
                >
                  <Explainer>
                    <strong>What to do:</strong> set the facility&apos;s monthly oxygen demand in one
                    of three ways — <strong>enter it directly</strong>, estimate it from your{' '}
                    <strong>facility archetype</strong> (state, type &amp; admissions), or build it up{' '}
                    <strong>ward-by-ward</strong> from patient counts. The estimate and its full
                    breakdown appear under <em>Demand output</em> on the right.
                  </Explainer>
                  <FieldLegend />
                  <DemandInput state={state} onPatch={patch} resolvedDemand={demand} onDisplayUnit={setCostUnit} />
                  <StepNav
                    onNext={() => goToStep(2)}
                    nextLabel="Next: add your sources"
                    ready={step1Complete}
                    todoHint="Enter your monthly demand to continue"
                  />
                </StepCard>

                <StepCard
                  n={2}
                  id="step-2"
                  title="How many of each source?"
                  tip="Set the number of each physical unit your facility has. Each one becomes its own row, input panel and cost line."
                  open={openStep === 2}
                  onToggle={() => toggleStep(2)}
                  complete={step2Complete}
                  note={`${totalUnits} unit${totalUnits === 1 ? '' : 's'}`}
                >
                  <Explainer>
                    <strong>What to do:</strong> use the + / − steppers to match your
                    facility — e.g. 2 PSA plants and 1 LMO tank. Details corresponding to
                    each source can be added in Step 3, and their outputs add up toward
                    your demand.
                  </Explainer>
                  <SourceConfigurator fleet={state.fleet} onSet={setVariantCount} />
                  <StepNav
                    onBack={() => goToStep(1)}
                    backLabel="Demand"
                    onNext={() => goToStep(3)}
                    nextLabel="Next: fill in the details"
                    ready={step2Complete}
                    todoHint="Add at least one source to continue"
                  />
                </StepCard>

                <StepCard
                  n={3}
                  id="step-3"
                  title="Source details"
                  open={openStep === 3}
                  onToggle={() => toggleStep(3)}
                  complete={step3Complete}
                  note={demand > 0 ? `${coveragePct}% of demand` : undefined}
                >
                  <Explainer>
                    <strong>What to do:</strong> click on each source type below and
                    complete its <em>required</em> fields. The bar below tracks how much
                    of your demand the entered sources cover.{' '}
                    <strong>Please enter all costs inclusive of GST.</strong> Hover any{' '}
                    <Tooltip text="The info marker explains what a field feeds into and how changing it moves the result." />{' '}
                    for detail.
                  </Explainer>

                  <FieldLegend />

                  <DemandAllocationBar result={result} demand={demand} />

                  {oversupplied && (
                    <InfoBanner kind="warn" title="Sources exceed demand. ">
                      <span>
                        {' '}
                        Entered units supply {formatNumber(result.total_capacity_cu_m)} cu
                        m — {formatNumber(overBy)} cu m more than your demand of{' '}
                        {formatNumber(demand)} cu m. Results still show below; the per-cu-m
                        comparison is unaffected, but to cost the actual oxygen you use,
                        right-size a source&apos;s input (run hours, consumption or cylinder
                        count) or raise the demand in Step 1.
                      </span>
                    </InfoBanner>
                  )}

                  {totalUnits === 0 && (
                    <InfoBanner kind="info">
                      Add at least one source unit in Step 2 to enter its details.
                    </InfoBanner>
                  )}

                  <SharedCostsPanel
                    value={state.shared}
                    onChange={patchShared}
                    onReset={resetShared}
                  />

                  {state.fleet.psa.map((inp, i) => (
                    <div key={`psa-${i}`} data-field-scope={`psa-${i}`}>
                      <PsaInputPanel
                        value={inp}
                        onChange={(p) => patchPsa(i, p)}
                        onReset={() => resetAt('psa', i)}
                        instanceLabel={counts.psa > 1 ? `#${i + 1}` : undefined}
                        idRequired={idRequiredFor('psa', inp)}
                        idDuplicate={idDuplicateFor('psa', inp)}
                        outputCuM={outputById.get(`psa-${i}`) ?? 0}
                        demand={demand}
                      />
                    </div>
                  ))}
                  {state.fleet.lmo.map((inp, i) => (
                    <div key={`lmo-${i}`} data-field-scope={`lmo-${i}`}>
                      <LmoInputPanel
                        value={inp}
                        onChange={(p) => patchLmo(i, p)}
                        onReset={() => resetAt('lmo', i)}
                        instanceLabel={counts.lmo > 1 ? `#${i + 1}` : undefined}
                        idRequired={idRequiredFor('lmo', inp)}
                        idDuplicate={idDuplicateFor('lmo', inp)}
                        outputCuM={outputById.get(`lmo-${i}`) ?? 0}
                        demand={demand}
                        onDisplayUnit={setCostUnit}
                      />
                    </div>
                  ))}
                  {state.fleet.cylinder.map((inp, i) => (
                    <div key={`cylinder-${i}`} data-field-scope={`cylinder-${i}`}>
                      <CylinderInputPanel
                        value={inp}
                        onChange={(p) => patchCyl(i, p)}
                        onReset={() => resetAt('cylinder', i)}
                        instanceLabel={counts.cylinder > 1 ? `#${i + 1}` : undefined}
                        idRequired={idRequiredFor('cylinder', inp)}
                        idDuplicate={idDuplicateFor('cylinder', inp)}
                        outputCuM={outputById.get(`cylinder-${i}`) ?? 0}
                        demand={demand}
                      />
                    </div>
                  ))}
                  {state.fleet.oc.map((inp, i) => (
                    <div key={`oc-${i}`} data-field-scope={`oc-${i}`}>
                      <OcInputPanel
                        value={inp}
                        onChange={(p) => patchOc(i, p)}
                        onReset={() => resetAt('oc', i)}
                        instanceLabel={counts.oc > 1 ? `#${i + 1}` : undefined}
                        idRequired={idRequiredFor('oc', inp)}
                        idDuplicate={idDuplicateFor('oc', inp)}
                        outputCuM={outputById.get(`oc-${i}`) ?? 0}
                        demand={demand}
                      />
                    </div>
                  ))}

                  {validationHints.length > 0 && (
                    <InfoBanner
                      kind="warn"
                      title="Check these inputs"
                      items={validationHints}
                    />
                  )}
                  <StepNav
                    onBack={() => goToStep(2)}
                    backLabel="Sources"
                    onNext={goToResults}
                    nextLabel={showResults ? 'See your results' : 'See what to finish'}
                    ready={step3Complete}
                    todoHint="Fill each source's required (red) fields"
                  />
                </StepCard>
              </div>

              {/* ---- Output column ---- */}
              <div>
                <div id="output-top">
                  <ColumnHeader title="Output" sub="your results · updates live" />
                </div>

                <StepCard
                  kicker="Demand"
                  title="Demand output"
                  tip="How the monthly oxygen demand everything is costed against was arrived at, from your Step 1 method."
                  note={demand > 0 ? `${formatNumber(Math.round(demand))} cu m/mo` : undefined}
                  defaultOpen
                >
                  <Explainer>
                    <strong>What this is:</strong> the monthly oxygen demand used to size and compare
                    your sources. {state.demandMode === 'wards'
                      ? 'Estimated from your ward-level patient counts; click any pill below to jump back to that input.'
                      : state.demandMode === 'admissions'
                        ? 'Estimated from your facility archetype and admissions.'
                        : 'Entered directly in Step 1.'}
                  </Explainer>
                  <DemandSummaryCard state={state} demand={demand} onNavigate={() => setOpenStep(1)} />
                </StepCard>

                <StepCard
                  kicker="Costing"
                  title="Costing output"
                  tip="Your cost comparison across sources — the bottom line, the per-cu-m ranking, full calculations and shared overhead. Unlocks once Steps 1–3 are complete."
                  note={cheapest ? `cheapest: ${cheapest.label}` : undefined}
                  locked={!showResults}
                  lockedPrompt={lockedPrompt}
                  defaultOpen
                >
                  <div className="cost-unit-row">
                    <CostUnitToggle value={costUnit} onChange={setCostUnit} />
                    <span className="small muted">Sets the unit for the cost figures and charts below.</span>
                  </div>

                <PlainSummary
                  result={result}
                  showResults={showResults}
                  configs={recoConfigs}
                  lockedPrompt={lockedPrompt}
                />

                <ScenarioBar
                  scenarios={scenarios}
                  current={currentMetrics}
                  currentSources={currentSources}
                  costView={state.costView}
                  activeId={activeScenarioId}
                  canSave={showResults && scenarios.length < 3}
                  onSave={saveScenario}
                  onUpdate={updateScenario}
                  onLoad={loadScenario}
                  onRename={renameScenario}
                  onRemove={removeScenario}
                />

                <StepCard
                  kicker="Summary"
                  title="Cost summary"
                  tip="The bottom-line cost comparison, across your saved scenarios."
                  defaultOpen
                >
                  {scenarios.length > 0 && (
                    <>
                      <Explainer>
                        <strong>Across all your scenarios:</strong> the cheapest source under
                        each cost basis is shown below — the{' '}
                        <strong>lowest total (capital + running) cost</strong> is highlighted.
                        Below that is the full breakdown for your current inputs.
                      </Explainer>
                      <ScenarioRecommendation configs={recoConfigs} />
                      <div className="scenario-reco-divider">Current inputs — detail</div>
                    </>
                  )}
                  <RecommendationCard result={result} />
                </StepCard>

                <StepCard
                  kicker="Detail"
                  title="Cost comparison"
                  tip="Each source unit costed per cu m under the selected view; all figures are GST-inclusive."
                  note={cheapest ? `cheapest: ${cheapest.label}` : undefined}
                >
                  <Explainer>
                    <strong>How to read this:</strong> pick a <strong>cost view</strong>{' '}
                    that matches your question, then compare the highlighted column.
                    Click any row, bar or line to see its full calculation.
                  </Explainer>

                  <div style={{ marginBottom: 14 }}>
                    <IncrementalVsTotalToggle
                      value={state.costView}
                      onChange={(v) => patch({ costView: v })}
                    />
                  </div>

                  <CostComparisonTable
                    result={result}
                    costView={state.costView}
                    onSelect={showCalcOn(null)}
                    selected={calcScenario === null ? calcSourceId ?? undefined : undefined}
                  />
                  <p className="small muted" style={{ marginTop: 6 }}>
                    All amounts are inclusive of GST. Full working for any source is in the{' '}
                    <strong>Calculation</strong> section below.
                  </p>
                  <p className="small muted" style={{ marginTop: 4 }}>
                    Note: at very large demand these estimates are approximate — sources may
                    run at higher, steadier utilisation than assumed (for example a PSA plant&apos;s
                    compressor running almost continuously with little standby), so the actual
                    per-unit cost can be somewhat lower than shown.
                  </p>

                  <ChartSection
                    title="Cost per cu m, by source"
                    headerRight={scenarioToggle(barView, setBarView)}
                    howToRead={
                      <>
                        Each bar is one source unit&apos;s cost per cu m on the{' '}
                        <em>currently selected</em> view, sorted cheapest-first. Shorter
                        is cheaper. Click a bar for its full calculation.
                      </>
                    }
                    insight={barInsight(barData.result, state.costView)}
                  >
                    <CostComparisonBar
                      result={barData.result}
                      costView={state.costView}
                      onSelect={showCalcOn(barView)}
                    />
                  </ChartSection>

                  <ChartSection
                    title="Cost per cu m vs monthly volume"
                    headerRight={scenarioToggle(curveView, setCurveView)}
                    howToRead={
                      <>
                        Each line is a source&apos;s cost per cu m if it supplied the volume
                        on the x-axis; where two lines cross, the cheaper source switches.
                        The dashed line is your demand. A ringed dot <RingedDotIcon /> marks
                        where each source operates now. The numbered badges give the priority
                        order to meet your demand — <PriorityBadgeIcon rank={1} /> is the
                        first choice, then fall back down the list; a dashed badge{' '}
                        <PriorityBadgeIcon rank={3} partial /> marks a source that can only
                        cover part of the demand.
                      </>
                    }
                    insight={curveInsight(curveData.inputs, curveData.result, state.costView, curveData.demand)}
                  >
                    <PerUnitCurveChart
                      inputs={curveData.inputs}
                      result={curveData.result}
                      demand={curveData.demand}
                      costView={state.costView}
                      onSelect={showCalcOn(curveView)}
                    />
                  </ChartSection>

                  <ChartSection
                    title="Monthly cost composition"
                    headerRight={scenarioToggle(breakdownView, setBreakdownView)}
                    howToRead={
                      <>
                        Each bar is one source&apos;s total monthly spend (₹/month) split
                        into components. A bar dominated by fixed costs (depreciation,
                        rent) becomes much cheaper per cu m at higher volume; one
                        dominated by variable costs (refills, electricity) stays flat.
                      </>
                    }
                    insight={breakdownInsight(breakdownData.result)}
                  >
                    <CostBreakdownChart result={breakdownData.result} />
                  </ChartSection>

                  {counts.oc > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <InfoBanner
                        kind="warn"
                        title="Oxygen concentrator limitations"
                        items={OC_LIMITATIONS}
                      />
                    </div>
                  )}
                  {sourceNotes.length > 0 && (
                    <div style={{ marginTop: 12 }} className="stack-12">
                      {sourceNotes.map((s) => (
                        <InfoBanner key={s.id} kind="warn" title={`${s.label}: `}>
                          <span> {s.notes.join(' ')}</span>
                        </InfoBanner>
                      ))}
                    </div>
                  )}
                </StepCard>

                <StepCard
                  kicker="Detail"
                  title="Calculation"
                  tip="Trace exactly how a source's figures are produced — every formula with your numbers substituted in."
                >
                  <Explainer>
                    <strong>How to read this:</strong> pick a <strong>scenario</strong> (if you&apos;ve
                    saved any) and a <strong>source</strong>; the tables show the monthly output, the
                    cost components and the cost per cu m, with your inputs substituted into each
                    formula. The <span className="calc-ref static">highlighted values</span> are your
                    inputs — click one to jump to that field on the left. Clicking a row, bar or line
                    above jumps here too.
                  </Explainer>

                  <div className="calc-toggles">
                    {scenarios.length > 0 && (
                      <div className="calc-toggle-group">
                        <span className="calc-toggle-label">Scenario</span>
                        <ScenarioViewToggle
                          scenarios={scenarios}
                          value={calcScenario}
                          onChange={(id) => {
                            setCalcScenario(id)
                            setCalcSourceId(null)
                          }}
                        />
                      </div>
                    )}
                    {calcSources.length > 0 && (
                      <div className="calc-toggle-group">
                        <span className="calc-toggle-label">Source</span>
                        <div className="scenario-toggle" role="group" aria-label="Source">
                          {calcSources.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className={selectedCalc?.id === s.id ? 'active' : ''}
                              onClick={() => setCalcSourceId(s.id)}
                              title={s.label}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedCalc && selectedCalcInstance ? (
                    <CalculationDetail
                      source={selectedCalc.source}
                      instance={selectedCalcInstance}
                      result={selectedCalc}
                      onField={calcScenario === null ? goToCalcField : undefined}
                    />
                  ) : (
                    <p className="small muted">No producing source in this scenario yet.</p>
                  )}
                </StepCard>

                <StepCard
                  kicker="Detail"
                  title="Shared facility overhead"
                  tip="Technician/HR and MGPS costs the facility pays regardless of source. Allocated across all delivered oxygen; does not change the source ranking."
                >
                  <SharedOverheadCard result={result} />
                </StepCard>
                </StepCard>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
    </CostUnitContext.Provider>
  )
}

/** Gentle input-sanity hints (spec section 11.8), across all units. */
function buildValidationHints(state: AppState): string[] {
  const hints: string[] = []
  state.fleet.psa.forEach((psa, i) => {
    const tag = state.fleet.psa.length > 1 ? ` (PSA #${i + 1})` : ''
    if (psa.electricity_rate_per_kwh < 1 || psa.electricity_rate_per_kwh > 20) {
      hints.push(
        `PSA electricity rate of ₹${psa.electricity_rate_per_kwh}/kWh looks unusual — typical Indian tariffs are ₹3–12/kWh${tag}.`,
      )
    }
    if (psa.psa_capacity_lpm > 2000) {
      hints.push(
        `PSA capacity of ${psa.psa_capacity_lpm} LPM is very high — check the unit (LPM, not LPH)${tag}.`,
      )
    }
  })
  state.fleet.oc.forEach((oc, i) => {
    const tag = state.fleet.oc.length > 1 ? ` (group #${i + 1})` : ''
    if (oc.oc_electricity_rate < 1 || oc.oc_electricity_rate > 20) {
      hints.push(`Concentrator electricity rate of ₹${oc.oc_electricity_rate}/kWh looks unusual${tag}.`)
    }
  })
  return hints
}
