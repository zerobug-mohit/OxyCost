// The interactive coach-mark overlay: dims the screen, spotlights the current
// step's target element, and shows a bubble with the explanation + controls.
// Targetless steps render a centered card over a plain dim backdrop.
import { useLayoutEffect, useState } from 'react'
import type { TourStep } from './tourData'

interface Props {
  steps: TourStep[]
  index: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

interface Box { top: number; left: number; width: number; height: number }
const PAD = 6

export function TourOverlay({ steps, index, onPrev, onNext, onClose }: Props) {
  const step = steps[index]
  const [box, setBox] = useState<Box | null>(null)

  // Locate the target (retrying while the app navigates/renders), open any
  // collapsed <details> ancestors, scroll it into view, and measure it.
  useLayoutEffect(() => {
    setBox(null)
    if (!step.target) return
    let raf = 0
    let tries = 0
    const measure = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    const locate = () => {
      const el = document.querySelector(step.target as string) as HTMLElement | null
      if (el) {
        let n: HTMLElement | null = el
        while (n && n !== document.body) {
          if (n.tagName === 'DETAILS') (n as HTMLDetailsElement).open = true
          n = n.parentElement
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        raf = requestAnimationFrame(() => raf = requestAnimationFrame(() => measure(el)))
      } else if (tries++ < 30) {
        raf = requestAnimationFrame(locate)
      }
    }
    locate()
    const remeasure = () => {
      const el = document.querySelector(step.target as string) as HTMLElement | null
      if (el) measure(el)
    }
    window.addEventListener('resize', remeasure)
    window.addEventListener('scroll', remeasure, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('scroll', remeasure, true)
    }
  }, [step.target, index])

  const isFirst = index === 0
  const isLast = index === steps.length - 1

  // Bubble position: below the target if there's room, else above; clamped to
  // the viewport. Centered when there's no target.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const BW = Math.min(340, vw - 24)
  let bubbleStyle: React.CSSProperties
  if (box) {
    const below = box.top + box.height + 12 + 190 < vh
    const top = below ? box.top + box.height + 14 : Math.max(12, box.top - 14 - 190)
    let left = box.left + box.width / 2 - BW / 2
    left = Math.max(12, Math.min(left, vw - BW - 12))
    bubbleStyle = { top, left, width: BW }
  } else {
    bubbleStyle = { top: '50%', left: '50%', width: BW, transform: 'translate(-50%, -50%)' }
  }

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Tutorial">
      {box ? (
        <div
          className="tour-spotlight"
          style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
        />
      ) : (
        <div className="tour-backdrop" />
      )}

      <div className="tour-bubble" style={bubbleStyle}>
        <div className="tour-bubble-head">
          <span className="tour-step-count">Step {index + 1} of {steps.length}</span>
          <button type="button" className="tour-close" onClick={onClose} title="Exit tutorial" aria-label="Exit tutorial">✕</button>
        </div>
        <div className="tour-bubble-title">{step.title}</div>
        <p className="tour-bubble-body">{step.body}</p>
        <div className="tour-bubble-actions">
          <button type="button" className="tour-btn ghost" onClick={onClose}>Exit</button>
          <span className="tour-bubble-nav">
            {!isFirst && <button type="button" className="tour-btn" onClick={onPrev}>Back</button>}
            <button type="button" className="tour-btn primary" onClick={onNext}>{isLast ? 'Finish' : 'Next'}</button>
          </span>
        </div>
      </div>
    </div>
  )
}
