// Comparison and recommendation engine.
// Implements CALC-COMP-01 .. CALC-COMP-04 from oxygencost_spec.md section 4e.

import { calcConcentrator } from './concentrator'
import { calcCylinder } from './cylinder'
import { calcLmo } from './lmo'
import { calcPsa } from './psa'
import { priorityOrder } from './sweep'
import type {
  ComparisonResult,
  EngineInputs,
  PriorityEntry,
  RankEntry,
  RecoFact,
  RecoSummary,
  SourceResult,
} from './types'

/** Run every instance of every enabled source and return results in order. */
export function computeSources(inputs: EngineInputs): SourceResult[] {
  const results: SourceResult[] = []

  const addAll = <T extends { item_id_value?: string }>(
    arr: T[] | undefined,
    calc: (i: T) => SourceResult,
  ): void => {
    if (!arr || arr.length === 0) return
    const many = arr.length > 1
    arr.forEach((inp, i) => {
      const r = calc(inp)
      r.id = `${r.source}-${i}`
      r.index = i
      // A user-supplied identifier (manufacturer/donor/id) takes precedence as
      // the differentiator; otherwise number duplicate units #1, #2, …
      const ident = inp.item_id_value?.trim()
      if (ident) r.label = `${ident} · ${r.label}`
      else if (many) r.label = `${r.label} #${i + 1}`
      results.push(r)
    })
  }

  addAll(inputs.psa, calcPsa)
  addAll(inputs.lmo, calcLmo)
  addAll(inputs.cylinder, calcCylinder)
  addAll(inputs.oc, calcConcentrator)
  return results
}

function rankBy(
  sources: SourceResult[],
  pick: (s: SourceResult) => number,
): RankEntry[] {
  return sources
    .map((s) => ({ source: s.source, id: s.id, label: s.label, value: pick(s) }))
    // Ascending; Infinity (no output) sorts to the bottom.
    .sort((a, b) => a.value - b.value)
}

export function compareAllSources(
  inputs: EngineInputs,
  demandCuM = inputs.demand_cu_m,
): ComparisonResult {
  const sources = computeSources(inputs)

  // CALC-COMP-02: capacity and supply gap.
  const total_capacity_cu_m = sources.reduce(
    (sum, s) => sum + (Number.isFinite(s.monthly_output_cu_m) ? s.monthly_output_cu_m : 0),
    0,
  )
  const supply_gap_cu_m = demandCuM - total_capacity_cu_m

  // CALC-COMP-03: three rankings.
  const ranking_opex_only = rankBy(sources, (s) => s.per_cu_m_opex_only)
  const ranking_capex_opex = rankBy(sources, (s) => s.per_cu_m_capex_opex)
  const ranking_incremental = rankBy(sources, (s) => s.incremental_cost_per_cu_m)

  // CALC-COMP-05: facility shared overhead (HR + MGPS + other), allocated across
  // delivered oxygen. Reported separately — it is incurred regardless of which
  // source is used, so it does not change the per-source ranking.
  const shared = inputs.shared
  const shared_overhead_monthly = shared
    ? shared.hr_salary_monthly +
      (shared.mgps_amc_annual + shared.mgps_maintenance_annual) / 12 +
      shared.other_shared_monthly
    : 0
  const shared_overhead_per_cu_m =
    total_capacity_cu_m > 0 ? shared_overhead_monthly / total_capacity_cu_m : 0

  // Priority / fallback order for meeting demand (all-in cost basis), so the
  // recommendation can advise what to rely on first and what to fall back to.
  const priority = priorityOrder(inputs, sources, 'capex_opex', demandCuM)

  const notes: string[] = []
  const { lead, points, summary } = buildRecommendation(
    sources,
    demandCuM,
    supply_gap_cu_m,
    { ranking_opex_only, ranking_capex_opex, ranking_incremental },
    priority,
    shared_overhead_per_cu_m,
    notes,
  )

  return {
    sources,
    demand_cu_m: demandCuM,
    supply_gap_cu_m,
    total_capacity_cu_m,
    ranking_opex_only,
    ranking_capex_opex,
    ranking_incremental,
    shared_overhead_monthly,
    shared_overhead_per_cu_m,
    recommendation: lead,
    recommendationPoints: points,
    recoSummary: summary,
    notes,
  }
}

function inr(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `INR ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function cuM(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/**
 * Resilience point: the priority order to meet demand and the fallback if the
 * first choice is unavailable, plus a note on any capacity-limited source that
 * can only serve as partial backup.
 */
function buildPriorityPoint(priority: PriorityEntry[], demandCuM: number): string | null {
  if (priority.length < 2) {
    if (priority.length === 1) {
      return `Resilience: ${priority[0].label} is your only producing source — there is no fallback if it goes down. Consider adding a backup source.`
    }
    return null
  }

  const full = priority.filter((p) => p.meetsDemand)
  const capped = priority.filter((p) => !p.meetsDemand)

  let text: string
  if (full.length >= 2) {
    const order = full.map((p) => `${p.rank}) ${p.label} (${inr(p.cost)}/cu m)`).join(', then ')
    text = `Priority / fallback order to meet demand (total cost basis): ${order}. If your first choice is unavailable (breakdown, supply disruption), move to the next in this order.`
  } else if (full.length === 1) {
    text = `Only ${full[0].label} can meet your full demand alone (${inr(
      full[0].cost,
    )}/cu m total) — it is the priority source.`
  } else {
    text = `No single source can meet your full demand alone — you will need a mix.`
  }

  if (capped.length > 0) {
    const notes = capped
      .map(
        (p) =>
          `${p.label} can cover at most ${cuM(p.capacity)} cu m (${Math.round(
            (p.capacity / demandCuM) * 100,
          )}% of demand), so treat it as partial backup`,
      )
      .join('; ')
    text += ` ${notes}.`
  }

  return text
}

function emptySummary(sharedPerCuM = 0): RecoSummary {
  return {
    pick: null,
    facts: [],
    priority: [],
    mix: [],
    blendedMarginal: null,
    caveats: [],
    sharedPerCuM,
    allInWithShared: null,
  }
}

/** CALC-COMP-04: comprehensive, decision-oriented recommendation. */
function buildRecommendation(
  sources: SourceResult[],
  demandCuM: number,
  supplyGap: number,
  rankings: {
    ranking_opex_only: RankEntry[]
    ranking_capex_opex: RankEntry[]
    ranking_incremental: RankEntry[]
  },
  priority: PriorityEntry[],
  sharedPerCuM: number,
  notes: string[],
): { lead: string; points: string[]; summary: RecoSummary } {
  if (demandCuM <= 0) {
    return {
      lead: 'Enter your estimated monthly oxygen demand (in cu m) to see the cost comparison.',
      points: [],
      summary: emptySummary(sharedPerCuM),
    }
  }
  if (sources.length === 0) {
    return {
      lead: 'Add at least one oxygen source to compare.',
      points: [],
      summary: emptySummary(sharedPerCuM),
    }
  }

  const producing = sources.filter(
    (s) => s.monthly_output_cu_m > 0 && Number.isFinite(s.per_cu_m_capex_opex),
  )
  if (producing.length === 0) {
    return {
      lead: 'None of the selected sources are producing oxygen with the current inputs — check run hours, consumption and unit counts.',
      points: [],
      summary: emptySummary(sharedPerCuM),
    }
  }

  const firstProducing = (ranking: RankEntry[]) =>
    ranking.find((r) => producing.some((p) => p.id === r.id))!
  const topOpex = firstProducing(rankings.ranking_opex_only)
  const topTotal = firstProducing(rankings.ranking_capex_opex)
  const topIncr = firstProducing(rankings.ranking_incremental)

  const points: string[] = []
  const mix: { label: string; cuM: number }[] = []
  let blendedMarginal: number | null = null
  const caveats: string[] = []

  // Lead: lowest total cost of ownership (informational, not advisory).
  const lead = `For total cost (capital + running), ${topTotal.label} has the lowest cost at ${inr(
    topTotal.value,
  )}/cu m.`

  // Opex-only.
  if (topOpex.id === topTotal.id) {
    points.push(
      `It also has the lowest day-to-day running cost at ${inr(topOpex.value)}/cu m (opex only) — the lowest whether or not the equipment is already owned.`,
    )
  } else {
    points.push(
      `If the equipment is already owned, ${topOpex.label} has the lowest running cost at ${inr(
        topOpex.value,
      )}/cu m (opex only) — which is lower depends on whether the capital is already spent.`,
    )
  }

  // Incremental / next unit.
  points.push(
    `For each additional cu m, ${topIncr.label} has the lowest marginal cost at ${inr(
      topIncr.value,
    )}/cu m — the least added cost per extra cu m of supply.`,
  )

  // Priority / fallback order (resilience): what to rely on first and what to
  // fall back to if a source is unavailable (breakdown, supply disruption).
  const fallbackPoint = buildPriorityPoint(priority, demandCuM)
  if (fallbackPoint) points.push(fallbackPoint)

  // Suggested least-cost mix (greedy by incremental cost, capped by capacity).
  if (producing.length > 1) {
    const ordered = [...producing].sort(
      (a, b) => a.incremental_cost_per_cu_m - b.incremental_cost_per_cu_m,
    )
    let remaining = demandCuM
    let blendedCost = 0
    const alloc: string[] = []
    for (const s of ordered) {
      if (remaining <= 0) break
      const take = Math.min(remaining, s.monthly_output_cu_m)
      if (take <= 0) continue
      alloc.push(`${cuM(take)} cu m from ${s.label}`)
      mix.push({ label: s.label, cuM: take })
      blendedCost += take * s.incremental_cost_per_cu_m
      remaining -= take
    }
    if (alloc.length > 1) {
      const blended = blendedCost / (demandCuM - Math.max(0, remaining))
      blendedMarginal = blended
      points.push(
        `Lowest-cost mix to meet ${cuM(demandCuM)} cu m/month: ${alloc.join(
          ', then ',
        )} — a blended marginal cost of about ${inr(blended)}/cu m.`,
      )
    } else {
      // A single source covers demand — not a "mix".
      mix.length = 0
    }
  }

  // Supply gap / spare capacity.
  if (supplyGap > demandCuM * 0.02) {
    points.push(
      `Supply gap: your sources can deliver ${cuM(
        demandCuM - supplyGap,
      )} cu m against demand of ${cuM(demandCuM)} — short by ${cuM(
        supplyGap,
      )} cu m at the entered inputs.`,
    )
    notes.push('Supply gap: current sources cannot meet demand.')
  }

  // OC caveat.
  const ocWins =
    topOpex.source === 'oc' || topTotal.source === 'oc' || topIncr.source === 'oc'
  if (ocWins) {
    const c =
      'Concentrators are low-purity (90–96%) and low-flow — they are typically a supplement rather than a primary supply for ventilators or high-acuity care.'
    caveats.push(c)
    points.push(`Note: ${c}`)
  }

  // PSA underutilization.
  const psaUnder = producing.find(
    (s) => s.source === 'psa' && s.notes.some((n) => n.toLowerCase().includes('underutilized')),
  )
  if (psaUnder) {
    caveats.push(`${psaUnder.label} is underutilized — more run hours sharply cut its per-unit cost.`)
    points.push(
      `${psaUnder.label} is underutilized — its per-unit cost falls sharply as run hours rise.`,
    )
  }

  // Shared overhead reminder (applies equally to all sources, so it does not
  // change the ranking, but matters for the all-in budget).
  if (sharedPerCuM > 0) {
    points.push(
      `Add shared facility overhead (HR + MGPS) of ${inr(
        sharedPerCuM,
      )}/cu m on top of any source for the total cost — so ${topTotal.label} is about ${inr(
        topTotal.value + sharedPerCuM,
      )}/cu m all-in (capital + running + overhead). This overhead is the same whichever source you choose, so it does not change which source is cheapest.`,
    )
  }

  const factOf = (
    key: RecoFact['key'],
    label: string,
    r: RankEntry,
  ): RecoFact => ({
    key,
    label,
    id: r.id,
    source: r.source,
    sourceLabel: r.label,
    value: r.value,
  })
  const facts: RecoFact[] = [
    factOf('all_in', 'Lowest total', topTotal),
    factOf('opex', 'Cheapest to run', topOpex),
    factOf('incremental', 'Lowest marginal', topIncr),
  ]

  const summary: RecoSummary = {
    pick: facts[0],
    facts,
    priority,
    mix,
    blendedMarginal,
    caveats,
    sharedPerCuM,
    allInWithShared: sharedPerCuM > 0 ? topTotal.value + sharedPerCuM : topTotal.value,
  }

  return { lead, points, summary }
}
