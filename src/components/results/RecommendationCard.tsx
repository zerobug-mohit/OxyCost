// Visual, scannable recommendation from the cost analysis (spec section 9b).
// Headline pick + three cost facts + the priority/fallback order, then the
// supply banner and any short caveats — driven by the engine's recoSummary.
import type { ComparisonResult, RecoFact } from '../../engine'
import { instanceColor } from '../shared/sourceColors'
import { costUnitName, cuMToVolume, formatNumber, formatRate, protectUnits } from '../../utils/format'
import { InfoBanner } from '../shared/InfoBanner'
import { Tooltip } from '../shared/Tooltip'
import { useCostUnit } from './CostUnitContext'

interface Props {
  result: ComparisonResult
}

/** Plain-language meaning of each headline cost fact. */
const FACT_HELP: Record<RecoFact['key'], { effect: string }> = {
  all_in: {
    effect:
      'Lowest total cost per unit including capital — equipment depreciation (if owned) or rental (if rented). Most relevant when acquiring a source or accounting for its full cost.',
  },
  opex: {
    effect:
      'Lowest day-to-day running cost per unit, excluding capital. Most relevant when the equipment is already owned and only the running cost matters.',
  },
  incremental: {
    effect:
      'Lowest cost for each additional unit (only the costs that rise with volume) — the least added cost for the next unit of oxygen.',
  },
}

/** Per-instance colour from a SourceResult id like "lmo-0". */
function colorForId(source: RecoFact['source'], id: string): string {
  const idx = Number(id.split('-')[1])
  return instanceColor(source, Number.isFinite(idx) ? idx : 0)
}

export function RecommendationCard({ result }: Props) {
  const unit = useCostUnit()
  const rate = (v: number) => formatRate(v, unit)
  const vol = (v: number) => formatNumber(cuMToVolume(v, unit))
  const un = costUnitName(unit)
  const gap = result.supply_gap_cu_m
  const { pick, facts, priority, caveats, sharedPerCuM, allInWithShared } =
    result.recoSummary

  return (
    <div className="reco">
      {pick ? (
        <>
          <div className="reco-pick">
            <span className="reco-pick-tag">Lowest cost</span>
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
            <span className="reco-pick-cost">{rate(pick.value)}</span>
            <span className="reco-pick-basis">capital + running</span>
          </div>
          {sharedPerCuM > 0 && allInWithShared != null && (
            <p className="reco-pick-sub">
              + {rate(sharedPerCuM)} shared overhead ={' '}
              <strong>{rate(allInWithShared)}</strong> including shared overhead.
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
                <span className="reco-fact-value">{rate(f.value)}</span>
              </div>
            ))}
          </div>

          {priority.length >= 2 && (
            <div className="reco-priority">
              <span className="reco-section-label">
                If one source must meet all demand
                <Tooltip
                  text="Ranks your sources by the cost for a single source to cover the whole demand on its own — cheapest first."
                  effect="Useful when thinking about resilience: the 1st is the lowest-cost single source that can meet demand; the others follow by cost if one is unavailable (breakdown, supply disruption). A source tagged 'covers X%' can supply only part of the demand alone."
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
                          <span className="reco-prio-cost"> {rate(p.cost)}</span>
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
                The 1st is the lowest-cost single source that can meet your demand; the
                others follow in cost order.
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
              Capacity {vol(result.total_capacity_cu_m)} {un} vs demand{' '}
              {vol(result.demand_cu_m)} {un} — short by{' '}
              <strong>{vol(gap)} {un}/month</strong>.
            </span>
          </InfoBanner>
        ) : -gap > Math.max(5, result.demand_cu_m * 0.005) ? (
          <InfoBanner kind="warn" title="Sources exceed demand ">
            <span>
              {' '}
              Capacity {vol(result.total_capacity_cu_m)} {un} vs demand{' '}
              {vol(result.demand_cu_m)} {un} — <strong>
                {vol(-gap)} {un}/month
              </strong>{' '}
              spare. The per-unit comparison below is unaffected, but to cost the oxygen
              you actually use, right-size a source or raise demand in Step 1.
            </span>
          </InfoBanner>
        ) : (
          result.demand_cu_m > 0 &&
          pick && (
            <InfoBanner kind="info" title="Capacity ">
              <span>
                {' '}
                Selected sources can deliver {vol(result.total_capacity_cu_m)} {un}/month,
                meeting demand of {vol(result.demand_cu_m)} {un}.
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
