// Banner for caveats, warnings, and OC limitations (spec section 9b, 4d).
import type { ReactNode } from 'react'

interface InfoBannerProps {
  kind?: 'info' | 'warn' | 'danger'
  title?: string
  items?: string[]
  children?: ReactNode
}

export function InfoBanner({ kind = 'info', title, items, children }: InfoBannerProps) {
  return (
    <div className={`banner ${kind}`} role={kind === 'info' ? 'note' : 'alert'}>
      {title && <strong>{title}</strong>}
      {children}
      {items && items.length > 0 && (
        <ul>
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
