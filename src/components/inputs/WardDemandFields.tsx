// Controlled ward-level demand inputs for Step 1 of the facility cost tool
// (the "Ward-by-ward" method). The user enters # O₂ patients per ward for a
// chosen month; per-ward case profiles, seasonality and scalars are editable
// defaults behind collapsible trays. No pandemic scenario — a facility that
// knows its pandemic load simply enters those patient counts directly.
//
// `data-field-scope="demand"` lets the output-side calculation pills jump back
// to the matching input here (via focusInputField).
import { useMemo } from 'react'
import {
  MONTH_LABELS,
  WARDS,
  WARD_GROUPS,
  WARD_LABELS,
  defaultAssumptions,
} from '../../demand-engine'
import type { DemandAssumptions, WardKey } from '../../demand-engine'
import type { WardsDemandInputs } from '../../state'
import { NumberInput } from '../shared/NumberInput'
import { Collapsible } from '../shared/Collapsible'
import { Tooltip } from '../shared/Tooltip'

const SEVERITY = ['Low (C1)', 'Moderate (C2)', 'High (C3)']

// The engine indexes months in the workbook's own order (Nov-first); show the
// picker in ordinary calendar order without disturbing that index mapping.
const CAL_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_OPTIONS = MONTH_LABELS.map((label, index) => ({ label, index }))
  .sort((a, b) => CAL_ORDER.indexOf(a.label) - CAL_ORDER.indexOf(b.label))

interface Props {
  value: WardsDemandInputs
  onChange: (patch: Partial<WardsDemandInputs>) => void
}

export function WardDemandFields({ value, onChange }: Props) {
  const dflt = useMemo(() => defaultAssumptions(), [])
  const { month, wardPatients, assumptions } = value

  const setPatients = (w: WardKey, v: number) =>
    onChange({ wardPatients: { ...wardPatients, [w]: Math.max(0, Math.round(v)) } })

  const patchAssumptions = (next: DemandAssumptions) => onChange({ assumptions: next })

  // Edit one triple cell of a ward's case profile.
  const setProfile = (w: WardKey, field: 'flow' | 'duration' | 'mix', c: number, v: number) => {
    const wards = { ...assumptions.wards, [w]: { ...assumptions.wards[w], [field]: [...assumptions.wards[w][field]] as [number, number, number] } }
    wards[w][field][c] = v
    patchAssumptions({ ...assumptions, wards })
  }
  const setSeason = (k: keyof DemandAssumptions['seasonality'], v: number) =>
    patchAssumptions({ ...assumptions, seasonality: { ...assumptions.seasonality, [k]: v } })
  const setScalar = (k: keyof DemandAssumptions['scalars'], v: number) =>
    patchAssumptions({ ...assumptions, scalars: { ...assumptions.scalars, [k]: v } })

  return (
    <div data-field-scope="demand">
      <p className="field-help">
        Enter the number of patients who received oxygen in each ward for one month, and tell us
        which month. Everything else is a pre-filled default you can adjust below. We extrapolate the
        rest of the year by seasonality to get the annual demand.
      </p>

      <div className="field" style={{ marginBottom: 8 }}>
        <label className="field-label">
          These patient counts are for
          <Tooltip text="The month your entered patient numbers represent. The other months are scaled from it using the seasonality factors, and the annual is the sum." />
        </label>
        <select className="control" style={{ maxWidth: 160 }} value={month} onChange={(e) => onChange({ month: Number(e.target.value) })} aria-label="Month of entered counts">
          {MONTH_OPTIONS.map((m) => <option key={m.label} value={m.index}>{m.label}</option>)}
        </select>
      </div>

      {WARD_GROUPS.map((g) => (
        <div key={g.title} style={{ marginBottom: 6 }}>
          <div className="demand-ward-group">{g.title}</div>
          <div className="demand-ward-grid">
            {g.wards.map((w) => (
              <label key={w} className="demand-ward-row" data-field={`patients.${w}`}>
                <span className="demand-ward-name">{WARD_LABELS[w]}</span>
                <NumberInput
                  value={wardPatients[w] ?? 0}
                  onChange={(v) => setPatients(w, v)}
                  min={0}
                  tone={(wardPatients[w] ?? 0) > 0 ? 'entered' : 'opt'}
                  ariaLabel={`${WARD_LABELS[w]} monthly O2 patients`}
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <Collapsible className="subpanel" summary="Adjust case profiles by ward (advanced)">
        <p className="small muted">
          Per ward and severity (Low / Moderate / High): flow rate (LPM), duration (days) and
          case-mix share. Defaults are the workbook base case.
        </p>
        {WARDS.map((w) => {
          const p = assumptions.wards[w]
          const d = dflt.wards[w]
          const changed = (['flow', 'duration', 'mix'] as const).some((f) => p[f].some((x, i) => x !== d[f][i]))
          return (
            <Collapsible key={w} className="subpanel" summary={`${WARD_LABELS[w]}${changed ? ' • edited' : ''}`}>
              <table className="demand-profile-table">
                <thead>
                  <tr><th /><th>Flow (LPM)</th><th>Duration (days)</th><th>Case-mix %</th></tr>
                </thead>
                <tbody>
                  {SEVERITY.map((sev, c) => (
                    <tr key={c}>
                      <td className="demand-sev">{sev}</td>
                      <td data-field={`profile.${w}.flow.${c}`}><NumberInput value={p.flow[c]} onChange={(v) => setProfile(w, 'flow', c, v)} min={0} step={0.5} tone={p.flow[c] !== d.flow[c] ? 'entered' : 'opt'} ariaLabel={`${w} flow ${sev}`} /></td>
                      <td data-field={`profile.${w}.duration.${c}`}><NumberInput value={p.duration[c]} onChange={(v) => setProfile(w, 'duration', c, v)} min={0} step={0.5} tone={p.duration[c] !== d.duration[c] ? 'entered' : 'opt'} ariaLabel={`${w} duration ${sev}`} /></td>
                      <td data-field={`profile.${w}.mix.${c}`}><NumberInput value={Math.round(p.mix[c] * 1000) / 10} onChange={(v) => setProfile(w, 'mix', c, v / 100)} min={0} max={100} step={1} suffix="%" tone={Math.abs(p.mix[c] - d.mix[c]) > 1e-9 ? 'entered' : 'opt'} ariaLabel={`${w} mix ${sev}`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Collapsible>
          )
        })}
      </Collapsible>

      <Collapsible className="subpanel" summary="Seasonality & conversion factors (advanced)">
        <div className="grid-2">
          {(['winter', 'summer', 'monsoon', 'autumn'] as const).map((k) => (
            <div className="field" key={k} data-field={`season.${k}`}>
              <label className="field-label" style={{ textTransform: 'capitalize' }}>{k} factor</label>
              <NumberInput value={assumptions.seasonality[k]} onChange={(v) => setSeason(k, v)} min={0} step={0.05} tone={assumptions.seasonality[k] !== dflt.seasonality[k] ? 'entered' : 'opt'} ariaLabel={`${k} factor`} />
            </div>
          ))}
          <div className="field" data-field="scalar.minsPerDay">
            <label className="field-label">Minutes / day</label>
            <NumberInput value={assumptions.scalars.minsPerDay} onChange={(v) => setScalar('minsPerDay', v)} min={0} tone={assumptions.scalars.minsPerDay !== dflt.scalars.minsPerDay ? 'entered' : 'opt'} ariaLabel="minutes per day" />
          </div>
          <div className="field" data-field="scalar.mtConversion">
            <label className="field-label">
              Litres per MT
              <Tooltip text="Conversion from litres of gaseous O₂ to metric tonnes (default 750,000 ≈ 750 cu m/MT)." />
            </label>
            <NumberInput value={assumptions.scalars.mtConversion} onChange={(v) => setScalar('mtConversion', v)} min={1} tone={assumptions.scalars.mtConversion !== dflt.scalars.mtConversion ? 'entered' : 'opt'} ariaLabel="litres per MT" />
          </div>
        </div>
      </Collapsible>
    </div>
  )
}
