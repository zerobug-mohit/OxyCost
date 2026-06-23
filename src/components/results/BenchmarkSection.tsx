// "Benchmarks" — leverages the anonymized WJCF facility knowledge base to show,
// alongside the cost results: peer facilities like yours, how your inputs compare,
// where your cost sits vs peers, and what facilities your size actually do.
// Appended to the Results step, visually distinct. Pure-data driven (src/insights).
import {
  BENCHMARK,
  bandFor,
  costPercentile,
  findPeers,
  inputFlags,
  mixByBand,
  summarizePeers,
} from '../../insights/benchmark'
import { buildProfile, buildMetrics } from '../../insights/profile'
import type { BulkSource, PeerFacility } from '../../insights/types'
import type { AppState } from '../../state'
import type { ComparisonResult } from '../../engine'
import { SOURCE_COLOR } from '../shared/sourceColors'
import { formatINR } from '../../utils/format'

interface Props {
  state: AppState
  result: ComparisonResult
  demand: number
}

const SRC_LABEL: Record<BulkSource, string> = {
  psa: 'PSA',
  lmo: 'LMO',
  cylinder: 'Cylinders',
}

function descriptor(f: PeerFacility): string {
  const type = f.facilityType && f.facilityType !== 'Facility' ? f.facilityType : 'Facility'
  const band = f.bedBand ? `${f.bedBand} O₂ beds` : 'size n/a'
  return `${type} · ${band} · ${f.state}`
}

export function BenchmarkSection({ state, result, demand }: Props) {
  // Build the user profile and metrics from current inputs (shared with the
  // recommendation synthesis so the two never diverge).
  const profile = buildProfile(state, demand)
  const peers = findPeers(profile, BENCHMARK, 5)
  const summary = summarizePeers(peers)
  const flags = inputFlags(buildMetrics(state), BENCHMARK)

  // Cost percentile: cheapest producing instance of each bulk source.
  const bestByType = (type: BulkSource): number | null => {
    const vals = result.sources
      .filter((s) => s.source === type && s.monthly_output_cu_m > 0)
      .map((s) => s.per_cu_m_capex_opex)
      .filter((v) => Number.isFinite(v))
    return vals.length ? Math.min(...vals) : null
  }
  const percentiles = (['cylinder', 'lmo', 'psa'] as BulkSource[])
    .map((src) => {
      const v = bestByType(src)
      if (v == null) return null
      const p = costPercentile(src, v, BENCHMARK)
      return p ? { src, value: v, ...p } : null
    })
    .filter((x): x is NonNullable<typeof x> => x != null)

  const bands = mixByBand(BENCHMARK)
  const userBand = bandFor(state.oxBeds > 0 ? state.oxBeds : null)
  const reliability = BENCHMARK.meta.psaPlants

  return (
    <div className="benchmark-body">
      {/* 1. Peer matching ----------------------------------------------------*/}
      <h3 className="bm-sub">Facilities like yours</h3>
      {peers.length === 0 ? (
        <p className="muted small">No comparable facilities found for the current inputs.</p>
      ) : (
        <>
          {summary.mostCommon && (
            <p className="bm-headline">
              {summary.count} of your {summary.total} closest peers use{' '}
              <strong>{SRC_LABEL[summary.mostCommon]}</strong> as their primary source
              {summary.medianCost != null && (
                <>
                  {' '}
                  (median {formatINR(summary.medianCost)}/cu m across {summary.costN} with cost
                  data)
                </>
              )}
              .
            </p>
          )}
          <div className="peer-grid">
            {peers.map((p) => (
              <div key={p.facility.id} className="peer-card">
                <div className="peer-top">
                  <span className="peer-sim">{p.similarity}% match</span>
                  {p.facility.primary && (
                    <span
                      className="peer-primary"
                      style={{ background: SOURCE_COLOR[p.facility.primary] }}
                    >
                      {SRC_LABEL[p.facility.primary]} primary
                    </span>
                  )}
                </div>
                <div className="peer-desc">{descriptor(p.facility)}</div>
                <div className="peer-mix">
                  {(['psa', 'lmo', 'cylinder', 'oc'] as const)
                    .filter((s) => p.facility.sources[s])
                    .map((s) => (
                      <span key={s} className="peer-tag">
                        {s === 'oc' ? 'OC' : SRC_LABEL[s as BulkSource]}
                      </span>
                    ))}
                </div>
                {p.facility.primary && p.facility.perCuM[p.facility.primary] != null && (
                  <div className="peer-cost">
                    ~{formatINR(p.facility.perCuM[p.facility.primary] as number)}/cu m
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 2. Input reality-check flags ---------------------------------------*/}
      <h3 className="bm-sub">How your inputs compare</h3>
      {flags.length === 0 ? (
        <p className="muted small">
          Your inputs are within the typical peer range — nothing unusual flagged.
        </p>
      ) : (
        <ul className="flag-list">
          {flags.map((f, i) => (
            <li key={i} className={`flag ${f.severity}`}>
              <span className="flag-dot" /> {f.text}
            </li>
          ))}
        </ul>
      )}

      {/* 3. Cost percentile -------------------------------------------------*/}
      {percentiles.length > 0 && (
        <>
          <h3 className="bm-sub">Where your cost stands</h3>
          {percentiles.map((p) => (
            <div key={p.src} className="pct-row">
              <div className="pct-label">
                {SRC_LABEL[p.src]} at {formatINR(p.value)}/cu m
              </div>
              <div className="pct-bar">
                <span style={{ width: `${p.betterThanPct}%`, background: SOURCE_COLOR[p.src] }} />
              </div>
              <div className="pct-note">
                cheaper than <strong>{p.betterThanPct}%</strong> of {p.n} peers (median{' '}
                {formatINR(p.median)})
              </div>
            </div>
          ))}
          <p className="muted small" style={{ marginTop: 4 }}>
            Peer costs are actual reported spend ÷ delivered volume. PSA per-cu-m was not
            captured in the survey, so it is omitted here.
          </p>
        </>
      )}

      {/* 4. Mix & reliability patterns --------------------------------------*/}
      <h3 className="bm-sub">What facilities your size do</h3>
      <div className="band-table">
        {bands.map((b) => {
          const top = (['cylinder', 'psa', 'lmo'] as BulkSource[]).reduce((best, s) =>
            b.counts[s] > b.counts[best] ? s : best,
          'cylinder' as BulkSource)
          return (
            <div key={b.band} className={`band-row ${b.band === userBand ? 'band-you' : ''}`}>
              <span className="band-name">
                {b.band} beds {b.band === userBand && <em>(you)</em>}
              </span>
              <span className="band-bars">
                {(['psa', 'lmo', 'cylinder'] as BulkSource[]).map((s) =>
                  b.counts[s] > 0 ? (
                    <span
                      key={s}
                      className="band-seg"
                      style={{ flexGrow: b.counts[s], background: SOURCE_COLOR[s] }}
                      title={`${SRC_LABEL[s]}: ${b.counts[s]}`}
                    />
                  ) : null,
                )}
              </span>
              <span className="band-note">
                mostly {SRC_LABEL[top]} ({b.n})
              </span>
            </div>
          )
        })}
      </div>
      <p className="bm-reliability">
        <strong>Reliability:</strong> {reliability.nonFunctionalPct}% of the{' '}
        {reliability.total} PSA plants surveyed were non-functional at the time of the
        assessment — budget cylinder (or LMO) backup so a single plant outage cannot halt
        supply.
      </p>

      <p className="source-note" style={{ marginTop: 14 }}>
        Based on the {BENCHMARK.meta.cohortLabel} ({BENCHMARK.meta.period}). Facilities are
        anonymized to type · bed-band · state. Benchmarks are contextual guidance, not a
        substitute for local quotations.
      </p>
    </div>
  )
}
