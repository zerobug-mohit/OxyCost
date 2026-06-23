// Explanation tooltip shown as an (i) marker (spec section 9c).
// Rendered through a portal with fixed positioning so it is never clipped by a
// parent's overflow (table scroll wrappers, collapsible panels) and is clamped
// to the viewport so it cannot be cut off at the screen edges.
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  text: string
  effect?: string
}

const WIDTH = 264

export function Tooltip({ text, effect }: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: true,
  })

  function show() {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let left = r.left + r.width / 2 - WIDTH / 2
    left = Math.max(8, Math.min(left, window.innerWidth - WIDTH - 8))
    const above = r.top > 180
    const top = above ? r.top - 8 : r.bottom + 8
    setPos({ top, left, above })
    setOpen(true)
  }
  function hide() {
    setOpen(false)
  }

  const aria = effect ? `${text} ${effect}` : text

  return (
    <span
      className="tip"
      ref={ref}
      tabIndex={0}
      role="img"
      aria-label={aria}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      i
      {open &&
        createPortal(
          <span
            className="tip-pop"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: WIDTH,
              transform: pos.above ? 'translateY(-100%)' : 'none',
            }}
          >
            {text}
            {effect && <span className="tip-effect">{effect}</span>}
          </span>,
          document.body,
        )}
    </span>
  )
}
