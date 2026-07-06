// State / District oxygen budgeting tab. Same Inputs | Output split as the
// facility calculator. The user enters facility counts by bed band; the engine
// expands each into a data-derived archetype and rolls up the annual budget.
import { useMemo, useState } from 'react'
import {
  applyStateRates,
  computeStateCost,
  initialStateInputs,
  STATE_META,
} from '../state-engine'
import type { BandKey, BandProfile, StateInputs, StateRates } from '../state-engine'
import type { TabKey } from '../components/layout/Header'
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

export function StateTab({ onNavigate }: { onNavigate?: (tab: TabKey, anchor?: string) => void }) {
  const [inputs, setInputs] = useState<StateInputs>(initialStateInputs)

  const result = useMemo(() => computeStateCost(inputs), [inputs])

  const setCount = (band: BandKey, n: number) =>
    setInputs((s) => ({ ...s, counts: { ...s.counts, [band]: n } }))
  // Changing the state re-applies its observed rates; unedited sub-band mixes
  // (null) re-derive automatically for the new state.
  const setStateName = (stateName: string) =>
    setInputs((s) => ({ ...s, stateName, rates: applyStateRates(s.rates, stateName) }))
  const setBeds = (band: BandKey, oxBeds: number) =>
    setInputs((s) => ({ ...s, beds: { ...s.beds, [band]: oxBeds } }))
  const setShares = (band: BandKey, fractions: number[]) =>
    setInputs((s) => ({ ...s, subShares: { ...s.subShares, [band]: fractions } }))
  const setOverride = (band: BandKey, patch: Partial<BandProfile>) =>
    setInputs((s) => ({ ...s, overrides: { ...s.overrides, [band]: { ...s.overrides[band], ...patch } } }))
  // Clear a single override field → the variable reverts to the model default.
  const resetOverride = (band: BandKey, key: keyof BandProfile) =>
    setInputs((s) => {
      const o = { ...s.overrides[band] }
      delete o[key]
      return { ...s, overrides: { ...s.overrides, [band]: o } }
    })
  const patchRates = (patch: Partial<StateRates>) =>
    setInputs((s) => ({ ...s, rates: { ...s.rates, ...patch } }))
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
            result={result}
            onCount={setCount}
            onStateName={setStateName}
            onBeds={setBeds}
            onShares={setShares}
            onOverride={setOverride}
            onResetOverride={resetOverride}
            onRates={patchRates}
            onReset={reset}
            onNavigate={onNavigate}
          />
        </div>
        <div>
          <ColumnHeader title="Output" sub="estimated annual budget · updates live" />
          <StateOutput result={result} rates={inputs.rates} />
        </div>
      </div>
    </div>
  )
}
