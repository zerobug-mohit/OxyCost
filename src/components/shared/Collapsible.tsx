// Generic collapsible section built on <details>/<summary>. Uncontrolled: the
// `defaultOpen` value seeds the initial state and user toggles persist across
// re-renders (the prop is constant, so React never resets it).
import type { ReactNode } from 'react'

interface CollapsibleProps {
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Collapsible({
  summary,
  children,
  defaultOpen = false,
  className = '',
}: CollapsibleProps) {
  return (
    <details className={className} open={defaultOpen}>
      <summary className="collapse-summary">
        <span className="collapse-caret" aria-hidden>
          ▸
        </span>
        <span className="collapse-summary-content">{summary}</span>
      </summary>
      <div className="collapse-body">{children}</div>
    </details>
  )
}
