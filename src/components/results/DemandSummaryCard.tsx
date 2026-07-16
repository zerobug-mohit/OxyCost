// Demand output for the facility cost tool — the "Demand output" tray. Shows
// how the monthly demand that everything is costed against was arrived at,
// depending on the Step-1 method:
//   • wards      — full case-mix breakdown (reuses the demand tab's output +
//                  the clickable calculation drill-down).
//   • archetype  — the matched strata and admissions × factor.
//   • direct     — the figure was entered by hand (nothing to break down).
import {
  MONTH_LABELS,
  MT_TO_CUM,
  computeFacilityDemand,
  defaultAssumptions,
  demandFromAdmissions,
} from '../../demand-engine'
import type { AppState } from '../../state'
import { DemandOutput } from '../../demand-app/DemandOutput'
import { FacilityCalc } from '../../demand-app/DemandCalc'
import { formatNumber } from '../../utils/format'

interface Props {
  state: AppState
  /** Resolved monthly demand (cu m) that the cost engine is using. */
  demand: number
  /** Open the input step that holds the demand inputs (called on a pill click). */
  onNavigate?: () => void
}

export function DemandSummaryCard({ state, demand, onNavigate }: Props) {
  if (state.demandMode === 'wards') {
    const w = state.wardsDemand
    const result = computeFacilityDemand({ wardPatients: w.wardPatients }, w.assumptions, 'normal', w.month)
    return (
      <DemandOutput
        result={result}
        breakdownTitle="Demand by ward"
        emptyHint="Enter O₂ patients for at least one ward in Step 1."
        calc={<FacilityCalc wardPatients={w.wardPatients} assumptions={w.assumptions} scenario="normal" month={w.month} onNavigate={onNavigate} />}
      />
    )
  }

  if (state.demandMode === 'admissions') {
    const ad = state.admissionsDemand
    const { seasonality, scalars } = defaultAssumptions()
    const est = demandFromAdmissions(ad.state, ad.facilityType, ad.ipd, ad.month, seasonality, 'normal', scalars.pandemicSurge)
    if (!(ad.ipd > 0) || !est.tranche) {
      return <p className="small muted">Enter your average monthly IPD admissions in Step 1 to estimate demand.</p>
    }
    return (
      <div className="demand-output">
        <div className="demand-headline">
          <div className="demand-hl-main">
            <span className="demand-hl-label">Estimated monthly demand ({MONTH_LABELS[Math.max(0, Math.min(11, ad.month))]})</span>
            <span className="demand-hl-value">{formatNumber(Math.round(est.cuM))} <span className="demand-hl-unit">cu m/mo</span></span>
            <span className="demand-hl-sub">≈ {formatNumber(Math.round(est.mt * 100) / 100)} MT/mo</span>
          </div>
        </div>
        <div className="head-calc">
          <p className="head-calc-intro">
            Matched to the closest demand strata by <strong>state · facility type · admission band</strong>,
            then <strong>admissions × O₂-per-admission factor</strong> (with the month&apos;s seasonality).
          </p>
          <table className="demand-calc-table">
            <tbody>
              <tr><td>State</td><td className="num">{ad.state}</td></tr>
              <tr><td>Matched archetype</td><td className="num">{est.tranche.type} · ≤ {est.tranche.band} band</td></tr>
              <tr><td>O₂ / admission factor</td><td className="num">{est.tranche.factor.toFixed(4)} MT</td></tr>
              <tr><td>Avg monthly IPD admissions</td><td className="num">{formatNumber(ad.ipd)}</td></tr>
              <tr><td><strong>Demand used for costing</strong></td><td className="num"><strong>{formatNumber(Math.round(est.cuM))} cu m/mo</strong></td></tr>
            </tbody>
          </table>
          <p className="small muted">To change any of these, edit them in Step 1. 1 MT = {MT_TO_CUM} cu m.</p>
        </div>
      </div>
    )
  }

  // direct
  return (
    <div className="demand-output">
      <div className="demand-headline">
        <div className="demand-hl-main">
          <span className="demand-hl-label">Monthly demand (entered directly)</span>
          <span className="demand-hl-value">{formatNumber(Math.round(demand))} <span className="demand-hl-unit">cu m/mo</span></span>
          <span className="demand-hl-sub">≈ {formatNumber(Math.round((demand / MT_TO_CUM) * 100) / 100)} MT/mo</span>
        </div>
      </div>
      <p className="small muted">
        You typed this figure in Step 1. Switch to <strong>Facility archetype</strong> or{' '}
        <strong>Ward-by-ward</strong> there to have the tool estimate it instead.
      </p>
    </div>
  )
}
