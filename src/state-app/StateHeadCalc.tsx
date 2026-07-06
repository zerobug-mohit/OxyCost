// Inline calculation breakdown for one aggregate expense head in the state
// planner's cost table. It leads with a plain "who pays this" line, then shows
// the working: in estimate mode, one line per facility size (facilities × a
// typical facility's cost); in direct mode, the district totals × rates. Every
// input value is a clickable pill that jumps to it on the left.
import type { BandKey, CostGroup, DirectInputs, StateMode, StatePart, StateRates, StateResult } from '../state-engine'
import { explainDirectHeads, explainFacilityHeads } from '../state-engine'
import { formatINR } from '../utils/format'
import { focusInputField } from '../utils/focusField'

/** Plain-language description of which facilities a cost group applies to. */
const WHO: Record<CostGroup, string> = {
  psa: 'facilities that run a PSA plant',
  lmo: 'facilities that have an LMO tank',
  cylinder: 'facilities that use cylinders',
  oc: 'facilities that have oxygen concentrators',
  mgps: 'facilities with an MGPS pipeline',
  oximeter: 'every facility (assumed pulse oximeters)',
  hr: 'facilities with dedicated oxygen technicians',
  training: 'every facility (staff to train)',
  iec: 'every facility (by size tier)',
}

/** Scope for the pill link: rate tray, a band's model panel, or direct totals. */
function scopeFor(target: 'rate' | 'band' | 'direct', band: BandKey): string {
  if (target === 'rate') return 'rates'
  if (target === 'direct') return 'direct'
  return `band-${band}`
}

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
            title="Go to this input on the left"
            onClick={() => focusInputField(scopeFor(p.target, band), p.field)}
          >
            {p.t}
          </button>
        ),
      )}
    </span>
  )
}

const fac = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 })

interface Props {
  headKey: string
  result: StateResult
  rates: StateRates
  mode: StateMode
  direct: DirectInputs
}

export function HeadCalc({ headKey, result, rates, mode, direct }: Props) {
  // Direct mode: one line straight from the district totals.
  if (mode === 'direct') {
    const hh = explainDirectHeads(direct, rates).find((h) => h.key === headKey)
    if (!hh) return <p className="small muted head-calc-empty">Not applicable.</p>
    return (
      <div className="head-calc">
        <p className="head-calc-intro">
          From your district equipment totals. The{' '}
          <span className="calc-ref static">highlighted values</span> are your inputs; click one
          to jump to it on the left.
        </p>
        <div className="head-calc-row">
          <div className="head-calc-body">
            <Formula parts={hh.formula} band="60+" />
            <span className="head-calc-eq">
              {' '}= <strong>{formatINR(hh.annual, 0)}</strong>
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Estimate mode: one line per facility size band (typical facility × count).
  let group: CostGroup | null = null
  const lines: { band: BandKey; bandShort: string; count: number; perFac: number; formula: StatePart[] }[] = []
  for (const b of result.byBand) {
    if (b.count <= 0) continue
    const hh = explainFacilityHeads(b.profile, rates).find((h) => h.key === headKey)
    if (!hh || hh.annual <= 0) continue
    group = hh.group
    lines.push({
      band: b.band,
      bandShort: b.label.split(' (')[0],
      count: b.count,
      perFac: hh.annual,
      formula: hh.formula,
    })
  }

  if (lines.length === 0 || !group) {
    return <p className="small muted head-calc-empty">No facilities contribute to this cost.</p>
  }

  const total = lines.reduce((sum, l) => sum + l.count * l.perFac, 0)

  return (
    <div className="head-calc">
      <p className="head-calc-intro">
        Applies to <strong>{WHO[group]}</strong>. It is summed across your facility sizes — a
        typical facility's cost × how many facilities you have that size (a{' '}
        <strong>&ldquo;% have …&rdquo;</strong> factor carries how common the equipment is). The{' '}
        <span className="calc-ref static">highlighted values</span> are your inputs; click one to
        jump to it on the left.
      </p>
      {lines.map((l, i) => (
        <div className="head-calc-row" key={i}>
          <div className="head-calc-cap">
            {fac(l.count)} {l.bandShort} {l.count === 1 ? 'facility' : 'facilities'}
          </div>
          <div className="head-calc-body">
            each: <Formula parts={l.formula} band={l.band} />
            <span className="head-calc-eq">
              {' '}= {formatINR(l.perFac, 0)}/yr × {fac(l.count)} ={' '}
              <strong>{formatINR(l.count * l.perFac, 0)}</strong>
            </span>
          </div>
        </div>
      ))}
      {lines.length > 1 && (
        <div className="head-calc-total">
          Total for this head = <strong>{formatINR(total, 0)}</strong>
        </div>
      )}
    </div>
  )
}
