// Plain-language recommendation from the cost analysis (spec section 9b).
import type { ComparisonResult } from '../../engine'
import { formatNumber, protectUnits } from '../../utils/format'
import { InfoBanner } from '../shared/InfoBanner'

interface Props {
  result: ComparisonResult
}

export function RecommendationCard({ result }: Props) {
  const gap = result.supply_gap_cu_m

  return (
    <>
      <p className="rec-lead">{protectUnits(result.recommendation)}</p>

      {result.recommendationPoints.length > 0 && (
        <ul className="rec-points">
          {result.recommendationPoints.map((p, i) => (
            <li key={i}>{protectUnits(p)}</li>
          ))}
        </ul>
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
          result.demand_cu_m > 0 && (
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
    </>
  )
}
