// Shared output panel for both the cost tool's demand tray and the district
// demand tab: headline annual demand in the selected cu m/Nm³/kg unit (MT as a
// reference), a contribution breakdown, and an optional "use this demand in the
// cost calculator" handoff. Every volume honours the chosen display unit.
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { BreakdownItem, DemandResult } from '../demand-engine'
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

/**
 * Recursive breakdown row. Districts drill down into strata (facility type ×
 * band), which drill down into individual facilities. Each level's bar is sized
 * relative to its parent; leaves render as plain rows.
 */
function renderNode(
  node: BreakdownItem,
  parentMT: number,
  depth: number,
  perYr: boolean,
  perLabel: string,
  fmtU: (mt: number) => string,
): ReactNode {
  const pct = parentMT > 0 ? (node.annualMT / parentMT) * 100 : 0
  const bar = <span className="demand-brk-bar"><span style={{ width: `${Math.min(100, pct)}%` }} /></span>
  const val = <span className="demand-brk-val">{fmtU(perYr ? node.annualMT : node.annualMT / 12)} {perLabel}</span>
  const countTag = node.count ? <span className="demand-brk-count"> · {node.count} fac.</span> : null
  const childCls = depth > 0 ? ' demand-brk-child' : ''
  const kids = node.children
  if (kids && kids.length > 0) {
    return (
      <details className="demand-brk-group" key={node.key}>
        <summary className={`demand-brk-row demand-brk-summary${childCls}`}>
          <span className="demand-brk-label">
            <span className="demand-brk-caret" aria-hidden>▸</span>
            {node.label}{countTag}
          </span>
          {bar}
          {val}
        </summary>
        <div className="demand-brk-children">
          {kids.map((c) => renderNode(c, node.annualMT, depth + 1, perYr, perLabel, fmtU))}
        </div>
      </details>
    )
  }
  return (
    <div className={`demand-brk-row${childCls}`} key={node.key}>
      <span className="demand-brk-label">{node.label}{countTag}</span>
      {bar}
      {val}
    </div>
  )
}

export function DemandOutput({ result, breakdownTitle, emptyHint, onUseDemand, calc, unit: controlledUnit, hideToggle }: Props) {
  const [localUnit, setLocalUnit] = useState<CostUnit>('cu_m')
  const unit = controlledUnit ?? localUnit
  const un = costUnitName(unit)
  // Breakdown period: show each row's demand per year or per (average) month.
  const [period, setPeriod] = useState<'year' | 'month'>('year')
  const perYr = period === 'year'
  const perLabel = `${un}/${perYr ? 'yr' : 'mo'}`
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
          <span className="demand-hl-sub">≈ {fmtU(result.baseMonthlyMT)} {un}/mo · {fmtMT(result.baseMonthlyMT)} MT/mo (avg)</span>
        </div>
        <div className="demand-hl-side">
          <div><span className="demand-hl-label">Peak ({result.byMonth[peakIdx].label})</span><strong>{fmtU(result.byMonth[peakIdx].mt)} {un}/mo</strong></div>
        </div>
      </div>

      {onUseDemand && (
        <button type="button" className="io-btn demand-use-btn" onClick={() => onUseDemand(result.baseMonthlyMT * MT_TO_CUM)}>
          ↳ Use this demand in the Facility cost calculator
        </button>
      )}

      <div className="demand-breakdown">
        <div className="demand-breakdown-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>
            {breakdownTitle}{' '}
            <span className="small muted" style={{ fontWeight: 400 }}>· {perYr ? 'annual' : 'monthly (avg)'} demand ({perLabel})</span>
          </span>
          <span className="scenario-toggle" role="group" aria-label="Show demand per" style={{ marginLeft: 'auto' }}>
            <button type="button" className={!perYr ? 'active' : ''} onClick={() => setPeriod('month')}>Monthly</button>
            <button type="button" className={perYr ? 'active' : ''} onClick={() => setPeriod('year')}>Annual</button>
          </span>
        </div>
        {result.breakdown.slice(0, 12).map((b) => renderNode(b, result.annualMT, 0, perYr, perLabel, fmtU))}
      </div>

      {calc && (
        <Collapsible className="subpanel" defaultOpen summary="Full calculation — click any pill to edit its input">
          {calc}
        </Collapsible>
      )}
    </div>
  )
}
