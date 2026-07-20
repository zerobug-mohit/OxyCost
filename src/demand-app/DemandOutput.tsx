// Shared output panel for both the cost tool's demand tray and the district
// demand tab: headline annual demand in the selected cu m/D-type-cyl/kg unit (MT as a
// reference), a contribution breakdown, and an optional "use this demand in the
// cost calculator" handoff. Every volume honours the chosen display unit.
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { BreakdownItem, DemandResult } from '../demand-engine'
import { MT_TO_CUM } from '../demand-engine'
import { CostUnitToggle } from '../components/results/CostUnitContext'
import { Collapsible } from '../components/shared/Collapsible'
import { NumberInput } from '../components/shared/NumberInput'
import { costUnitName, cuMToVolume, formatNumber, volumeToCuM, type CostUnit } from '../utils/format'

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
  /** Make every breakdown value editable (yellow pills); edits roll up. */
  editable?: boolean
  /** Current overrides (annual MT, keyed by breakdown node key). */
  overrides?: Record<string, number>
  /** Set an override for a node (annual MT). */
  onEdit?: (key: string, annualMT: number) => void
  /** Clear a node's override. */
  onReset?: (key: string) => void
}

/** Shared render context for the recursive breakdown rows. */
interface BrkCtx {
  perYr: boolean
  perLabel: string
  unit: CostUnit
  fmtU: (mt: number) => string
  editable: boolean
  overrides: Record<string, number>
  onEdit?: (key: string, annualMT: number) => void
  onReset?: (key: string) => void
}

/** MT → the selected display unit (cu m / D-type cyl / kg). */
function inUnit(mt: number, unit: CostUnit): number {
  return cuMToVolume(mt * MT_TO_CUM, unit)
}

/**
 * Recursive breakdown row. Districts drill down into strata (facility type ×
 * band), which drill down into individual facilities. Each level's bar is sized
 * relative to its parent. When editable, every value is a NumberInput whose edit
 * becomes an override (annual MT); an override on a node dims its descendants
 * (the override replaces their roll-up). `dimmed` = an ancestor is overridden.
 */
function renderNode(node: BreakdownItem, parentMT: number, depth: number, ctx: BrkCtx, dimmed: boolean): ReactNode {
  const { perYr, perLabel, unit, fmtU, editable, overrides, onEdit, onReset } = ctx
  const pct = parentMT > 0 ? (node.annualMT / parentMT) * 100 : 0
  const overridden = Object.prototype.hasOwnProperty.call(overrides, node.key)
  const displayVal = Math.round(inUnit(perYr ? node.annualMT : node.annualMT / 12, unit))
  const commit = (v: number) => {
    const annualInUnit = perYr ? v : v * 12
    const annualMT = volumeToCuM(annualInUnit, unit) / MT_TO_CUM
    onEdit?.(node.key, annualMT)
  }
  const bar = <span className="demand-brk-bar"><span style={{ width: `${Math.min(100, pct)}%` }} /></span>
  const val = editable && !dimmed
    ? (
      // Stop clicks/preventDefault so interacting with the pill inside a <summary>
      // doesn't toggle the drill-down tray.
      <span className="demand-brk-edit" onClick={(e) => { e.stopPropagation(); e.preventDefault() }}>
        <NumberInput value={displayVal} onChange={commit} min={0} tone={overridden ? 'entered' : 'opt'} suffix={perYr ? '/yr' : '/mo'} ariaLabel={`${node.label} demand`} />
        {overridden && (
          <button type="button" className="demand-brk-reset" title="Reset to modelled value" onClick={() => onReset?.(node.key)}>✕</button>
        )}
      </span>
    )
    : <span className="demand-brk-val">{fmtU(perYr ? node.annualMT : node.annualMT / 12)} {perLabel}</span>
  const countTag = node.count ? <span className="demand-brk-count"> · {node.count} fac.</span> : null
  const childCls = depth > 0 ? ' demand-brk-child' : ''
  // An override on this node replaces its children's roll-up → dim them.
  const dimKids = dimmed || overridden
  const kids = node.children
  if (kids && kids.length > 0) {
    return (
      <details className={`demand-brk-group${dimmed ? ' demand-brk-dim' : ''}`} key={node.key}>
        <summary className={`demand-brk-row demand-brk-summary${childCls}`}>
          <span className="demand-brk-label">
            <span className="demand-brk-caret" aria-hidden>▸</span>
            {node.label}{countTag}
          </span>
          {bar}
          {val}
        </summary>
        <div className="demand-brk-children">
          {kids.map((c) => renderNode(c, node.annualMT, depth + 1, ctx, dimKids))}
        </div>
      </details>
    )
  }
  return (
    <div className={`demand-brk-row${childCls}${dimmed ? ' demand-brk-dim' : ''}`} key={node.key}>
      <span className="demand-brk-label">{node.label}{countTag}</span>
      {bar}
      {val}
    </div>
  )
}

export function DemandOutput({ result, breakdownTitle, emptyHint, onUseDemand, calc, unit: controlledUnit, hideToggle, editable = false, overrides = {}, onEdit, onReset }: Props) {
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
        {editable && (
          <p className="small muted" style={{ margin: '0 0 6px' }}>
            Edit any value to override the model — its total above updates. An override on a district
            or strata replaces the breakdown beneath it (dimmed). Press ✕ to revert.
          </p>
        )}
        {result.breakdown.slice(0, 12).map((b) => renderNode(b, result.annualMT, 0, { perYr, perLabel, unit, fmtU, editable, overrides, onEdit, onReset }, false))}
      </div>

      {calc && (
        <Collapsible className="subpanel" defaultOpen summary="Full calculation — click any pill to edit its input">
          {calc}
        </Collapsible>
      )}
    </div>
  )
}
