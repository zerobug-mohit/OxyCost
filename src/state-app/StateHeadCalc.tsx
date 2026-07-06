// Inline calculation breakdown for one aggregate expense head in the state
// planner's cost table. An aggregate head is the sum, over every facility size
// band and infrastructure sub-band, of (facilities × per-facility cost). This
// shows each contributing line with a numbers-substituted, clickable formula
// (pills jump to the input on the left) and how it rolls up to the head total.
import type { BandKey, StatePart, StateRates, StateResult } from '../state-engine'
import { explainFacilityHeads } from '../state-engine'
import { formatINR } from '../utils/format'
import { focusInputField } from '../utils/focusField'

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

const fac = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 })

export function HeadCalc({
  headKey,
  result,
  rates,
}: {
  headKey: string
  result: StateResult
  rates: StateRates
}) {
  const rows: {
    band: BandKey
    bandLabel: string
    subLabel: string
    count: number
    perFac: number
    contribution: number
    formula: StatePart[]
  }[] = []

  for (const b of result.byBand) {
    if (b.count <= 0) continue
    for (const s of b.subBands) {
      if (s.share < 0.005) continue
      const hh = explainFacilityHeads(s.profile, rates).find((h) => h.key === headKey)
      if (!hh || hh.annual <= 0) continue
      rows.push({
        band: b.band,
        bandLabel: b.label,
        subLabel: s.label,
        count: s.count,
        perFac: hh.annual,
        contribution: s.count * hh.annual,
        formula: hh.formula,
      })
    }
  }

  if (rows.length === 0) {
    return <p className="small muted head-calc-empty">No facilities contribute to this cost.</p>
  }

  const total = rows.reduce((sum, r) => sum + r.contribution, 0)

  return (
    <div className="head-calc">
      <p className="head-calc-intro">
        Summed across every facility size and type — the{' '}
        <span className="calc-ref static">highlighted values</span> are your inputs; click one to
        jump to it on the left.
      </p>
      {rows.map((r, i) => (
        <div className="head-calc-row" key={i}>
          <div className="head-calc-cap">
            {r.bandLabel} · {r.subLabel} — {fac(r.count)} {r.count === 1 ? 'facility' : 'facilities'}
          </div>
          <div className="head-calc-body">
            <Formula parts={r.formula} band={r.band} />
            <span className="head-calc-eq">
              {' '}= {formatINR(r.perFac, 0)}/facility × {fac(r.count)} ={' '}
              <strong>{formatINR(r.contribution, 0)}</strong>
            </span>
          </div>
        </div>
      ))}
      {rows.length > 1 && (
        <div className="head-calc-total">
          Total for this head = <strong>{formatINR(total, 0)}</strong>
        </div>
      )}
    </div>
  )
}
