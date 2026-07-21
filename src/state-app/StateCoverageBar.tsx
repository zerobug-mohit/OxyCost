// Coverage-of-demand bar for the District/State tab — the planner's analogue of
// the facility DemandAllocationBar. It stacks the annual oxygen SUPPLY the
// entered/modelled equipment can deliver (by source) against the Step-1 estimated
// demand, so a planner can see at a glance whether the infrastructure covers the
// need. Values honour the demand output's unit toggle (cu m / D-type cyl / kg),
// with MT/yr shown alongside as a reference.
import type { StateSupply } from '../state-engine'
import { MT_TO_CUM } from '../demand-engine'
import { costUnitName, cuMToVolume, formatNumber, type CostUnit } from '../utils/format'
import { Tooltip } from '../components/shared/Tooltip'

const GROUP_COLOR: Record<StateSupply['segments'][number]['group'], string> = {
  psa: '#0f7c8b',
  lmo: '#2b8a3e',
  cylinder: '#b5852a',
  oc: '#7048a8',
}

interface Props {
  supply: StateSupply
  /** Estimated annual demand (MT) from Step 1. */
  demandMT: number
  /** Display unit shared with the demand output toggle. */
  unit: CostUnit
}

export function StateCoverageBar({ supply, demandMT, unit }: Props) {
  if (demandMT <= 0) return null

  const un = costUnitName(unit)
  // MT/yr → the selected display unit (cu m / D-type cyl / kg) per year.
  const toU = (mt: number) => cuMToVolume(mt * MT_TO_CUM, unit)
  const fmt = (mt: number) => `${formatNumber(Math.round(toU(mt)))} ${un}/yr`

  const segments = supply.segments.map((s) => ({
    ...s,
    mt: s.annualCuM / MT_TO_CUM,
    color: GROUP_COLOR[s.group],
  }))
  const total = supply.annualMT
  const pct = (total / demandMT) * 100
  const over = total > demandMT
  const scaleBase = over ? total : demandMT

  return (
    <div className="alloc">
      <div className="alloc-head">
        <span className="alloc-title">
          Coverage of demand
          <Tooltip
            text="The annual oxygen every source in your plan can produce or deliver (PSA output, LMO expanded to gas, cylinder refills, concentrators), stacked against the Step 1 estimated demand for this area."
            effect="Aim for about 100%. Below 100% the planned infrastructure can't meet the estimated need; above 100% there is spare capacity (shown hatched)."
          />
        </span>
        <span
          className="alloc-pct"
          style={{ color: over ? 'var(--c-warn)' : pct >= 99.5 ? 'var(--c-best-text)' : 'var(--c-text)' }}
        >
          {fmt(total)} / {fmt(demandMT)} &middot; {pct.toFixed(0)}%
        </span>
      </div>

      <div className="alloc-track">
        {segments.map((s) => (
          <div
            key={s.group}
            className="alloc-seg"
            style={{ width: `${(s.mt / scaleBase) * 100}%`, background: s.color }}
            title={`${s.label}: ${fmt(s.mt)}`}
          />
        ))}
        {!over && total < demandMT && (
          <div
            className="alloc-seg"
            style={{ width: `${((demandMT - total) / scaleBase) * 100}%`, background: 'transparent' }}
          />
        )}
        {over && (
          <div
            className="alloc-seg alloc-over"
            style={{ width: `${((total - demandMT) / scaleBase) * 100}%` }}
            title={`Spare capacity: ${fmt(total - demandMT)}`}
          />
        )}
      </div>

      <div className="alloc-legend">
        {segments.map((s) => (
          <span key={s.group} className="lg">
            <span className="src-dot" style={{ background: s.color, margin: 0 }} />
            {s.label} — {fmt(s.mt)}
          </span>
        ))}
        {segments.length === 0 && (
          <span>No supply yet — add facilities or equipment in Step 2.</span>
        )}
      </div>
    </div>
  )
}
