// Controlled district / state demand inputs — Step 1 of the District/State
// planner. Sums the baked per-facility demand for the chosen area. The model
// factors (per-admission O₂, seasonality, surge magnitude) are fixed defaults
// and not user-editable here; the only choices are the area and Normal vs
// Pandemic scenario.
import {
  STATES,
  defaultAssumptions,
  defaultFactors,
  districtsOf,
} from '../demand-engine'
import type { Scenario, Seasonality } from '../demand-engine'
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
  const { state, district, scenario } = value

  return (
    <div>
      <p className="field-help">
        Pick a state (and optionally a district). The tool sums the baked per-facility oxygen demand
        for that area using the model&apos;s fixed factors.
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

      <div className="field" style={{ marginBottom: 4 }}>
        <label className="field-label">
          Scenario
          <Tooltip text="Pandemic multiplies the estimated demand by the surge factor to size for a surge." />
        </label>
        <div className="view-toggle">
          <button className={scenario === 'normal' ? 'active' : ''} onClick={() => onChange({ scenario: 'normal' })}>Normal</button>
          <button className={scenario === 'pandemic' ? 'active' : ''} onClick={() => onChange({ scenario: 'pandemic' })}>Pandemic</button>
        </div>
      </div>
    </div>
  )
}
