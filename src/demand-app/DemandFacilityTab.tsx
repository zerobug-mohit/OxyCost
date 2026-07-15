// Facility-level oxygen demand — the case-mix method. The user enters # O₂
// patients per ward (the only required input); per-ward case profiles,
// seasonality and scalars are editable defaults behind collapsible trays.
import { useMemo, useState } from 'react'
import {
  WARDS,
  WARD_GROUPS,
  WARD_LABELS,
  computeFacilityDemand,
  defaultAssumptions,
} from '../demand-engine'
import type { DemandAssumptions, FacilityDemandInput, Scenario, WardKey } from '../demand-engine'
import { NumberInput } from '../components/shared/NumberInput'
import { Collapsible } from '../components/shared/Collapsible'
import { Tooltip } from '../components/shared/Tooltip'
import { DemandOutput } from './DemandOutput'
import { FacilityCalc } from './DemandCalc'

function ColumnHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="col-header">
      <span className="col-title">{title}</span>
      <span className="col-sub">{sub}</span>
    </div>
  )
}

const SEVERITY = ['Low (C1)', 'Moderate (C2)', 'High (C3)']

export function DemandFacilityTab({ onUseDemand }: { onUseDemand?: (cuMPerMonth: number) => void }) {
  const dflt = useMemo(() => defaultAssumptions(), [])
  const [wardPatients, setWardPatients] = useState<Record<WardKey, number>>({})
  const [assumptions, setAssumptions] = useState<DemandAssumptions>(() => defaultAssumptions())
  const [scenario, setScenario] = useState<Scenario>('normal')

  const input: FacilityDemandInput = { wardPatients }
  const result = useMemo(
    () => computeFacilityDemand(input, assumptions, scenario),
    [wardPatients, assumptions, scenario],
  )

  const setPatients = (w: WardKey, v: number) =>
    setWardPatients((s) => ({ ...s, [w]: Math.max(0, Math.round(v)) }))

  // Edit one triple cell of a ward's case profile.
  const setProfile = (w: WardKey, field: 'flow' | 'duration' | 'mix', c: number, v: number) =>
    setAssumptions((a) => {
      const wards = { ...a.wards, [w]: { ...a.wards[w], [field]: [...a.wards[w][field]] as [number, number, number] } }
      wards[w][field][c] = v
      return { ...a, wards }
    })
  const setSeason = (k: keyof DemandAssumptions['seasonality'], v: number) =>
    setAssumptions((a) => ({ ...a, seasonality: { ...a.seasonality, [k]: v } }))
  const setScalar = (k: keyof DemandAssumptions['scalars'], v: number) =>
    setAssumptions((a) => ({ ...a, scalars: { ...a.scalars, [k]: v } }))

  const anyPatients = WARDS.some((w) => (wardPatients[w] ?? 0) > 0)

  return (
    <div className="layout-grid">
      {/* Inputs */}
      <div data-field-scope="demand">
        <ColumnHeader title="Inputs" sub="O₂ patients per ward · editable assumptions" />

        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field-label">
            Scenario
            <Tooltip text="Normal uses the base case profiles. Pandemic multiplies demand by the surge factor (default ×5)." />
          </label>
          <div className="view-toggle">
            <button className={scenario === 'normal' ? 'active' : ''} onClick={() => setScenario('normal')}>Normal</button>
            <button className={scenario === 'pandemic' ? 'active' : ''} onClick={() => setScenario('pandemic')}>Pandemic</button>
          </div>
        </div>

        <div className="panel src-shared" style={{ padding: '12px 14px' }}>
          <div className="panel-section-title" style={{ marginTop: 0 }}>
            Monthly O₂ patients by ward
            <Tooltip text="Number of patients who received oxygen in each ward in a typical month. Leave a ward at 0 if it has none." />
          </div>
          <p className="small muted" style={{ marginTop: 0 }}>
            Enter a typical month. Only wards with patients contribute — everything else is a
            pre-filled default you can adjust below.
          </p>
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
        </div>

        {/* Advanced assumptions */}
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

        <Collapsible className="subpanel" summary="Seasonality & scenario factors (advanced)">
          <div className="grid-2">
            {(['winter', 'summer', 'monsoon', 'autumn'] as const).map((k) => (
              <div className="field" key={k} data-field={`season.${k}`}>
                <label className="field-label" style={{ textTransform: 'capitalize' }}>{k} factor</label>
                <NumberInput value={assumptions.seasonality[k]} onChange={(v) => setSeason(k, v)} min={0} step={0.05} tone={assumptions.seasonality[k] !== dflt.seasonality[k] ? 'entered' : 'opt'} ariaLabel={`${k} factor`} />
              </div>
            ))}
            <div className="field" data-field="scalar.pandemicSurge">
              <label className="field-label">Pandemic surge ×</label>
              <NumberInput value={assumptions.scalars.pandemicSurge} onChange={(v) => setScalar('pandemicSurge', v)} min={1} step={0.5} tone={assumptions.scalars.pandemicSurge !== dflt.scalars.pandemicSurge ? 'entered' : 'opt'} ariaLabel="pandemic surge" />
            </div>
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

      {/* Output */}
      <div>
        <ColumnHeader title="Output" sub="estimated demand · updates live" />
        {anyPatients ? (
          <DemandOutput
            result={result}
            breakdownTitle="Demand by ward"
            emptyHint=""
            onUseDemand={onUseDemand}
            calc={<FacilityCalc wardPatients={wardPatients} assumptions={assumptions} scenario={scenario} />}
          />
        ) : (
          <DemandOutput result={result} breakdownTitle="Demand by ward" emptyHint="Enter O₂ patients for at least one ward on the left." />
        )}
      </div>
    </div>
  )
}
