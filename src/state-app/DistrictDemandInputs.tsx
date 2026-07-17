// Controlled district / state demand inputs — Step 1 of the District/State
// planner. Sums the baked per-facility demand for the chosen area; the levers
// are the 25 per-admission O₂ factors, the seasonality factors and the surge.
// `data-field-scope="demand-state"` lets the output calc pills jump back here.
import { useMemo } from 'react'
import {
  STATES,
  TRANCHES,
  defaultAssumptions,
  defaultFactors,
  districtsOf,
} from '../demand-engine'
import type { Scenario, Seasonality } from '../demand-engine'
import { NumberInput } from '../components/shared/NumberInput'
import { Collapsible } from '../components/shared/Collapsible'
import { Tooltip } from '../components/shared/Tooltip'

export interface DistrictDemandState {
  state: string
  district: string | null
  factors: Record<string, number>
  seasonality: Seasonality
  surge: number
  scenario: Scenario
}

/** A fresh default demand selection (whole first state, model defaults). */
export function initialDistrictDemand(): DistrictDemandState {
  const a = defaultAssumptions()
  return {
    state: STATES[0],
    district: null,
    factors: defaultFactors(),
    seasonality: a.seasonality,
    surge: a.scalars.pandemicSurge,
    scenario: 'normal',
  }
}

interface Props {
  value: DistrictDemandState
  onChange: (patch: Partial<DistrictDemandState>) => void
}

export function DistrictDemandInputs({ value, onChange }: Props) {
  const dfltFactors = useMemo(() => defaultFactors(), [])
  const dflt = useMemo(() => defaultAssumptions(), [])
  const { state, district, factors, seasonality, surge, scenario } = value

  const stateTranches = TRANCHES.filter((t) => t.state === state)
  const setFactor = (label: string, v: number) => onChange({ factors: { ...factors, [label]: v } })
  const setSeason = (k: keyof Seasonality, v: number) => onChange({ seasonality: { ...seasonality, [k]: v } })

  return (
    <div data-field-scope="demand-state">
      <p className="field-help">
        Pick a state (and optionally a district). The tool sums the baked per-facility oxygen
        demand for that area. Everything below is a pre-filled model default you can adjust.
      </p>

      <div className="grid-2">
        <div className="field">
          <label className="field-label">State</label>
          <select
            className="control"
            value={state}
            onChange={(e) => onChange({ state: e.target.value, district: null })}
            aria-label="State"
          >
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">District</label>
          <select
            className="control"
            value={district ?? ''}
            onChange={(e) => onChange({ district: e.target.value || null })}
            aria-label="District"
          >
            <option value="">Whole state</option>
            {districtsOf(state).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">
          Scenario
          <Tooltip text="Pandemic multiplies demand by the surge factor." />
        </label>
        <div className="view-toggle">
          <button className={scenario === 'normal' ? 'active' : ''} onClick={() => onChange({ scenario: 'normal' })}>Normal</button>
          <button className={scenario === 'pandemic' ? 'active' : ''} onClick={() => onChange({ scenario: 'pandemic' })}>Pandemic</button>
        </div>
      </div>

      <Collapsible className="subpanel" summary={`Per-admission O₂ factors — ${state} (advanced)`}>
        <p className="small muted">
          O₂ demand (MT) per monthly admission, by facility type × admission band. Editing a
          factor rescales the extrapolated demand of every facility in that band.
        </p>
        <table className="demand-factor-table">
          <thead><tr><th>Facility type</th><th>Admission band</th><th>O₂ / admission (MT)</th></tr></thead>
          <tbody>
            {stateTranches.map((t) => (
              <tr key={t.label}>
                <td>{t.type}</td>
                <td>≤ {t.band}</td>
                <td data-field={`factor.${t.label}`}>
                  <NumberInput
                    value={factors[t.label] ?? t.factor}
                    onChange={(v) => setFactor(t.label, v)}
                    min={0}
                    step={0.0001}
                    tone={Math.abs((factors[t.label] ?? t.factor) - dfltFactors[t.label]) > 1e-9 ? 'entered' : 'opt'}
                    ariaLabel={`${t.type} ${t.band} factor`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Collapsible>

      <Collapsible className="subpanel" summary="Seasonality & scenario factors (advanced)">
        <div className="grid-2">
          {(['winter', 'summer', 'monsoon', 'autumn'] as const).map((k) => (
            <div className="field" key={k} data-field={`season.${k}`}>
              <label className="field-label" style={{ textTransform: 'capitalize' }}>{k} factor</label>
              <NumberInput value={seasonality[k]} onChange={(v) => setSeason(k, v)} min={0} step={0.05} tone={seasonality[k] !== dflt.seasonality[k] ? 'entered' : 'opt'} ariaLabel={`${k} factor`} />
            </div>
          ))}
          <div className="field" data-field="scalar.pandemicSurge">
            <label className="field-label">Pandemic surge ×</label>
            <NumberInput value={surge} onChange={(v) => onChange({ surge: v })} min={1} step={0.5} tone={surge !== dflt.scalars.pandemicSurge ? 'entered' : 'opt'} ariaLabel="pandemic surge" />
          </div>
        </div>
      </Collapsible>
    </div>
  )
}
