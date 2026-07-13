// Cost-view toggle: Opex only / Capex+Opex / Incremental (spec section 6c, 9b).
// Below the toggle, a clear explanation differentiates the three views — what
// each one covers and when to look at it.
import type { CostView } from '../../engine'

interface Props {
  value: CostView
  onChange: (v: CostView) => void
}

interface ViewInfo {
  key: CostView
  label: string
  covers: string
  excludes: string
  use: string
}

const VIEWS: ViewInfo[] = [
  {
    key: 'opex_only',
    label: 'Opex only',
    covers:
      'all running costs — electricity, salaries, maintenance/AMC, refilling & handling, hydrostatic testing',
    excludes: 'capital: depreciation and equipment purchase amortization',
    use: 'you already own the equipment and just want the cheapest to operate',
  },
  {
    key: 'capex_opex',
    label: 'Capex + Opex',
    covers:
      'everything in Opex plus straight-line depreciation / capital amortization of the plant, tank, cylinders or units',
    excludes: 'nothing — this is the full, all-in cost of ownership',
    use: 'you are deciding whether to acquire or install a new source from scratch',
  },
  {
    key: 'incremental',
    label: 'Incremental',
    covers:
      'only the truly variable cost of one more cu m — PSA: electricity; LMO: refilling + handling; cylinders: a fresh refill; OC: electricity',
    excludes: 'all fixed costs, which are treated as already covered',
    use: 'you already run several sources and want to know which is cheapest for the next unit',
  },
]

export function IncrementalVsTotalToggle({ value, onChange }: Props) {
  const active = VIEWS.find((v) => v.key === value)!

  return (
    <div>
      <div className="view-toggle" role="tablist" aria-label="Cost view">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={value === v.key}
            className={value === v.key ? 'active' : ''}
            onClick={() => onChange(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="view-explain">
        <p>
          <strong>{active.label}:</strong> includes {active.covers}.{' '}
          <span className="muted">Excludes {active.excludes}.</span>
        </p>
        <p className="view-use">
          <strong>Look at this when</strong> {active.use}.
        </p>
        <div className="view-contrast">
          {VIEWS.filter((v) => v.key !== value).map((v) => (
            <span key={v.key} className="vc">
              <button className="link-btn" onClick={() => onChange(v.key)}>
                {v.label}
              </button>{' '}
              {v.key === 'opex_only'
                ? 'drops capital'
                : v.key === 'capex_opex'
                  ? 'adds capital'
                  : 'strips all fixed costs'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
