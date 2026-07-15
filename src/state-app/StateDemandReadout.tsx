// Read-only oxygen-demand readout for the District/State COST planner: pick a
// state (+optional district) to see the estimated annual demand from the baked
// case-mix model. Independent of the equipment-based cost estimate below.
import { useState } from 'react'
import {
  MT_TO_CUM,
  STATES,
  computeDistrictDemand,
  defaultAssumptions,
  defaultFactors,
  districtsOf,
} from '../demand-engine'
import { formatNumber } from '../utils/format'

export function StateDemandReadout() {
  const [state, setState] = useState<string>(STATES[0])
  const [district, setDistrict] = useState<string | null>(null)
  const { seasonality, scalars } = defaultAssumptions()
  const r = computeDistrictDemand({ state, district }, defaultFactors(), seasonality, 'normal', scalars.pandemicSurge)
  const area = district ?? `${state} (whole state)`

  return (
    <div className="panel src-shared" style={{ padding: '12px 14px', marginBottom: 12 }}>
      <div className="panel-section-title" style={{ marginTop: 0 }}>Estimated oxygen demand</div>
      <div className="grid-2">
        <div className="field">
          <label className="field-label">State</label>
          <select className="control" value={state} onChange={(e) => { setState(e.target.value); setDistrict(null) }} aria-label="Demand state">
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">District</label>
          <select className="control" value={district ?? ''} onChange={(e) => setDistrict(e.target.value || null)} aria-label="Demand district">
            <option value="">Whole state</option>
            {districtsOf(state).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <p style={{ margin: '8px 0 0' }}>
        Estimated demand for <strong>{area}</strong>:{' '}
        <strong>{formatNumber(Math.round(r.annualMT))} MT/yr</strong>{' '}
        (≈ {formatNumber(Math.round(r.annualMT * MT_TO_CUM))} cu m/yr).
      </p>
      <p className="small muted" style={{ margin: '2px 0 0' }}>
        From the baked case-mix demand model — adjust its factors on the{' '}
        <strong>District / State demand</strong> tab. The cost estimate below is equipment-based
        and independent of this figure.
      </p>
    </div>
  )
}
