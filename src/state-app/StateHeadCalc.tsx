// Inline calculation breakdown for one aggregate expense head in the state
// planner's cost table. An aggregate head is the sum, over every facility size
// band and infrastructure sub-band, of (facilities × per-facility cost). It
// leads with a plain-language "who pays this" line, then shows one line per
// facility group (identical per-facility formulas are merged) with a
// numbers-substituted, clickable formula (pills jump to the input on the left).
import type { BandKey, CostGroup, StatePart, StateRates, StateResult } from '../state-engine'
import { explainFacilityHeads } from '../state-engine'
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
/** Groups counted by presence (0/1) — the line count is "facilities that have it". */
const PRESENCE: Partial<Record<CostGroup, string>> = {
  psa: 'with a PSA plant',
  lmo: 'with an LMO tank',
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

const fac = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 })
const partsText = (parts: StatePart[]) =>
  parts.map((p) => (typeof p === 'string' ? p : p.t)).join('')

interface Line {
  band: BandKey
  bandShort: string
  subLabels: string[]
  count: number
  perFac: number
  formula: StatePart[]
}

export function HeadCalc({
  headKey,
  result,
  rates,
}: {
  headKey: string
  result: StateResult
  rates: StateRates
}) {
  let group: CostGroup | null = null
  // Merge contributing (band × sub-band) rows that share the same per-facility
  // formula, so the user sees one clean "N facilities × cost" line per group.
  const merged = new Map<string, Line>()

  for (const b of result.byBand) {
    if (b.count <= 0) continue
    for (const s of b.subBands) {
      if (s.share < 0.005) continue
      const hh = explainFacilityHeads(s.profile, rates).find((h) => h.key === headKey)
      if (!hh || hh.annual <= 0) continue
      group = hh.group
      const sig = `${b.band}|${partsText(hh.formula)}`
      const existing = merged.get(sig)
      if (existing) {
        existing.count += s.count
        existing.subLabels.push(s.label)
      } else {
        merged.set(sig, {
          band: b.band,
          bandShort: b.label.split(' (')[0],
          subLabels: [s.label],
          count: s.count,
          perFac: hh.annual,
          formula: hh.formula,
        })
      }
    }
  }

  const lines = [...merged.values()]
  if (lines.length === 0 || !group) {
    return <p className="small muted head-calc-empty">No facilities contribute to this cost.</p>
  }

  const total = lines.reduce((sum, l) => sum + l.count * l.perFac, 0)
  const presence = group ? PRESENCE[group] : undefined

  return (
    <div className="head-calc">
      <p className="head-calc-intro">
        Applies to <strong>{WHO[group]}</strong>. It is summed across your facility sizes —
        each per-facility cost × how many of your facilities are that type, so your{' '}
        <strong>infrastructure mix</strong> drives these counts. The{' '}
        <span className="calc-ref static">highlighted values</span> are your inputs; click one to
        jump to it on the left.
      </p>
      {lines.map((l, i) => (
        <div className="head-calc-row" key={i}>
          <div className="head-calc-cap">
            {fac(l.count)} {l.bandShort} {presence ? presence : 'facilities'}
            {presence && ` (${l.subLabels.join(', ')})`}
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
