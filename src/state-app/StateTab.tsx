// State / District oxygen budgeting tab. Same Inputs | Output split as the
// facility calculator. The user enters facility counts by bed band; the engine
// expands each into a data-derived archetype and rolls up the annual budget.
import { useMemo, useState } from 'react'
import {
  applyStateRates,
  computeStateCost,
  initialStateInputs,
  predictAll,
  predictBand,
  STATE_META,
} from '../state-engine'
import type { BandKey, BandProfile, StateInputs, StateRates } from '../state-engine'
import { StateInputsPanel } from './StateInputs'
import { StateOutput } from './StateOutput'

function ColumnHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="col-header">
      <span className="col-title">{title}</span>
      <span className="col-sub">{sub}</span>
    </div>
  )
}

export function StateTab() {
  const [inputs, setInputs] = useState<StateInputs>(initialStateInputs)

  const result = useMemo(() => computeStateCost(inputs), [inputs])

  const setCount = (band: BandKey, n: number) =>
    setInputs((s) => ({ ...s, counts: { ...s.counts, [band]: n } }))
  // Changing the state re-applies its observed rates and re-predicts every band.
  const setStateName = (stateName: string) =>
    setInputs((s) => ({
      ...s,
      stateName,
      rates: applyStateRates(s.rates, stateName),
      profiles: predictAll(s.profiles, stateName),
    }))
  // Changing a band's average bed size re-predicts that band's archetype.
  const setBeds = (band: BandKey, oxBeds: number) =>
    setInputs((s) => ({
      ...s,
      profiles: s.profiles.map((p) => (p.band === band ? predictBand(band, oxBeds, s.stateName) : p)),
    }))
  const patchRates = (patch: Partial<StateRates>) =>
    setInputs((s) => ({ ...s, rates: { ...s.rates, ...patch } }))
  const patchProfile = (band: BandKey, patch: Partial<BandProfile>) =>
    setInputs((s) => ({
      ...s,
      profiles: s.profiles.map((p) => (p.band === band ? { ...p, ...patch } : p)),
    }))
  const reset = () => setInputs(initialStateInputs())

  return (
    <div>
      <div className="state-intro">
        <h2 style={{ marginBottom: 4 }}>District / State oxygen budget planner</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Plan an annual medical-oxygen budget across many facilities from just a
          headcount by size. Each oxygen-bed band expands into a median facility
          profile derived from the {STATE_META ? 'WJCF 92-facility assessment' : 'survey'};
          apply your state rates and read off the estimated annual cost. All figures are
          planning estimates in ₹, inclusive of applicable taxes.
        </p>
      </div>

      <div className="layout-grid">
        <div>
          <ColumnHeader title="Inputs" sub="counts by bed band · rates · model" />
          <StateInputsPanel
            value={inputs}
            onCount={setCount}
            onStateName={setStateName}
            onBeds={setBeds}
            onRates={patchRates}
            onProfile={patchProfile}
            onReset={reset}
          />
        </div>
        <div>
          <ColumnHeader title="Output" sub="estimated annual budget · updates live" />
          <StateOutput result={result} />
        </div>
      </div>
    </div>
  )
}
