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
  const spread = sorted[sorted.length - 1].v - best.v
  return `On the ${VIEW_NAME[view]} view, ${best.label} is cheapest at ₹${best.v.toFixed(
    2,
  )}/cu m — about ${pct.toFixed(0)}% below the next option (${next.label}, ₹${next.v.toFixed(
    2,
  )}). The full spread across sources is ₹${spread.toFixed(2)}/cu m.`
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

  // 1) Cheapest source at the user's demand level.
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
  if (atDemand) {
    parts.push(
      `At your demand (~${formatNumber(demand)} cu m/month), ${atDemand.label} is the cheapest source at ₹${atDemand.v.toFixed(
        2,
      )}/cu m.`,
    )
  }

  // Priority / fallback order: numbered markers on the chart, mirrored here.
  const priority = priorityOrder(inputs, result.sources, view, demand)
  if (priority.length >= 2) {
    const full = priority.filter((p) => p.meetsDemand)
    const capped = priority.filter((p) => !p.meetsDemand)
    if (full.length >= 2) {
      const order = full
        .map((p) => `${p.rank}) ${p.label} (₹${p.cost.toFixed(2)}/cu m)`)
        .join(', then ')
      let s = `Priority order to meet this demand (${VIEW_NAME[view]}): ${order} — fall back down this list if a source is unavailable.`
      if (capped.length > 0) {
        s += ` ${capped
          .map(
            (p) =>
              `${p.label} can only cover ~${formatNumber(p.capacity)} cu m (${Math.round(
                (p.capacity / demand) * 100,
              )}% of demand), so it is partial backup only`,
          )
          .join('; ')}.`
      }
      parts.push(s)
    } else if (capped.length > 0 && full.length <= 1) {
      parts.push(
        `Only ${
          full.length === 1 ? full[0].label : 'a mix of sources'
        } can meet the full demand; ${capped
          .map(
            (p) =>
              `${p.label} tops out at ~${formatNumber(p.capacity)} cu m (${Math.round(
                (p.capacity / demand) * 100,
              )}%)`,
          )
          .join(', ')}.`,
      )
    }
  }

  // 2) Walk the volume axis: report the first genuine crossover, and note any
  //    capacity limit (a source dropping out because it cannot supply more).
  let prev = cheapestAt(0)
  let crossoverNoted = false
  for (let i = 1; i < volumes.length && prev; i++) {
    const cur = cheapestAt(i)
    if (!cur || cur.id === prev.id) {
      if (cur) prev = cur
      continue
    }
    const prevStillSupplies = valAt(prev.id, i) != null
    if (prevStillSupplies && !crossoverNoted) {
      parts.push(
        `${prev.label} and ${cur.label} cross at ~${formatNumber(
          volumes[i],
        )} cu m/month — below that ${prev.label} is cheaper per cu m, above it ${cur.label} wins.`,
      )
      crossoverNoted = true
    } else if (!prevStillSupplies) {
      parts.push(
        `${prev.label} reaches its maximum output near ~${formatNumber(
          volumes[i - 1],
        )} cu m/month; beyond that it cannot supply more, so ${cur.label} becomes the cheapest source that can.`,
      )
    }
    prev = cur
  }
  if (!crossoverNoted && parts.length === 1 && atDemand) {
    parts.push(
      `${atDemand.label} stays the cheapest source it can supply across the volume range shown.`,
    )
  }

  // 3) Where each source sits today.
  const ops = result.sources
    .filter((s) => s.monthly_output_cu_m > 0 && Number.isFinite(pick(s, view)))
    .map((s) => `${s.label} at ${formatNumber(s.monthly_output_cu_m)} cu m`)
  if (ops.length) {
    parts.push(`The ringed dots mark where each source operates today: ${ops.join(', ')}.`)
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

  return `${top.label}'s monthly cost is led by ${biggest.label} (${pct.toFixed(
    0,
  )}% of its total). Fixed costs make up ${fixedShare.toFixed(0)}% — ${
    fixedShare > 50
      ? 'so using it more heavily sharply lowers its cost per cu m.'
      : 'so its cost per cu m is fairly stable as volume changes.'
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
