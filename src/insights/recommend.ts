// Synthesizes the peer-benchmark side of the recommendation and a combined
// bottom line. Pure: takes a profile, the user's input metrics and the cost
// comparison result; returns grouped points + a one-line synthesis that weighs
// cost analysis AND benchmarking together.
import {
  BENCHMARK,
  costPercentile,
  findPeers,
  inputFlags,
  summarizePeers,
} from './benchmark'
import type { UserMetrics, UserProfile } from './benchmark'
import type { BulkSource } from './types'
import type { ComparisonResult, RankEntry, SourceResult, SourceType } from '../engine'

const LABEL: Record<SourceType, string> = {
  psa: 'PSA',
  lmo: 'LMO',
  cylinder: 'cylinders',
  oc: 'concentrators',
}

export interface BenchmarkInsights {
  /** Bullet points sourced from peer benchmarking (kept separate in the card). */
  points: string[]
  /** One-line synthesis combining the cost result with the benchmark context. */
  synthesis: string
}

const BULK: BulkSource[] = ['psa', 'lmo', 'cylinder']

function producing(result: ComparisonResult): SourceResult[] {
  return result.sources.filter(
    (s) => s.monthly_output_cu_m > 0 && Number.isFinite(s.per_cu_m_capex_opex),
  )
}

/** The user's de-facto primary bulk source (largest delivered volume). */
function userPrimary(result: ComparisonResult): BulkSource | null {
  const bulk = producing(result).filter((s) => BULK.includes(s.source as BulkSource))
  if (!bulk.length) return null
  return bulk.reduce((a, b) => (b.monthly_output_cu_m > a.monthly_output_cu_m ? b : a))
    .source as BulkSource
}

function topTotal(result: ComparisonResult): RankEntry | undefined {
  return result.ranking_capex_opex.find((r) =>
    producing(result).some((s) => s.id === r.id),
  )
}

/** Cheapest producing per-cu-m for a given bulk source, or null. */
function bestCost(result: ComparisonResult, src: BulkSource): number | null {
  const vals = result.sources
    .filter((s) => s.source === src && s.monthly_output_cu_m > 0)
    .map((s) => s.per_cu_m_capex_opex)
    .filter((v) => Number.isFinite(v))
  return vals.length ? Math.min(...vals) : null
}

export function buildBenchmarkInsights(
  profile: UserProfile,
  metrics: UserMetrics,
  result: ComparisonResult,
): BenchmarkInsights {
  const peers = findPeers(profile, BENCHMARK, 5)
  const summary = summarizePeers(peers)
  const points: string[] = []

  const uPrimary = userPrimary(result)

  // 1. Peer mix vs the user.
  if (summary.mostCommon && peers.length > 0) {
    if (uPrimary && uPrimary === summary.mostCommon) {
      points.push(
        `Your primary source (${LABEL[uPrimary]}) matches what most comparable facilities use — ${summary.count} of ${summary.total} closest peers rely on it.`,
      )
    } else if (uPrimary) {
      points.push(
        `Most comparable facilities (${summary.count} of ${summary.total}) use ${LABEL[summary.mostCommon]} as their primary source, whereas your largest source is ${LABEL[uPrimary]} — worth understanding why peers differ.`,
      )
    } else {
      points.push(
        `Comparable facilities most often run ${LABEL[summary.mostCommon]} as their primary source.`,
      )
    }
  }

  // 2. Cost standing vs peers (cylinder & LMO have cost data; PSA omitted).
  let bestStanding: { src: BulkSource; pct: number } | null = null
  for (const src of ['cylinder', 'lmo'] as BulkSource[]) {
    const val = bestCost(result, src)
    if (val == null) continue
    const cp = costPercentile(src, val, BENCHMARK)
    if (!cp) continue
    points.push(
      `Your ${LABEL[src]} cost (₹${val.toFixed(2)}/cu m) is cheaper than ${cp.betterThanPct}% of ${cp.n} peers that reported cost.`,
    )
    if (!bestStanding || cp.betterThanPct > bestStanding.pct) {
      bestStanding = { src, pct: cp.betterThanPct }
    }
  }

  // 3. Input outliers (the warnings only — keep the card concise).
  const warns = inputFlags(metrics, BENCHMARK).filter((f) => f.severity === 'warn')
  warns.slice(0, 2).forEach((f) => points.push(f.text))

  // 4. Reliability, if the user runs PSA.
  const hasPsa = result.sources.some((s) => s.source === 'psa')
  const rel = BENCHMARK.meta.psaPlants
  if (hasPsa && rel.nonFunctionalPct > 0) {
    points.push(
      `${rel.nonFunctionalPct}% of the ${rel.total} PSA plants in the cohort were non-functional at survey time — keep cylinder or LMO backup so one outage cannot halt supply.`,
    )
  }

  // --- Synthesis: combine cost winner + benchmark context -------------------
  const top = topTotal(result)
  let synthesis = ''
  if (top) {
    const clauses: string[] = [
      `${top.label} is your most cost-effective source at ₹${top.value.toFixed(2)}/cu m all-in`,
    ]
    if (uPrimary && summary.mostCommon) {
      clauses.push(
        uPrimary === summary.mostCommon
          ? 'in line with comparable facilities'
          : `though most similar facilities lean on ${LABEL[summary.mostCommon]}`,
      )
    }
    if (bestStanding && bestStanding.pct >= 50) {
      clauses.push(`pricing better than ${bestStanding.pct}% of peers`)
    }
    if (result.supply_gap_cu_m > result.demand_cu_m * 0.02) {
      clauses.push('but close the supply gap first')
    } else if (hasPsa && rel.nonFunctionalPct >= 30) {
      clauses.push(`with cylinder backup secured given ${rel.nonFunctionalPct}% PSA downtime in the cohort`)
    }
    synthesis = clauses.join(', ') + '.'
  }

  return { points, synthesis }
}
