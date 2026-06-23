// Plain-language recommendation that synthesizes the cost analysis with peer
// benchmarking (spec section 9b). Cost-derived and benchmark-derived points are
// shown as clearly separated groups, followed by a combined bottom line.
import type { ComparisonResult } from '../../engine'
import type { BenchmarkInsights } from '../../insights/recommend'
import { formatNumber, protectUnits } from '../../utils/format'
import { InfoBanner } from '../shared/InfoBanner'

interface Props {
  result: ComparisonResult
  benchmark?: BenchmarkInsights
}

export function RecommendationCard({ result, benchmark }: Props) {
  const gap = result.supply_gap_cu_m
  const hasBenchmark = !!benchmark && benchmark.points.length > 0

  return (
    <>
      <p className="rec-lead">{protectUnits(result.recommendation)}</p>

      {result.recommendationPoints.length > 0 && (
        <div className="rec-group">
          <span className="rec-group-label">From the cost analysis</span>
          <ul className="rec-points">
            {result.recommendationPoints.map((p, i) => (
              <li key={i}>{protectUnits(p)}</li>
            ))}
          </ul>
        </div>
      )}

      {hasBenchmark && (
        <div className="rec-group">
          <span className="rec-group-label benchmark">From peer benchmarking</span>
          <ul className="rec-points">
            {benchmark!.points.map((p, i) => (
              <li key={i}>{protectUnits(p)}</li>
            ))}
          </ul>
        </div>
      )}

      {benchmark?.synthesis && (
        <p className="rec-synthesis">
          <span className="rec-bottom-label">Bottom line</span>{' '}
          {protectUnits(benchmark.synthesis)}
        </p>
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
