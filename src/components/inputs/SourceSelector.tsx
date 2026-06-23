// Step 2: choose how many of each source type the facility has. Each count
// spawns that many input panels in Step 3. Setting a count to 0 removes the
// source from the comparison.
import type { SourceType } from '../../engine'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  counts: Record<SourceType, number>
  onChange: (source: SourceType, count: number) => void
}

const SOURCES: {
  key: SourceType
  title: string
  desc: string
  tip: string
  effect: string
}[] = [
  {
    key: 'psa',
    title: 'PSA plants',
    desc: 'On-site generation from ambient air',
    tip: 'Each plant is costed separately with its own capacity, power and run hours.',
    effect: 'Add one row per physical plant; their outputs add toward your demand.',
  },
  {
    key: 'lmo',
    title: 'LMO tanks',
    desc: 'Bulk cryogenic, tanker-delivered',
    tip: 'Each tank has its own consumption, rental and salary.',
    effect: 'Add one per cryogenic vessel; useful if tanks serve different blocks.',
  },
  {
    key: 'cylinder',
    title: 'Cylinder lines',
    desc: 'Portable, supplier-refilled',
    tip: 'Add a line per cylinder type or supplier contract (e.g. one D-type, one B-type).',
    effect: 'Each line has its own type, refill cost and monthly count.',
  },
  {
    key: 'oc',
    title: 'Concentrator groups',
    desc: 'Bedside, low-purity supplement',
    tip: 'Group identical concentrators together; set the number of units inside each group.',
    effect: 'Each group adds a column plus a clinical-limitations note.',
  },
]

const MAX = 8

export function SourceSelector({ counts, onChange }: Props) {
  return (
    <div className="source-checks">
      {SOURCES.map((s) => {
        const n = counts[s.key]
        return (
          <div key={s.key} className={`source-check src-${s.key} ${n > 0 ? 'on' : ''}`}>
            <div style={{ flex: 1 }}>
              <span className="sc-title">
                {s.title} <Tooltip text={s.tip} effect={s.effect} />
              </span>
              <br />
              <span className="sc-desc">{s.desc}</span>
            </div>
            <div className="stepper" role="group" aria-label={`Number of ${s.title}`}>
              <button
                type="button"
                aria-label={`Remove one ${s.title}`}
                disabled={n === 0}
                onClick={() => onChange(s.key, Math.max(0, n - 1))}
              >
                −
              </button>
              <span className="stepper-val">{n}</span>
              <button
                type="button"
                aria-label={`Add one ${s.title}`}
                disabled={n >= MAX}
                onClick={() => onChange(s.key, Math.min(MAX, n + 1))}
              >
                +
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
