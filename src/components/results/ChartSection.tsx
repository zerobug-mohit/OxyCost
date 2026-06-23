// Wraps a chart in its own section with a heading, a "how to read it"
// explainer, the chart itself, and a data-driven insight callout.
import type { ReactNode } from 'react'
import { Tooltip } from '../shared/Tooltip'
import { protectUnits } from '../../utils/format'

interface Props {
  title: string
  tip?: string
  howToRead: ReactNode
  insight?: ReactNode
  children: ReactNode
}

export function ChartSection({ title, tip, howToRead, insight, children }: Props) {
  return (
    <section className="chart-section">
      <h3 className="chart-section-title">
        {title}
        {tip && <Tooltip text={tip} />}
      </h3>
      <p className="how-to">
        <span className="mini-badge">How to read</span> {howToRead}
      </p>
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
