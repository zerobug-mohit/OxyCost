// Transparent "Calculation" section for the state/district planner — the analog
// of the facility calculator's Calculation section. Pick a facility size band,
// then an infrastructure sub-band (archetype), and see every per-facility
// expense head with its numbers-substituted formula. Each input value is a
// clickable pill that jumps to that field on the left (a state rate, or a
// per-band model override).
import { useState } from 'react'
import type { BandKey, StatePart, StateRates, StateResult } from '../state-engine'
import { explainFacilityHeads } from '../state-engine'
import { formatINR, formatNumber } from '../utils/format'
import { focusInputField } from '../utils/focusField'

interface Props {
  result: StateResult
  rates: StateRates
}

/** Render a token formula: text runs + clickable input-value pills. */
function Formula({ parts, band }: { parts: StatePart[]; band: BandKey }) {
  return (
    <span className="drill-formula">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <button
            key={i}
            type="button"
            className="calc-ref"
            title={p.target === 'rate' ? 'Go to this state rate on the left' : 'Go to this model value on the left'}
            onClick={() => focusInputField(p.target === 'rate' ? 'rates' : `band-${band}`, p.field)}
          >
            {p.t}
          </button>
        ),
      )}
    </span>
  )
}

export function StateCalculation({ result, rates }: Props) {
  const bands = result.byBand.filter((b) => b.count > 0)
  const [bandKey, setBandKey] = useState<BandKey | null>(null)
  const [subKey, setSubKey] = useState<string | null>(null)

  if (bands.length === 0) return null

  const selBand = bands.find((b) => b.band === bandKey) ?? bands[0]
  const subs = selBand.subBands.filter((s) => s.share >= 0.005)
  const selSub = subs.find((s) => s.key === subKey) ?? subs[0]
  if (!selSub) return null

  const heads = explainFacilityHeads(selSub.profile, rates)
  const perFacility = heads.reduce((s, h) => s + h.annual, 0)

  return (
    <section className="chart-section">
      <h3 className="chart-section-title">Calculation — how each cost is built</h3>
      <p className="how-to" style={{ margin: '4px 0 10px' }}>
        Pick a <strong>facility size</strong> and an <strong>infrastructure type</strong> to
        see the yearly cost of one such facility, head by head. The{' '}
        <span className="calc-ref static">highlighted values</span> are your inputs — click one
        to jump to it on the left (a state rate, or a per-band model value).
      </p>

      <div className="calc-toggles">
        <div className="calc-toggle-group">
          <span className="calc-toggle-label">Facility size</span>
          <div className="scenario-toggle" role="group" aria-label="Facility size band">
            {bands.map((b) => (
              <button
                key={b.band}
                type="button"
                className={selBand.band === b.band ? 'active' : ''}
                onClick={() => {
                  setBandKey(b.band)
                  setSubKey(null)
                }}
                title={b.label}
              >
                {b.band}
              </button>
            ))}
          </div>
        </div>
        {subs.length > 1 && (
          <div className="calc-toggle-group">
            <span className="calc-toggle-label">Infrastructure type</span>
            <div className="scenario-toggle" role="group" aria-label="Infrastructure sub-band">
              {subs.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={selSub.key === s.key ? 'active' : ''}
                  onClick={() => setSubKey(s.key)}
                  title={`${s.label} — ${Math.round(s.share * 100)}% of ${selBand.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="calc-detail">
        <div className="calc-detail-title">
          {selBand.label} · {selSub.label}
        </div>
        <p className="small muted" style={{ margin: '0 0 8px' }}>
          One facility of this type · {Math.round(selSub.share * 100)}% of{' '}
          {formatNumber(selBand.count)} {selBand.label} {selBand.count === 1 ? 'facility' : 'facilities'}{' '}
          (≈{formatNumber(selSub.count)} {selSub.count === 1 ? 'facility' : 'facilities'}). Values
          weighted by how many facilities actually have each source (e.g. &ldquo;% have OC&rdquo;).
        </p>

        <div className="drill-step-label">Annual cost per facility · by expense head</div>
        <table className="drill-table">
          <tbody>
            {heads.map((h) => (
              <tr key={h.key}>
                <td className="drill-name">
                  {h.label}
                  {h.oneTime && <span className="state-onetime"> one-time</span>}
                </td>
                <td>
                  <Formula parts={h.formula} band={selBand.band} />
                </td>
                <td className="drill-value">{formatINR(h.annual, 0)}</td>
              </tr>
            ))}
            <tr className="drill-total">
              <td className="drill-name">Total per facility / year</td>
              <td className="drill-formula">sum of the heads above</td>
              <td className="drill-value">{formatINR(perFacility, 0)}</td>
            </tr>
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: 8 }}>
          The state total sums this across every facility and sub-band, then adds the
          contingency buffer. GST / taxes included in the rates.
        </p>
      </div>
    </section>
  )
}
