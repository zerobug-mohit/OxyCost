// Full, transparent calculation breakdown for the demand tabs — mirrors the
// cost tools' drill-down. Every driving value is a clickable pill that jumps to
// the matching input on the left (via focusInputField + the data-field anchors
// the tabs render). Facility = case-mix per ward; District = per-admission strata.
import type { ReactNode } from 'react'
import {
  DISTRICTS,
  MONTH_LABELS,
  MONTH_SEASON,
  WARDS,
  WARD_LABELS,
  defaultFactors,
  districtsOf,
  wardMonthlyMT,
} from '../demand-engine'
import type { DemandAssumptions, DistrictSelection, Scenario, Seasonality, WardKey } from '../demand-engine'
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

// ---- District / State (per-admission strata) ----
export function DistrictCalc({ selection, factors, seasonality, scenario, surge }: {
  selection: DistrictSelection
  factors: Record<string, number>
  seasonality: Seasonality
  scenario: Scenario
  surge: number
}) {
  const dflt = defaultFactors()
  const s = scenario === 'pandemic' ? surge : 1
  const districts = selection.district ? [selection.district] : districtsOf(selection.state)
  const stateData = DISTRICTS[selection.state] ?? {}

  // Aggregate baked demand by tranche + sampled across the selection.
  const byTranche: Record<string, number> = {}
  let sampled = 0
  for (const d of districts) {
    const dd = stateData[d]
    if (!dd) continue
    sampled += dd.sampledMT
    for (const [label, v] of Object.entries(dd.byTranche)) byTranche[label] = (byTranche[label] ?? 0) + v
  }
  const trancheRows = Object.entries(byTranche).sort((a, b) => b[1] - a[1])
  let total = sampled * s
  trancheRows.forEach(([label, baked]) => {
    const ratio = dflt[label] ? (factors[label] ?? dflt[label]) / dflt[label] : 1
    total += baked * ratio * s
  })

  const area = selection.district ?? `${selection.state} (whole state)`
  return (
    <div className="head-calc">
      <p className="head-calc-intro">
        {area}: baked demand per <strong>admission strata</strong>, using the model&apos;s fixed
        per-admission O₂ factors.
      </p>
      <table className="demand-calc-table">
        <thead><tr><th>Strata (factor)</th><th>Baked MT/yr</th><th>Contribution</th></tr></thead>
        <tbody>
          {trancheRows.map(([label, baked]) => {
            const cur = factors[label] ?? dflt[label] ?? 0
            const ratio = dflt[label] ? cur / dflt[label] : 1
            return (
              <tr key={label}>
                <td><span className="calc-ref static">factor {label} = {cur.toFixed(4)}</span></td>
                <td className="num">{mt(baked)}</td>
                <td className="num">{mt(baked * ratio * s)}</td>
              </tr>
            )
          })}
          {sampled > 0 && (
            <tr>
              <td>Sampled facilities (ward-based, fixed)</td>
              <td className="num">{mt(sampled)}</td>
              <td className="num">{mt(sampled * s)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="demand-calc-totals">
        <div>Total = <strong>{mt(total)} MT/yr</strong>{scenario === 'pandemic' && <> (incl. surge ×{surge})</>}</div>
        <div className="small muted">
          Seasonality shapes the monthly profile — winter {seasonality.winter} ·
          summer {seasonality.summer} · monsoon {seasonality.monsoon} ·
          autumn {seasonality.autumn}. 1 MT = 750 cu m.
        </div>
      </div>
    </div>
  )
}
