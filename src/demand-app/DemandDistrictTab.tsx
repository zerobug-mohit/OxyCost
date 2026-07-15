// District / State oxygen demand — sums the baked per-facility demand for the
// chosen state (and optional district). No ward entry: the levers are the 25
// per-admission O₂ factors, the seasonality factors and the pandemic surge.
import { useMemo, useState } from 'react'
import {
  STATES,
  TRANCHES,
  computeDistrictDemand,
  defaultAssumptions,
  defaultFactors,
  districtsOf,
} from '../demand-engine'
import type { Scenario, Seasonality } from '../demand-engine'
import { NumberInput } from '../components/shared/NumberInput'
import { Collapsible } from '../components/shared/Collapsible'
import { Tooltip } from '../components/shared/Tooltip'
import { DemandOutput } from './DemandOutput'
import { DistrictCalc } from './DemandCalc'

function ColumnHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="col-header">
      <span className="col-title">{title}</span>
      <span className="col-sub">{sub}</span>
    </div>
  )
}

export function DemandDistrictTab({ onUseDemand }: { onUseDemand?: (cuMPerMonth: number) => void }) {
  const dfltFactors = useMemo(() => defaultFactors(), [])
  const dfltSeason = useMemo(() => defaultAssumptions().seasonality, [])
  const surgeDefault = useMemo(() => defaultAssumptions().scalars.pandemicSurge, [])

  const [state, setState] = useState<string>(STATES[0])
  const [district, setDistrict] = useState<string | null>(null)
  const [factors, setFactors] = useState<Record<string, number>>(() => defaultFactors())
  const [seasonality, setSeasonality] = useState<Seasonality>(() => defaultAssumptions().seasonality)
  const [surge, setSurge] = useState<number>(surgeDefault)
  const [scenario, setScenario] = useState<Scenario>('normal')

  const result = useMemo(
    () => computeDistrictDemand({ state, district }, factors, seasonality, scenario, surge),
    [state, district, factors, seasonality, scenario, surge],
  )

  const stateTranches = TRANCHES.filter((t) => t.state === state)
  const setFactor = (label: string, v: number) => setFactors((f) => ({ ...f, [label]: v }))
  const setSeason = (k: keyof Seasonality, v: number) => setSeasonality((s) => ({ ...s, [k]: v }))

  return (
    <div className="layout-grid">
      {/* Inputs */}
      <div data-field-scope="demand-state">
        <ColumnHeader title="Inputs" sub="pick an area · editable factors" />

        <div className="grid-2">
          <div className="field">
            <label className="field-label">State</label>
            <select
              className="control"
              value={state}
              onChange={(e) => { setState(e.target.value); setDistrict(null) }}
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
              onChange={(e) => setDistrict(e.target.value || null)}
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
            <button className={scenario === 'normal' ? 'active' : ''} onClick={() => setScenario('normal')}>Normal</button>
            <button className={scenario === 'pandemic' ? 'active' : ''} onClick={() => setScenario('pandemic')}>Pandemic</button>
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
                <NumberInput value={seasonality[k]} onChange={(v) => setSeason(k, v)} min={0} step={0.05} tone={seasonality[k] !== dfltSeason[k] ? 'entered' : 'opt'} ariaLabel={`${k} factor`} />
              </div>
            ))}
            <div className="field" data-field="scalar.pandemicSurge">
              <label className="field-label">Pandemic surge ×</label>
              <NumberInput value={surge} onChange={setSurge} min={1} step={0.5} tone={surge !== surgeDefault ? 'entered' : 'opt'} ariaLabel="pandemic surge" />
            </div>
          </div>
        </Collapsible>
      </div>

      {/* Output */}
      <div>
        <ColumnHeader title="Output" sub="estimated demand · updates live" />
        <DemandOutput
          result={result}
          breakdownTitle={district ? `${district} demand` : `Demand by district — ${state}`}
          emptyHint="No baked demand for this selection."
          onUseDemand={onUseDemand}
          calc={<DistrictCalc selection={{ state, district }} factors={factors} seasonality={seasonality} scenario={scenario} surge={surge} />}
        />
      </div>
    </div>
  )
}
