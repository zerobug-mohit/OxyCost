// Data-driven, plain-language insights for each chart. Pure functions over the
// engine results so the narrative always matches the numbers on screen.
import { costCurves, priorityOrder } from '../../engine'
import type {
  ComparisonResult,
  CostView,
  EngineInputs,
  SourceResult,
} from '../../engine'
import { formatNumber } from '../../utils/format'

const VIEW_NAME: Record<CostView, string> = {
  opex_only: 'opex-only',
  capex_opex: 'capex + opex',
  incremental: 'incremental',
}

function pick(s: SourceResult, view: CostView): number {
  return view === 'opex_only'
    ? s.per_cu_m_opex_only
    : view === 'incremental'
      ? s.incremental_cost_per_cu_m
      : s.per_cu_m_capex_opex
}

/** Insight for the per-source cost bar. */
export function barInsight(result: ComparisonResult, view: CostView): string {
  const sorted = result.sources
    .map((s) => ({ label: s.label, v: pick(s, view) }))
    .filter((x) => Number.isFinite(x.v))
    .sort((a, b) => a.v - b.v)

  if (sorted.length === 0) return 'Enter source details to compare costs.'
  if (sorted.length === 1)
    return `${sorted[0].label} is your only producing source, at ₹${sorted[0].v.toFixed(2)}/cu m (${VIEW_NAME[view]}).`

  const best = sorted[0]
  const next = sorted[1]
  const pct = ((next.v - best.v) / next.v) * 100
  return `Cheapest (${VIEW_NAME[view]}): ${best.label} at ₹${best.v.toFixed(
    2,
  )}/cu m — ${pct.toFixed(0)}% below the next, ${next.label} (₹${next.v.toFixed(2)}).`
}

/**
 * Insight for the cost-vs-volume curve. Distinguishes a genuine cost crossover
 * (one source becomes cheaper than another that *can still supply* the volume)
 * from a capacity limit (a source simply cannot supply higher volumes).
 */
export function curveInsight(
  inputs: EngineInputs,
  result: ComparisonResult,
  view: CostView,
  demand: number,
): string {
  const volumes = buildVolumes(result, demand)
  const series = costCurves(inputs, view, volumes)
  if (series.length === 0) return ''

  const valAt = (id: string, i: number) =>
    series.find((s) => s.id === id)?.points[i]?.value ?? null
  const cheapestAt = (i: number) => {
    let best: { id: string; label: string; v: number } | null = null
    for (const s of series) {
      const v = s.points[i]?.value
      if (v != null && (best === null || v < best.v)) best = { id: s.id, label: s.label, v }
    }
    return best
  }

  const parts: string[] = []

  // Cheapest at the demand level (used when there is no multi-source order).
  let di = 0
  let dd = Infinity
  volumes.forEach((v, i) => {
    const d = Math.abs(v - demand)
    if (d < dd) {
      dd = d
      di = i
    }
  })
  const atDemand = cheapestAt(di)

  // Lead with the priority / fallback order (numbered on the chart); if only one
  // source can cover demand, just name the cheapest at that volume.
  const priority = priorityOrder(inputs, result.sources, view, demand)
  const full = priority.filter((p) => p.meetsDemand)
  const capped = priority.filter((p) => !p.meetsDemand)

  if (full.length >= 2) {
    parts.push(
      `To meet ~${formatNumber(demand)} cu m/month, use in this order: ${full
        .map((p) => `${p.rank}) ${p.label} (₹${p.cost.toFixed(2)})`)
        .join(' › ')} — fall back down the list if one is unavailable.`,
    )
  } else if (atDemand) {
    parts.push(
      `At ~${formatNumber(demand)} cu m/month, ${atDemand.label} is cheapest at ₹${atDemand.v.toFixed(
        2,
      )}/cu m.`,
    )
  }

  if (capped.length > 0) {
    parts.push(
      `${capped
        .map(
          (p) =>
            `${p.label} covers only ~${formatNumber(p.capacity)} cu m (${Math.round(
              (p.capacity / demand) * 100,
            )}%)`,
        )
        .join('; ')} — partial backup only.`,
    )
  }

  // First genuine crossover within the plotted range (where the cheaper source
  // switches while the previous one can still supply).
  let prev = cheapestAt(0)
  for (let i = 1; i < volumes.length && prev; i++) {
    const cur = cheapestAt(i)
    if (!cur || cur.id === prev.id) {
      if (cur) prev = cur
      continue
    }
    if (valAt(prev.id, i) != null) {
      parts.push(
        `Lines cross near ~${formatNumber(volumes[i])} cu m: below it ${prev.label} is cheaper, above it ${cur.label}.`,
      )
      break
    }
    prev = cur
  }

  return parts.join(' ')
}

/** Insight for the monthly cost-composition bars. */
export function breakdownInsight(result: ComparisonResult): string {
  const producing = result.sources.filter((s) => s.monthly_output_cu_m > 0)
  if (producing.length === 0) return ''

  const top = [...producing].sort(
    (a, b) => a.per_cu_m_capex_opex - b.per_cu_m_capex_opex,
  )[0]
  const biggest = [...top.components]
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0]
  if (!biggest) return ''

  const pct = (biggest.amount / top.total_monthly_cost) * 100
  const fixedShare =
    (top.components
      .filter((c) => !c.variable)
      .reduce((a, c) => a + c.amount, 0) /
      top.total_monthly_cost) *
    100

  return `${top.label}: ${biggest.label} is the biggest cost (${pct.toFixed(
    0,
  )}%); fixed costs are ${fixedShare.toFixed(0)}% — ${
    fixedShare > 50
      ? 'running it more sharply lowers its cost per cu m.'
      : 'its cost per cu m is fairly stable with volume.'
  }`
}

/** Volume axis that also spans every source's current output (for the dots). */
function buildVolumes(result: ComparisonResult, demand: number, steps = 28): number[] {
  const maxOutput = result.sources.reduce(
    (m, s) => (Number.isFinite(s.monthly_output_cu_m) ? Math.max(m, s.monthly_output_cu_m) : m),
    0,
  )
  const top = Math.max(demand * 2, 2000, maxOutput * 1.1)
  const start = Math.max(top / steps, 50)
  const out: number[] = []
  for (let i = 1; i <= steps; i++) {
    out.push(Math.round((start + ((top - start) * (i - 1)) / (steps - 1)) / 10) * 10)
  }
  return out
}

export { buildVolumes }
