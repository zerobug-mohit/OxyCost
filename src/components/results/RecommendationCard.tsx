// Visual, scannable recommendation from the cost analysis (spec section 9b).
// Headline pick + three cost facts + the priority/fallback order, then the
// supply banner and any short caveats — driven by the engine's recoSummary.
import type { ComparisonResult, RecoFact } from '../../engine'
import { instanceColor } from '../shared/sourceColors'
import { formatNumber, formatRate, protectUnits } from '../../utils/format'
import { InfoBanner } from '../shared/InfoBanner'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  result: ComparisonResult
}

/** Plain-language meaning of each headline cost fact. */
const FACT_HELP: Record<RecoFact['key'], { effect: string }> = {
  all_in: {
    effect:
      'Lowest total cost per cu m including capital — equipment depreciation (if owned) or rental (if rented). The best choice when you are acquiring a source or accounting for its full cost.',
  },
  opex: {
    effect:
      'Lowest day-to-day running cost per cu m, excluding capital. The best choice when you already own the equipment and just want the cheapest to operate.',
  },
  incremental: {
    effect:
      'Lowest cost for each additional cu m (only the costs that rise with volume). Lean on this source for the next unit of oxygen before starting a costlier one.',
  },
}

/** Per-instance colour from a SourceResult id like "lmo-0". */
function colorForId(source: RecoFact['source'], id: string): string {
  const idx = Number(id.split('-')[1])
  return instanceColor(source, Number.isFinite(idx) ? idx : 0)
}

export function RecommendationCard({ result }: Props) {
  const gap = result.supply_gap_cu_m
  const { pick, facts, priority, caveats, sharedPerCuM, allInWithShared } =
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
                <span className="reco-fact-label">
                  {f.label}
                  <Tooltip text={FACT_HELP[f.key].effect} />
                </span>
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
              <span className="reco-section-label">
                If one source must meet all demand
                <Tooltip
                  text="Ranks your sources by the cost for a single source to cover the whole demand on its own — cheapest first."
                  effect="Use it as a fallback plan: rely on the first source; if it is unavailable (breakdown, supply disruption), switch to the next. A source tagged 'covers X%' can supply only part of the demand alone."
                />
              </span>
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
                Rely on the 1st source to meet your demand; if it is unavailable
                (breakdown, supply disruption), fall back to the next.
                {priority.some((p) => !p.meetsDemand) &&
                  ' A "covers X%" tag means that source alone can supply only part of your demand.'}
              </span>
            </div>
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
