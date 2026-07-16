// Shared output panel for both the cost tool's demand tray and the district
// demand tab: headline annual demand in the selected cu m/Nm³/kg unit (MT as a
// reference), a contribution breakdown, and an optional "use this demand in the
// cost calculator" handoff. Every volume honours the chosen display unit.
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
  /** Controlled display unit (when a parent owns the toggle). */
  unit?: CostUnit
  /** Hide the built-in toggle row (the parent renders one). */
  hideToggle?: boolean
}

/** MT → the selected display unit (cu m / Nm³ / kg). */
function inUnit(mt: number, unit: CostUnit): number {
  return cuMToVolume(mt * MT_TO_CUM, unit)
}

export function DemandOutput({ result, breakdownTitle, emptyHint, onUseDemand, calc, unit: controlledUnit, hideToggle }: Props) {
  const [localUnit, setLocalUnit] = useState<CostUnit>('cu_m')
  const unit = controlledUnit ?? localUnit
  const un = costUnitName(unit)
  const has = result.annualMT > 0
  const peakIdx = result.byMonth.reduce((best, m, i, arr) => (m.mt > arr[best].mt ? i : best), 0)
  // MT with 1 decimal when small, whole numbers when large.
  const fmtMT = (v: number) => (v >= 100 ? formatNumber(Math.round(v)) : (Math.round(v * 10) / 10).toString())
  const fmtU = (mt: number) => formatNumber(Math.round(inUnit(mt, unit)))

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
      {!hideToggle && (
        <div className="cost-unit-row">
          <CostUnitToggle value={unit} onChange={setLocalUnit} label="Show demand in" />
          <span className="small muted">Demand shown in {un} · MT for reference.</span>
        </div>
      )}

      <div className="demand-headline">
        <div className="demand-hl-main">
          <span className="demand-hl-label">Annual oxygen demand</span>
          <span className="demand-hl-value">{fmtU(result.annualMT)} <span className="demand-hl-unit">{un}/yr</span></span>
          <span className="demand-hl-sub">≈ {fmtMT(result.annualMT)} MT/yr</span>
        </div>
        <div className="demand-hl-side">
          <div><span className="demand-hl-label">Avg month</span><strong>{fmtU(result.baseMonthlyMT)} {un}</strong></div>
          <div><span className="demand-hl-label">Peak ({result.byMonth[peakIdx].label})</span><strong>{fmtU(result.byMonth[peakIdx].mt)} {un}</strong></div>
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
              <span className="demand-brk-val">{fmtU(b.annualMT)} {un}</span>
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
