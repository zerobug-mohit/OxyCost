// Reusable visual building blocks for the "How to use" and "Methodology" tabs —
// so the docs read as step-by-step visuals (flows, cards, callouts, formula
// cards) instead of walls of text.
import { Fragment } from 'react'
import type { ReactNode } from 'react'

/** A left-to-right numbered step flow (wraps to rows on narrow screens). */
export function FlowSteps({ steps }: { steps: { icon: string; title: string; body: string }[] }) {
  return (
    <div className="doc-flow">
      {steps.map((s, i) => (
        <Fragment key={s.title}>
          {i > 0 && <span className="doc-flow-arrow" aria-hidden>→</span>}
          <div className="doc-flow-step">
            <span className="doc-flow-num">{i + 1}</span>
            <span className="doc-flow-icon" aria-hidden>{s.icon}</span>
            <span className="doc-flow-title">{s.title}</span>
            <span className="doc-flow-body">{s.body}</span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

/** Responsive card grid. */
export function DocCards({ children, cols }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return <div className={`doc-cards cols-${cols ?? 2}`}>{children}</div>
}

export function DocCard({ icon, title, chip, children }: { icon?: string; title: string; chip?: string; children: ReactNode }) {
  return (
    <div className="doc-card">
      <div className="doc-card-head">
        {icon && <span className="doc-card-icon" aria-hidden>{icon}</span>}
        <span className="doc-card-title">{title}</span>
      </div>
      <div className="doc-card-body">{children}</div>
      {chip && <span className="doc-card-chip">{chip}</span>}
    </div>
  )
}

/** The input colour-code, shown as three visual cards. */
export function LegendCards() {
  return (
    <div className="doc-legend">
      <div className="doc-legend-card req">
        <span className="doc-legend-swatch" />
        <span className="doc-legend-label">Red · required</span>
        <span className="doc-legend-desc">A value you must enter — the field is still empty.</span>
      </div>
      <div className="doc-legend-card opt">
        <span className="doc-legend-swatch" />
        <span className="doc-legend-label">Yellow · pre-filled default</span>
        <span className="doc-legend-desc">A starting value we provide. Type over it with your real figure if you have one.</span>
      </div>
      <div className="doc-legend-card entered">
        <span className="doc-legend-swatch" />
        <span className="doc-legend-label">Green · your value</span>
        <span className="doc-legend-desc">A figure you entered or changed from the default.</span>
      </div>
    </div>
  )
}

/** A highlighted tip / note box. */
export function Callout({ children, icon = '💡' }: { children: ReactNode; icon?: string }) {
  return (
    <div className="doc-callout">
      <span className="doc-callout-icon" aria-hidden>{icon}</span>
      <div>{children}</div>
    </div>
  )
}

/** Inputs → engine → output pipeline diagram. */
export function Pipeline({ boxes }: { boxes: { icon: string; label: string; sub: string }[] }) {
  return (
    <div className="doc-pipeline">
      {boxes.map((b, i) => (
        <Fragment key={b.label}>
          {i > 0 && <span className="doc-pipeline-arrow" aria-hidden>→</span>}
          <div className="doc-pipeline-box">
            <span className="doc-pipeline-icon" aria-hidden>{b.icon}</span>
            <span className="doc-pipeline-label">{b.label}</span>
            <span className="doc-pipeline-sub">{b.sub}</span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

/** A formula presented as a card: a plain-English "reads as" line + the code. */
export function FormulaCard({ reads, code }: { reads?: string; code: string }) {
  return (
    <div className="doc-formula">
      {reads && <p className="doc-formula-reads">{reads}</p>}
      <pre className="calc-block">{code}</pre>
    </div>
  )
}
