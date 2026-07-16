// Shared output panel for both demand tabs: headline annual demand (MT + a
// cu m/Nm³/kg-toggleable equivalent), a 12-month seasonal profile chart, a
// contribution breakdown, and a "use this demand in the cost calculator" handoff.
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { DemandResult } from '../demand-engine'
import { MT_TO_CUM } from '../demand-engine'
import { CostUnitToggle } from '../components/results/CostUnitContext'
import { Collapsible } from '../components/shared/Collapsible'
import { costUnitName, cuMToVolume, formatNumber, type CostUnit } from '../utils/format'

interface Props {
  result: DemandResult
  /** Heading for the breakdown list ("By ward" / "By district"). */
  breakdownTitle: string
  /** Optional unit for the breakdown rows (e.g. "district"). */
  emptyHint: string
  /** Push the average monthly demand (cu m) into the facility cost calculator. */
  onUseDemand?: (cuMPerMonth: number) => void
  /** Full calculation breakdown (with clickable pills that jump to the inputs). */
  calc?: ReactNode
}

/** MT → the selected display unit (cu m / Nm³ / kg). */
function inUnit(mt: number, unit: CostUnit): number {
  return cuMToVolume(mt * MT_TO_CUM, unit)
}

export function DemandOutput({ result, breakdownTitle, emptyHint, onUseDemand, calc }: Props) {
  const [unit, setUnit] = useState<CostUnit>('cu_m')
  const un = costUnitName(unit)
  const has = result.annualMT > 0
  const peakIdx = result.byMonth.reduce((best, m, i, arr) => (m.mt > arr[best].mt ? i : best), 0)
  // MT with 1 decimal when small, whole numbers when large.
  const fmtMT = (v: number) => (v >= 100 ? formatNumber(Math.round(v)) : (Math.round(v * 10) / 10).toString())

  if (!has) {
    return (
      <div className="demand-empty">
        <span className="plain-summary-icon" aria-hidden>○</span>
        <div><strong>Your demand estimate will appear here.</strong>{' '}
          <span className="muted">{emptyHint}</span></div>
      </div>
    )
  }

  return (
    <div className="demand-output">
      <div className="cost-unit-row">
        <CostUnitToggle value={unit} onChange={setUnit} />
        <span className="small muted">Annual demand shown as MT and {un}.</span>
      </div>

      <div className="demand-headline">
        <div className="demand-hl-main">
          <span className="demand-hl-label">Annual oxygen demand</span>
          <span className="demand-hl-value">{fmtMT(result.annualMT)} <span className="demand-hl-unit">MT/yr</span></span>
          <span className="demand-hl-sub">≈ {formatNumber(Math.round(inUnit(result.annualMT, unit)))} {un}/yr</span>
        </div>
        <div className="demand-hl-side">
          <div><span className="demand-hl-label">Avg month</span><strong>{fmtMT(result.baseMonthlyMT)} MT</strong></div>
          <div><span className="demand-hl-label">Peak ({result.byMonth[peakIdx].label})</span><strong>{fmtMT(result.byMonth[peakIdx].mt)} MT</strong></div>
        </div>
      </div>

      {onUseDemand && (
        <button type="button" className="io-btn demand-use-btn" onClick={() => onUseDemand(result.baseMonthlyMT * MT_TO_CUM)}>
          ↳ Use this demand in the Facility cost calculator
        </button>
      )}

      <div className="demand-breakdown">
        <div className="demand-breakdown-title">{breakdownTitle}</div>
        {result.breakdown.slice(0, 12).map((b) => {
          const pct = result.annualMT > 0 ? (b.annualMT / result.annualMT) * 100 : 0
          return (
            <div className="demand-brk-row" key={b.key}>
              <span className="demand-brk-label">{b.label}</span>
              <span className="demand-brk-bar"><span style={{ width: `${Math.min(100, pct)}%` }} /></span>
              <span className="demand-brk-val">{formatNumber(Math.round(inUnit(b.annualMT, unit)))} {un}</span>
            </div>
          )
        })}
      </div>

      {calc && (
        <Collapsible className="subpanel" defaultOpen summary="Full calculation — click any pill to edit its input">
          {calc}
        </Collapsible>
      )}
    </div>
  )
}
