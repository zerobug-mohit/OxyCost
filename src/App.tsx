import { useMemo, useState } from 'react'
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
import { CostBreakdownChart } from './components/results/CostBreakdownChart'
import { ChartSection } from './components/results/ChartSection'
import { barInsight, curveInsight, breakdownInsight } from './components/results/insights'
import { RecommendationCard } from './components/results/RecommendationCard'
import { SourceDrillDown } from './components/results/SourceDrillDown'
import { DemandAllocationBar } from './components/results/DemandAllocationBar'
import { BenchmarkSection } from './components/results/BenchmarkSection'
import { buildProfile, buildMetrics } from './insights/profile'
import { buildBenchmarkInsights } from './insights/recommend'
import { BENCHMARK } from './insights/benchmark'
import { InfoBanner } from './components/shared/InfoBanner'
import { Explainer } from './components/shared/Explainer'
import { Tooltip } from './components/shared/Tooltip'
import { FieldLegend } from './components/shared/FieldLegend'
import { MethodologyTab } from './components/methodology/MethodologyTab'
import { GuideTab } from './components/methodology/GuideTab'
import { formatNumber } from './utils/format'
import { useCalculation } from './hooks/useCalculation'
import { initialState, resetInstance } from './state'
import { SHARED_DEFAULTS } from './engine'
import type { AppState } from './state'
import { OC_LIMITATIONS } from './engine'
import type {
  CylinderInputs,
  LmoInputs,
  OcInputs,
  PsaInputs,
  SharedInputs,
  SourceType,
} from './engine'

function StepCard({
  n,
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
      <div className="card step-card locked">
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
    <details className="card step-card" open={controlled ? open : defaultOpen}>
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
  const [state, setState] = useState<AppState>(initialState)
  const [drill, setDrill] = useState<string | null>(null)
  // Left-column accordion: only one step open at a time (null = all collapsed).
  const [openStep, setOpenStep] = useState<number | null>(null)
  const toggleStep = (s: number) => setOpenStep((cur) => (cur === s ? null : s))
  const { demand, result, inputs } = useCalculation(state)

  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }))

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

  // Drill-down: resolve the selected instance + its result.
  const drillResult = drill ? result.sources.find((s) => s.id === drill) : undefined
  const drillInstance = drillResult
    ? state.fleet[drillResult.source][drillResult.index]
    : undefined

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
  const showResults = step1Complete && step2Complete && step3Complete && !oversupplied

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
  ) : oversupplied ? (
    <>
      Your sources supply {formatNumber(overBy)} cu m more than demand — reduce a
      source&apos;s input or raise demand in <strong>Step 1</strong> so they match.
    </>
  ) : null
  const cheapest = result.ranking_capex_opex.find((r) =>
    result.sources.some(
      (s) => s.id === r.id && s.monthly_output_cu_m > 0 && Number.isFinite(r.value),
    ),
  )

  // Benchmark-derived insights synthesized into the recommendation.
  const benchmarkInsights = useMemo(
    () => buildBenchmarkInsights(buildProfile(state, demand), buildMetrics(state), result),
    [state, demand, result],
  )

  return (
    <div className="app">
      <Header tab={tab} onTab={setTab} />
      <main className="app-main">
        <div className="container">
          {tab === 'guide' ? (
            <GuideTab />
          ) : tab === 'methodology' ? (
            <MethodologyTab />
          ) : (
            <div className="layout-grid">
              {/* ---- Inputs column ---- */}
              <div>
                <ColumnHeader title="Inputs" sub="what you can change" />
                <StepCard
                  n={1}
                  title="Estimate monthly demand"
                  tip="Everything is compared against this monthly oxygen demand. Your source units should together add up to it."
                  open={openStep === 1}
                  onToggle={() => toggleStep(1)}
                  complete={step1Complete}
                  note={demand > 0 ? `${formatNumber(demand)} cu m/mo` : undefined}
                >
                  <Explainer>
                    <strong>What to do:</strong> enter how much oxygen the facility
                    uses per month. Don&apos;t have the figure? Use{' '}
                    <strong>From beds</strong> and the tool computes it.
                  </Explainer>
                  <FieldLegend />
                  <DemandInput state={state} onPatch={patch} resolvedDemand={demand} />
                </StepCard>

                <StepCard
                  n={2}
                  title="How many of each source?"
                  tip="Set the number of each physical unit your facility has. Each one becomes its own row, input panel and cost line."
                  open={openStep === 2}
                  onToggle={() => toggleStep(2)}
                  complete={step2Complete}
                  note={`${totalUnits} unit${totalUnits === 1 ? '' : 's'}`}
                >
                  <Explainer>
                    <strong>What to do:</strong> use the + / − steppers to match your
                    facility — e.g. 2 PSA plants and 1 LMO tank. Each unit gets its own
                    input panel in Step 3, and their outputs add up toward your demand.
                  </Explainer>
                  <SourceConfigurator fleet={state.fleet} onSet={setVariantCount} />
                </StepCard>

                <StepCard
                  n={3}
                  title="Source details"
                  open={openStep === 3}
                  onToggle={() => toggleStep(3)}
                  complete={step3Complete}
                  note={demand > 0 ? `${coveragePct}% of demand` : undefined}
                >
                  <Explainer>
                    <strong>What to do:</strong> open each unit and complete its{' '}
                    <em>required</em> fields. The bar below tracks how much of your
                    demand the entered units cover. All costs are{' '}
                    <strong>GST-inclusive</strong>; hover any{' '}
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
                        {formatNumber(demand)} cu m. Results in Step 4 stay hidden until
                        the mix matches: reduce a source&apos;s input (run hours,
                        consumption or cylinder count) or raise the demand in Step 1.
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
                    <PsaInputPanel
                      key={`psa-${i}`}
                      value={inp}
                      onChange={(p) => patchPsa(i, p)}
                      onReset={() => resetAt('psa', i)}
                      instanceLabel={counts.psa > 1 ? `#${i + 1}` : undefined}
                      idRequired={idRequiredFor('psa', inp)}
                      idDuplicate={idDuplicateFor('psa', inp)}
                      outputCuM={outputById.get(`psa-${i}`) ?? 0}
                      demand={demand}
                    />
                  ))}
                  {state.fleet.lmo.map((inp, i) => (
                    <LmoInputPanel
                      key={`lmo-${i}`}
                      value={inp}
                      onChange={(p) => patchLmo(i, p)}
                      onReset={() => resetAt('lmo', i)}
                      instanceLabel={counts.lmo > 1 ? `#${i + 1}` : undefined}
                      idRequired={idRequiredFor('lmo', inp)}
                      idDuplicate={idDuplicateFor('lmo', inp)}
                      outputCuM={outputById.get(`lmo-${i}`) ?? 0}
                      demand={demand}
                    />
                  ))}
                  {state.fleet.cylinder.map((inp, i) => (
                    <CylinderInputPanel
                      key={`cylinder-${i}`}
                      value={inp}
                      onChange={(p) => patchCyl(i, p)}
                      onReset={() => resetAt('cylinder', i)}
                      instanceLabel={counts.cylinder > 1 ? `#${i + 1}` : undefined}
                      idRequired={idRequiredFor('cylinder', inp)}
                      idDuplicate={idDuplicateFor('cylinder', inp)}
                      outputCuM={outputById.get(`cylinder-${i}`) ?? 0}
                      demand={demand}
                    />
                  ))}
                  {state.fleet.oc.map((inp, i) => (
                    <OcInputPanel
                      key={`oc-${i}`}
                      value={inp}
                      onChange={(p) => patchOc(i, p)}
                      onReset={() => resetAt('oc', i)}
                      instanceLabel={counts.oc > 1 ? `#${i + 1}` : undefined}
                      idRequired={idRequiredFor('oc', inp)}
                      idDuplicate={idDuplicateFor('oc', inp)}
                      outputCuM={outputById.get(`oc-${i}`) ?? 0}
                      demand={demand}
                    />
                  ))}

                  {validationHints.length > 0 && (
                    <InfoBanner
                      kind="warn"
                      title="Check these inputs"
                      items={validationHints}
                    />
                  )}
                </StepCard>
              </div>

              {/* ---- Output column ---- */}
              <div>
                <ColumnHeader title="Output" sub="your results · updates live" />

                <StepCard
                  kicker="Summary"
                  title="Recommendation"
                  tip="The synthesized bottom line — combines the cost analysis with peer benchmarking."
                  locked={!showResults}
                  lockedPrompt={lockedPrompt}
                >
                  <RecommendationCard result={result} benchmark={benchmarkInsights} />
                </StepCard>

                <StepCard
                  kicker="Detail"
                  title="Cost comparison"
                  tip="Each source unit costed per cu m under the selected view; all figures are GST-inclusive."
                  note={cheapest ? `cheapest: ${cheapest.label}` : undefined}
                  locked={!showResults}
                  lockedPrompt={lockedPrompt}
                >
                  <Explainer>
                    <strong>How to read this:</strong> pick a <strong>cost view</strong>{' '}
                    that matches your decision, then compare the highlighted column.
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
                    onSelect={setDrill}
                    selected={drill}
                  />
                  <p className="small muted" style={{ marginTop: 6 }}>
                    All amounts are inclusive of GST.
                  </p>
                  {drillResult && drillInstance && (
                    <SourceDrillDown
                      source={drillResult.source}
                      instance={drillInstance}
                      result={drillResult}
                      onClose={() => setDrill(null)}
                    />
                  )}

                  <ChartSection
                    title="Cost per cu m, by source"
                    howToRead={
                      <>
                        Each bar is one source unit&apos;s cost per cu m on the{' '}
                        <em>currently selected</em> view, sorted cheapest-first. Shorter
                        is cheaper. Click a bar for its full calculation.
                      </>
                    }
                    insight={barInsight(result, state.costView)}
                  >
                    <CostComparisonBar
                      result={result}
                      costView={state.costView}
                      onSelect={setDrill}
                    />
                  </ChartSection>

                  <ChartSection
                    title="Cost per cu m vs monthly volume"
                    howToRead={
                      <>
                        Each line shows what a source would cost per cu m if it supplied
                        the volume on the x-axis — so you can see how cost changes with
                        scale. Where two lines cross, the cheaper source switches. The
                        dashed line is your demand; the <strong>ringed dots</strong> mark
                        where each source operates now, given your inputs.
                      </>
                    }
                    insight={curveInsight(inputs, result, state.costView, demand)}
                  >
                    <PerUnitCurveChart
                      inputs={inputs}
                      result={result}
                      demand={demand}
                      costView={state.costView}
                      onSelect={setDrill}
                    />
                  </ChartSection>

                  <ChartSection
                    title="Monthly cost composition"
                    howToRead={
                      <>
                        Each bar is one source&apos;s total monthly spend (₹/month) split
                        into components. A bar dominated by fixed costs (depreciation,
                        rent) becomes much cheaper per cu m at higher volume; one
                        dominated by variable costs (refills, electricity) stays flat.
                      </>
                    }
                    insight={breakdownInsight(result)}
                  >
                    <CostBreakdownChart result={result} />
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
                  title="Shared facility overhead"
                  tip="Technician/HR and MGPS costs the facility pays regardless of source. Allocated across all delivered oxygen; does not change the source ranking."
                  locked={!showResults}
                  lockedPrompt={lockedPrompt}
                >
                  <SharedOverheadCard result={result} />
                </StepCard>

                <StepCard
                  kicker="Context"
                  title="Benchmarks — how you compare"
                  tip="Compares your inputs and results against the anonymized WJCF facility knowledge base. Contextual guidance, not a cost calculation."
                  note={`${BENCHMARK.meta.facilityCount} facilities · WJCF`}
                  locked={!showResults}
                  lockedPrompt={lockedPrompt}
                >
                  <BenchmarkSection state={state} result={result} demand={demand} />
                </StepCard>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
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
