// A tiny density curve showing where the user's current value for a variable
// lands among the surveyed facilities — instant "is this typical?" feedback.
// Renders nothing for variables the survey didn't measure.
import { FIELD_SAMPLES } from '../state-engine'

const W = 190
const H = 40

export function MiniDistribution({ field, current }: { field: string; current: number }) {
  const values = FIELD_SAMPLES[field]
  if (!values || values.length < 5) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const lo = Math.min(min, current)
  const hi = Math.max(max, current)
  const span = hi - lo || 1

  // Binned + lightly smoothed density.
  const BINS = 24
  const counts = new Array(BINS).fill(0)
  for (const v of values) {
    const idx = Math.min(BINS - 1, Math.max(0, Math.floor(((v - lo) / span) * BINS)))
    counts[idx]++
  }
  const sm = counts.map((_, i) => {
    const a = counts[i - 1] ?? counts[i]
    const b = counts[i]
    const c = counts[i + 1] ?? counts[i]
    return (a + b + b + c) / 4
  })
  const maxC = Math.max(...sm, 1)

  const pts = sm.map((c, i) => {
    const x = (i / (BINS - 1)) * W
    const y = H - (c / maxC) * (H - 6) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `M0,${H} L${pts.join(' L')} L${W},${H} Z`
  const markerX = Math.max(0, Math.min(W, ((current - lo) / span) * W))

  const atOrBelow = values.filter((v) => v <= current).length
  const pctile = Math.round((atOrBelow / values.length) * 100)
  const caption =
    current > max
      ? `above all ${values.length} surveyed facilities`
      : current < min
        ? `below all ${values.length} surveyed facilities`
        : `higher than ${pctile}% of ${values.length} surveyed facilities`

  return (
    <div className="mini-dist" title={`Distribution across ${values.length} surveyed facilities`}>
      <svg width={W} height={H} aria-hidden preserveAspectRatio="none">
        <path d={area} fill="var(--c-primary-light)" stroke="var(--c-primary-mid)" strokeWidth={1} />
        <line x1={markerX} y1={0} x2={markerX} y2={H} stroke="var(--c-req)" strokeWidth={1.5} />
      </svg>
      <span className="mini-dist-cap">Your value {caption}</span>
    </div>
  )
}
