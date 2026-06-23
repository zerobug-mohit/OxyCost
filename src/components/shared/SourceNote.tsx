// A small italic provenance footnote shown at the bottom of an input panel,
// stating where its presets come from.
import type { ReactNode } from 'react'

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="source-note">{children}</p>
}
