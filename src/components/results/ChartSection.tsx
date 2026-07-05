// Wraps a chart in its own section with a heading, a collapsible "how to read
// it" explainer, the chart itself, and a data-driven insight callout.
import { useState, type ReactNode } from 'react'
import { Tooltip } from '../shared/Tooltip'
import { protectUnits } from '../../utils/format'

interface Props {
  title: string
  tip?: string
  howToRead: ReactNode
  insight?: ReactNode
  /** Optional control shown at the section's top-right (e.g. scenario toggle). */
  headerRight?: ReactNode
  children: ReactNode
}

export function ChartSection({ title, tip, howToRead, insight, headerRight, children }: Props) {
  const [howOpen, setHowOpen] = useState(false)
  return (
    <section className="chart-section">
      <div className="chart-section-header">
        <h3 className="chart-section-title">
          {title}
          {tip && <Tooltip text={tip} />}
        </h3>
        {headerRight}
      </div>
      <button
        type="button"
        className="how-to-toggle"
        aria-expanded={howOpen}
        onClick={() => setHowOpen((o) => !o)}
      >
        <span className="mini-badge">How to read</span>
        <span className="how-to-caret">{howOpen ? '▾' : '▸'}</span>
      </button>
      {howOpen && <p className="how-to">{howToRead}</p>}
      {children}
      {insight && (
        <p className="insight">
          <span className="mini-badge insight-badge">Insight</span>{' '}
          {typeof insight === 'string' ? protectUnits(insight) : insight}
        </p>
      )}
    </section>
  )
}
