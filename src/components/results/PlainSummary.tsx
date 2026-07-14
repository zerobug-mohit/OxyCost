// Plain-language "what this means for you" banner at the top of the Output
// column. One or two friendly sentences — the overall cheapest source and where
// to look for the full comparison — before the detailed tables and charts.
// Written for a non-technical facility user who just wants the bottom line.
import type { ComparisonResult } from '../../engine'
import type { RecoConfig } from './ScenarioRecommendation'
import { costUnitName, formatNumber, formatRate } from '../../utils/format'
import { useCostUnit } from './CostUnitContext'

interface Props {
  result: ComparisonResult
  showResults: boolean
  /** Current inputs + any saved scenarios, to find the overall best source. */
  configs: RecoConfig[]
  /** What the user still needs to do (shown while results are locked). */
  lockedPrompt: React.ReactNode
}

/** Cheapest all-in source across every config (current inputs + scenarios). */
function overallBest(configs: RecoConfig[]) {
  let best: { configLabel: string; label: string; val: number } | null = null
  for (const c of configs) {
    for (const p of c.perSource) {
      const v = p.capex_opex
      if (v != null && Number.isFinite(v) && (best == null || v < best.val)) {
        best = { configLabel: c.label, label: p.label, val: v }
      }
    }
  }
  return best
}

export function PlainSummary({ result, showResults, configs, lockedPrompt }: Props) {
  const unit = useCostUnit()
  if (!showResults) {
    return (
      <div className="plain-summary pending">
        <span className="plain-summary-icon" aria-hidden>
          ○
        </span>
        <div>
          <strong>Your cost summary will appear here.</strong>{' '}
          <span className="muted">Finish the steps on the left — {lockedPrompt}</span>
        </div>
      </div>
    )
  }

  const best = overallBest(configs)
  const hasScenarios = configs.length > 1
  const gap = result.supply_gap_cu_m

  return (
    <div className="plain-summary ready">
      <span className="plain-summary-icon" aria-hidden>
        ✓
      </span>
      <div>
        {best ? (
          <>
            <strong>What this means for you:</strong> the cheapest way to supply oxygen
            (per {costUnitName(unit)}) is <strong>{best.label}</strong> at{' '}
            <strong>{formatRate(best.val, unit)}</strong>
            {hasScenarios ? (
              <>
                {' '}
                — the lowest across your current inputs and {configs.length - 1} saved scenario
                {configs.length - 1 === 1 ? '' : 's'} (in <strong>{best.configLabel}</strong>).{' '}
                <span className="muted">
                  See the <strong>Cost summary</strong> section below for the running-cost
                  and marginal-cost comparison across every scenario.
                </span>
              </>
            ) : (
              <>
                {' '}
                for your demand of {formatNumber(result.demand_cu_m)} cu m/month.{' '}
                <span className="muted">
                  See the <strong>Cost summary</strong> section below for the full
                  breakdown — and save scenarios to compare options side by side.
                </span>
              </>
            )}
          </>
        ) : (
          <span>Add a source that produces oxygen to see a cost summary.</span>
        )}
        {gap > 0 && (
          <div className="plain-summary-warn">
            ⚠ Your current sources fall short of demand by {formatNumber(gap)} cu m/month —
            add or resize a source on the left.
          </div>
        )}
      </div>
    </div>
  )
}
