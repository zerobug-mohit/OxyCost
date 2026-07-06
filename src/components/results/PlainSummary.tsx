// Plain-language "what this means for you" banner at the top of the Output
// column. One or two friendly sentences — the recommendation and the next
// action — before the detailed tables and charts. Written for a non-technical
// facility user who just wants the bottom line.
import type { ComparisonResult } from '../../engine'
import { formatNumber, formatRate } from '../../utils/format'

interface Props {
  result: ComparisonResult
  showResults: boolean
  /** What the user still needs to do (shown while results are locked). */
  lockedPrompt: React.ReactNode
}

export function PlainSummary({ result, showResults, lockedPrompt }: Props) {
  if (!showResults) {
    return (
      <div className="plain-summary pending">
        <span className="plain-summary-icon" aria-hidden>
          ○
        </span>
        <div>
          <strong>Your recommendation will appear here.</strong>{' '}
          <span className="muted">Finish the steps on the left — {lockedPrompt}</span>
        </div>
      </div>
    )
  }

  // Cheapest and next-cheapest producing sources, on the all-in (capex+opex) view.
  const producing = result.ranking_capex_opex.filter((r) =>
    result.sources.some(
      (s) => s.id === r.id && s.monthly_output_cu_m > 0 && Number.isFinite(r.value),
    ),
  )
  const first = producing[0]
  const second = producing[1]
  const labelOf = (id: string) => result.sources.find((s) => s.id === id)?.label ?? id
  const pctLess =
    first && second && second.value > 0
      ? Math.round((1 - first.value / second.value) * 100)
      : null

  const gap = result.supply_gap_cu_m

  return (
    <div className="plain-summary ready">
      <span className="plain-summary-icon" aria-hidden>
        ✓
      </span>
      <div>
        {first ? (
          <>
            <strong>What this means for you:</strong> for your demand of{' '}
            {formatNumber(result.demand_cu_m)} cu m/month, the cheapest all-in option is{' '}
            <strong>{labelOf(first.id)}</strong> at <strong>{formatRate(first.value)}</strong>
            {second && pctLess != null && pctLess > 0 ? (
              <>
                {' '}
                — about <strong>{pctLess}% cheaper</strong> than the next option (
                {labelOf(second.id)}).
              </>
            ) : (
              '.'
            )}{' '}
            <span className="muted">
              The recommendation and full comparison are below.
            </span>
          </>
        ) : (
          <span>Add a source that produces oxygen to see a recommendation.</span>
        )}
        {gap > 0 && (
          <div className="plain-summary-warn">
            ⚠ Your sources fall short of demand by {formatNumber(gap)} cu m/month — add or
            resize a source on the left.
          </div>
        )}
      </div>
    </div>
  )
}
