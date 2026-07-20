// Full, transparent calculation breakdown for the facility ward-by-ward demand
// method — mirrors the cost tools' drill-down. Every driving value is a
// clickable pill that jumps to the matching input on the left (via
// focusInputField + the data-field anchors the inputs render).
import type { ReactNode } from 'react'
import {
  MONTH_LABELS,
  MONTH_SEASON,
  WARDS,
  WARD_LABELS,
  wardMonthlyMT,
} from '../demand-engine'
import type { DemandAssumptions, Scenario, WardKey } from '../demand-engine'
import { focusInputField } from '../utils/focusField'
import { formatNumber } from '../utils/format'

const SEV = ['Low', 'Mod', 'High']

function Pill({ scope, field, children }: { scope: string; field: string; children: ReactNode }) {
  return (
    <button type="button" className="calc-ref" title="Go to this input on the left" onClick={() => focusInputField(scope, field)}>
      {children}
    </button>
  )
}

const mt = (v: number) => (v >= 10 ? formatNumber(Math.round(v)) : (Math.round(v * 100) / 100).toString())
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`

// ---- Facility (case-mix) ----
export function FacilityCalc({ wardPatients, assumptions, scenario, month = 0, onNavigate }: {
  wardPatients: Record<WardKey, number>
  assumptions: DemandAssumptions
  scenario: Scenario
  month?: number
  /** Called when any pill is clicked — e.g. to open the step holding the inputs. */
  onNavigate?: () => void
}) {
  const scope = 'demand'
  const { minsPerDay, mtConversion, pandemicSurge } = assumptions.scalars
  const surge = scenario === 'pandemic' ? pandemicSurge : 1
  const active = WARDS.filter((w) => (wardPatients[w] ?? 0) > 0)
  let entered = 0
  active.forEach((w) => { entered += wardMonthlyMT(wardPatients[w] ?? 0, assumptions.wards[w], assumptions.scalars) * surge })
  const monthLabel = MONTH_LABELS[Math.max(0, Math.min(11, month))]
  const totalW = MONTH_SEASON.reduce((a, k) => a + assumptions.seasonality[k], 0)
  const refW = assumptions.seasonality[MONTH_SEASON[Math.max(0, Math.min(11, month))]] || 1
  const annual = entered * (totalW / refW)

  if (active.length === 0) return <p className="small muted">Enter O₂ patients for a ward to see the calculation.</p>

  return (
    <div
      className="head-calc"
      onClick={onNavigate ? (e) => { if ((e.target as HTMLElement).closest('.calc-ref')) onNavigate() } : undefined}
    >
      <p className="head-calc-intro">
        Each ward: <strong>patients × case-mix% × flow × duration × minutes/day ÷ litres-per-MT</strong>.
        The <span className="calc-ref static">highlighted values</span> are your inputs — click one to jump to it.
      </p>
      {active.map((w) => {
        const p = assumptions.wards[w]
        const n = wardPatients[w] ?? 0
        const wardMT = wardMonthlyMT(n, p, assumptions.scalars) * surge
        return (
          <div className="demand-calc-ward" key={w}>
            <div className="demand-calc-ward-head">
              <Pill scope={scope} field={`patients.${w}`}>{formatNumber(n)}</Pill> patients · {WARD_LABELS[w]}
              <span className="head-calc-eq"> = <strong>{mt(wardMT)} MT</strong> in {monthLabel}</span>
            </div>
            <table className="demand-calc-table">
              <thead><tr><th>Severity</th><th>Case-mix</th><th>Flow</th><th>Duration</th><th>MT</th></tr></thead>
              <tbody>
                {SEV.map((sev, c) => {
                  const cMT = (n * p.mix[c] * p.flow[c] * p.duration[c] * minsPerDay) / mtConversion * surge
                  return (
                    <tr key={c}>
                      <td>{sev}</td>
                      <td><Pill scope={scope} field={`profile.${w}.mix.${c}`}>{pct(p.mix[c])}</Pill></td>
                      <td><Pill scope={scope} field={`profile.${w}.flow.${c}`}>{p.flow[c]} LPM</Pill></td>
                      <td><Pill scope={scope} field={`profile.${w}.duration.${c}`}>{p.duration[c]} d</Pill></td>
                      <td className="num">{mt(cMT)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
      <div className="demand-calc-totals">
        <div>{monthLabel} demand = Σ wards = <strong>{mt(entered)} MT</strong></div>
        <div>
          Annual = {monthLabel} × (Σ seasonality ÷ {monthLabel}&apos;s factor) = <strong>{mt(annual)} MT/yr</strong>
          {scenario === 'pandemic' && <> (incl. pandemic surge ×<Pill scope={scope} field="scalar.pandemicSurge">{pandemicSurge}</Pill>)</>}
        </div>
        <div className="small muted">
          Seasonality reshapes the 12 months — winter <Pill scope={scope} field="season.winter">{assumptions.seasonality.winter}</Pill> ·
          summer <Pill scope={scope} field="season.summer">{assumptions.seasonality.summer}</Pill> ·
          monsoon <Pill scope={scope} field="season.monsoon">{assumptions.seasonality.monsoon}</Pill> ·
          autumn <Pill scope={scope} field="season.autumn">{assumptions.seasonality.autumn}</Pill>.
          Conversion: 1 MT = <Pill scope={scope} field="scalar.mtConversion">{formatNumber(mtConversion)}</Pill> L
          (<Pill scope={scope} field="scalar.minsPerDay">{formatNumber(minsPerDay)}</Pill> min/day) = 750 cu m.
        </div>
      </div>
    </div>
  )
}
