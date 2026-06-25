// Visual, scannable recommendation from the cost analysis (spec section 9b).
// Headline pick + three cost facts + the priority/fallback order, then the
// supply banner and any short caveats — driven by the engine's recoSummary.
import type { ComparisonResult, RecoFact } from '../../engine'
import { instanceColor } from '../shared/sourceColors'
import { formatNumber, formatRate, protectUnits } from '../../utils/format'
import { InfoBanner } from '../shared/InfoBanner'

interface Props {
  result: ComparisonResult
}

/** Per-instance colour from a SourceResult id like "lmo-0". */
function colorForId(source: RecoFact['source'], id: string): string {
  const idx = Number(id.split('-')[1])
  return instanceColor(source, Number.isFinite(idx) ? idx : 0)
}

export function RecommendationCard({ result }: Props) {
  const gap = result.supply_gap_cu_m
  const { pick, facts, priority, mix, blendedMarginal, caveats, sharedPerCuM, allInWithShared } =
    result.recoSummary

  return (
    <div className="reco">
      {pick ? (
        <>
          <div className="reco-pick">
            <span className="reco-pick-tag">Recommended</span>
            <span
              className="reco-pick-name"
              style={{ color: colorForId(pick.source, pick.id) }}
            >
              <span
                className="src-dot"
                style={{ background: colorForId(pick.source, pick.id) }}
              />
              {pick.sourceLabel}
            </span>
            <span className="reco-pick-cost">{formatRate(pick.value)}</span>
            <span className="reco-pick-basis">all-in</span>
          </div>
          {sharedPerCuM > 0 && allInWithShared != null && (
            <p className="reco-pick-sub">
              + {formatRate(sharedPerCuM)} shared overhead ={' '}
              <strong>{formatRate(allInWithShared)}</strong> all-in per cu m.
            </p>
          )}

          <div className="reco-facts">
            {facts.map((f) => (
              <div className="reco-fact" key={f.key}>
                <span className="reco-fact-label">{f.label}</span>
                <span className="reco-fact-source">
                  <span
                    className="src-dot"
                    style={{ background: colorForId(f.source, f.id) }}
                  />
                  {f.sourceLabel}
                </span>
                <span className="reco-fact-value">{formatRate(f.value)}</span>
              </div>
            ))}
          </div>

          {priority.length >= 2 && (
            <div className="reco-priority">
              <span className="reco-section-label">Priority to meet demand</span>
              <div className="reco-prio-list">
                {priority.map((p, i) => {
                  const color = instanceColor(p.source, p.index)
                  const pct = Number.isFinite(p.capacity)
                    ? Math.round((p.capacity / result.demand_cu_m) * 100)
                    : null
                  return (
                    <span className="reco-prio-item" key={p.id}>
                      {i > 0 && <span className="reco-prio-arrow">›</span>}
                      <span
                        className={`reco-badge${p.meetsDemand ? '' : ' partial'}`}
                        style={
                          p.meetsDemand
                            ? { background: color, borderColor: color, color: '#fff' }
                            : { color, borderColor: color }
                        }
                      >
                        {p.rank}
                      </span>
                      <span className="reco-prio-text">
                        {p.label}
                        {p.meetsDemand ? (
                          <span className="reco-prio-cost"> {formatRate(p.cost)}</span>
                        ) : (
                          <span className="reco-prio-cost partial">
                            {' '}
                            covers {pct}%
                          </span>
                        )}
                      </span>
                    </span>
                  )
                })}
              </div>
              <span className="reco-priority-hint">
                First choice → fall back down the list if a source is unavailable.
              </span>
            </div>
          )}

          {mix.length > 1 && (
            <p className="reco-mix">
              <span className="reco-section-label">Least-cost mix</span>{' '}
              {mix.map((m, i) => (
                <span key={i}>
                  {i > 0 && ' + '}
                  {formatNumber(m.cuM)} cu m {m.label}
                </span>
              ))}
              {blendedMarginal != null && (
                <span className="muted"> ≈ {formatRate(blendedMarginal)} blended</span>
              )}
            </p>
          )}
        </>
      ) : (
        <p className="rec-lead">{protectUnits(result.recommendation)}</p>
      )}

      <div style={{ marginTop: 12 }}>
        {gap > 0 ? (
          <InfoBanner kind="danger" title="Supply gap ">
            <span>
              {' '}
              Capacity {formatNumber(result.total_capacity_cu_m)} cu m vs demand{' '}
              {formatNumber(result.demand_cu_m)} cu m — short by{' '}
              <strong>{formatNumber(gap)} cu m/month</strong>.
            </span>
          </InfoBanner>
        ) : (
          result.demand_cu_m > 0 &&
          pick && (
            <InfoBanner kind="info" title="Capacity ">
              <span>
                {' '}
                Selected sources can deliver {formatNumber(result.total_capacity_cu_m)} cu
                m/month, meeting demand of {formatNumber(result.demand_cu_m)} cu m.
              </span>
            </InfoBanner>
          )
        )}
      </div>

      {caveats.length > 0 && (
        <ul className="reco-caveats">
          {caveats.map((c, i) => (
            <li key={i}>{protectUnits(c)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
