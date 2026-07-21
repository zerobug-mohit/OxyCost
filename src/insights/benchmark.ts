// Pure benchmarking analytics over the anonymized facility knowledge base.
// No React/UI dependency — all functions take plain data and return plain data.
import rawData from '../data/facilities.json'
import type { BenchmarkData, BulkSource, PeerFacility } from './types'

export const BENCHMARK = rawData as unknown as BenchmarkData

const SOURCE_KEYS = ['psa', 'lmo', 'cylinder', 'oc'] as const

export interface UserProfile {
  /** Oxygen beds, if entered (0/undefined = unknown). Drives size matching. */
  oxBeds: number | null
  demand: number
  sources: { psa: boolean; lmo: boolean; cylinder: boolean; oc: boolean }
}

export interface PeerMatch {
  facility: PeerFacility
  score: number
  similarity: number // 0–100
}

// --- small stats helpers -----------------------------------------------------

function median(xs: number[]): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Value at percentile p (0–100) of an already-sorted array. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  if (sorted.length === 1) return sorted[0]
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

// --- 1. Peer matching --------------------------------------------------------

/**
 * Nearest facilities to the user's profile. Matches on size (oxygen beds if
 * given, else monthly demand vs the peer's total output) and source-mix overlap.
 */
export function findPeers(
  profile: UserProfile,
  data: BenchmarkData = BENCHMARK,
  k = 5,
): PeerMatch[] {
  const useBeds = (profile.oxBeds ?? 0) > 0
  const pool = data.facilities.filter(
    (f) => f.primary && (useBeds ? (f.oxBeds ?? 0) > 0 : f.output.total > 0),
  )
  if (pool.length === 0) return []

  const userSize = useBeds ? (profile.oxBeds as number) : profile.demand
  const facSize = (f: PeerFacility) => (useBeds ? (f.oxBeds as number) : f.output.total)
  const maxSize = Math.max(userSize, ...pool.map(facSize), 1)

  return pool
    .map((f) => {
      const sizeDiff = Math.abs(userSize - facSize(f)) / maxSize
      const mismatch =
        SOURCE_KEYS.reduce(
          (a, s) => a + (profile.sources[s] !== f.sources[s] ? 1 : 0),
          0,
        ) / SOURCE_KEYS.length
      const score = 0.6 * sizeDiff + 0.4 * mismatch
      return { facility: f, score, similarity: Math.max(0, Math.round((1 - score) * 100)) }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, k)
}

export interface PeerSummary {
  mostCommon: BulkSource | null
  count: number
  total: number
  share: number
  medianCost: number | null
  costN: number
}

/** Headline summary of a peer set: their most common primary source + median cost. */
export function summarizePeers(peers: PeerMatch[]): PeerSummary {
  const counts: Record<BulkSource, number> = { psa: 0, lmo: 0, cylinder: 0 }
  for (const p of peers) if (p.facility.primary) counts[p.facility.primary]++
  const order: BulkSource[] = ['psa', 'lmo', 'cylinder']
  const mostCommon =
    peers.length > 0
      ? order.reduce((best, s) => (counts[s] > counts[best] ? s : best), order[0])
      : null
  const costs =
    mostCommon != null
      ? peers
          .map((p) => p.facility.perCuM[mostCommon])
          .filter((x): x is number => x != null)
      : []
  return {
    mostCommon: mostCommon && counts[mostCommon] > 0 ? mostCommon : null,
    count: mostCommon ? counts[mostCommon] : 0,
    total: peers.length,
    share: peers.length ? (mostCommon ? counts[mostCommon] / peers.length : 0) : 0,
    medianCost: costs.length ? Math.round(median(costs) * 100) / 100 : null,
    costN: costs.length,
  }
}

// --- 2. Cost percentile ------------------------------------------------------

export interface CostPercentile {
  betterThanPct: number
  n: number
  median: number
}

/** Where the user's per-cu-m sits vs peers for a source (lower = cheaper = better). */
export function costPercentile(
  source: BulkSource,
  value: number,
  data: BenchmarkData = BENCHMARK,
  minN = 8,
): CostPercentile | null {
  const arr = data.distributions.perCuM[source]
  if (!arr || arr.length < minN || !Number.isFinite(value)) return null
  const cheaperThan = arr.filter((x) => x > value).length / arr.length
  return {
    betterThanPct: Math.round(cheaperThan * 100),
    n: arr.length,
    median: Math.round(percentile(arr, 50) * 100) / 100,
  }
}

// --- 3. Input reality-check flags -------------------------------------------

export interface UserMetrics {
  cylRefillD?: number
  cylRefillB?: number
  psaPowerPerLpm?: number[]
  hrSalary?: number
  lmoRental?: number[]
}

export interface Flag {
  severity: 'warn' | 'good' | 'neutral'
  text: string
}

function inr(v: number): string {
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}

function highLowFlag(
  label: string,
  value: number | undefined,
  sorted: number[],
  fmt: (v: number) => string,
  highAdvice: string,
  lowNote?: string,
  minN = 8,
): Flag | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  if (!sorted || sorted.length < minN) return null
  const p90 = percentile(sorted, 90)
  const p10 = percentile(sorted, 10)
  const med = percentile(sorted, 50)
  if (value > p90) {
    return {
      severity: 'warn',
      text: `${label} of ${fmt(value)} is above the 90th percentile of peers (median ${fmt(
        med,
      )}). ${highAdvice}`,
    }
  }
  if (lowNote && value < p10) {
    return { severity: 'good', text: `${label} of ${fmt(value)} ${lowNote} (peer median ${fmt(med)}).` }
  }
  return null
}

/** Per-field reality-check: where a single input sits vs the peer distribution. */
export type MetricKey =
  | 'cylRefillD'
  | 'cylRefillB'
  | 'psaPowerPerLpm'
  | 'hrSalary'
  | 'lmoRental'

// All these metrics are "lower is cheaper/better". `advice` is appended only
// when the value lands on the expensive end.
const METRIC_ADVICE: Record<MetricKey, string> = {
  cylRefillD: 'Worth renegotiating the supplier rate.',
  cylRefillB: 'Worth renegotiating the supplier rate.',
  psaPowerPerLpm: 'Check plant loading / efficiency.',
  hrSalary: 'Confirm this is the full oxygen-team cost.',
  lmoRental: 'Review the rental contract.',
}

/**
 * Actively assess where an input sits in the peer distribution — reports the
 * real percentile position and the range band (not a hardcoded threshold).
 * Returns null only when there is no value or the sample is too small.
 */
export function metricFlag(
  key: MetricKey,
  value: number,
  data: BenchmarkData = BENCHMARK,
  minN = 8,
): Flag | null {
  const arr = data.distributions[key]
  if (!arr || arr.length < minN || !Number.isFinite(value) || value <= 0) return null

  const n = arr.length
  const cheaperThan = Math.round((arr.filter((x) => x > value).length / n) * 100) // % of peers you beat
  const pricierThan = Math.round((arr.filter((x) => x < value).length / n) * 100) // % of peers above
  const rank = pricierThan // percentile position (% of peers below this value)

  let band: string
  let severity: Flag['severity']
  if (rank <= 10) {
    band = 'among the lowest'
    severity = 'good'
  } else if (rank <= 25) {
    band = 'below the typical range'
    severity = 'good'
  } else if (rank < 75) {
    band = 'in the typical range'
    severity = 'neutral'
  } else if (rank < 90) {
    band = 'above the typical range'
    severity = 'warn'
  } else {
    band = 'among the highest'
    severity = 'warn'
  }

  let text =
    rank < 50
      ? `Lower than ${cheaperThan}% of peers — ${band}.`
      : `Higher than ${pricierThan}% of peers — ${band}.`
  if (severity === 'warn') text += ` ${METRIC_ADVICE[key]}`
  return { severity, text }
}

/** Compare the user's key inputs against the peer distributions. */
export function inputFlags(m: UserMetrics, data: BenchmarkData = BENCHMARK): Flag[] {
  const d = data.distributions
  const flags: (Flag | null)[] = []

  flags.push(
    highLowFlag(
      'D-type cylinder refill',
      m.cylRefillD,
      d.cylRefillD,
      inr,
      'Worth renegotiating the supplier rate.',
      'is cheaper than ~90% of peers',
    ),
  )
  flags.push(
    highLowFlag(
      'B-type cylinder refill',
      m.cylRefillB,
      d.cylRefillB,
      inr,
      'Worth renegotiating the supplier rate.',
      'is cheaper than ~90% of peers',
    ),
  )
  flags.push(
    highLowFlag(
      'Technician / HR salary',
      m.hrSalary,
      d.hrSalary,
      (v) => `${inr(v)}/mo`,
      'Higher than most peers — confirm it is the full oxygen-team cost.',
    ),
  )
  for (const v of m.psaPowerPerLpm ?? []) {
    flags.push(
      highLowFlag(
        'PSA power per LPM',
        v,
        d.psaPowerPerLpm,
        (x) => `${x.toFixed(3)} kW/LPM`,
        'Above peers — check plant loading / efficiency.',
      ),
    )
  }
  for (const v of m.lmoRental ?? []) {
    flags.push(
      highLowFlag(
        'LMO tank rental',
        v,
        d.lmoRental,
        (x) => `${inr(x)}/mo`,
        'Above the typical ₹67,260 — review the rental contract.',
      ),
    )
  }
  return flags.filter((f): f is Flag => f != null)
}

// --- 4. Mix & reliability patterns ------------------------------------------

export interface BandMix {
  band: string
  counts: Record<BulkSource, number>
  n: number
}

const BANDS = ['<10', '10–29', '30–59', '60+']

/** Primary-source distribution by facility size, across the cohort. */
export function mixByBand(data: BenchmarkData = BENCHMARK): BandMix[] {
  return BANDS.map((band) => {
    const fs = data.facilities.filter((f) => f.bedBand === band && f.primary)
    const counts: Record<BulkSource, number> = { psa: 0, lmo: 0, cylinder: 0 }
    for (const f of fs) if (f.primary) counts[f.primary]++
    return { band, counts, n: fs.length }
  }).filter((b) => b.n > 0)
}

/** Facility-size group a given oxygen-bed count falls into. */
export function bandFor(oxBeds: number | null): string | null {
  if (!oxBeds || oxBeds <= 0) return null
  if (oxBeds < 10) return '<10'
  if (oxBeds < 30) return '10–29'
  if (oxBeds < 60) return '30–59'
  return '60+'
}

/** p25–p75 band for a named distribution, for empirical range hints. */
export function rangeFor(
  key: 'cylRefillD' | 'cylRefillB' | 'hrSalary' | 'lmoRental' | 'psaPowerPerLpm',
  data: BenchmarkData = BENCHMARK,
): { p25: number; p75: number; median: number; n: number } | null {
  const arr = data.distributions[key]
  if (!arr || arr.length < 8) return null
  return {
    p25: percentile(arr, 25),
    p75: percentile(arr, 75),
    median: percentile(arr, 50),
    n: arr.length,
  }
}
