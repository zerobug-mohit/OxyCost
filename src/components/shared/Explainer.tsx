// Explainer container — a subtle callout that tells the user how to operate a
// section of the dashboard (requirement 4).
import type { ReactNode } from 'react'

interface ExplainerProps {
  children: ReactNode
}

export function Explainer({ children }: ExplainerProps) {
  return <div className="explainer">{children}</div>
}
