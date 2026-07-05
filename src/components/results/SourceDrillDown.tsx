// Drill-down calculation panel for one source. Triggered by clicking a row,
// bar, or line elsewhere in the results — shows the full numbers-substituted
// calculation so the user can trace exactly how the figure was produced.
// Rendered as a centred modal so it's visible wherever the pane is scrolled.
import { useEffect } from 'react'
import { explainSource } from '../../engine'
import type { InstanceInputs, SourceResult, SourceType } from '../../engine'
import { instanceColor } from '../shared/sourceColors'

interface Props {
  source: SourceType
  instance: InstanceInputs
  result: SourceResult
  onClose: () => void
}

export function SourceDrillDown({ source, instance, result, onClose }: Props) {
  const e = explainSource(source, instance, result)
  const color = instanceColor(source, result.index)

  // Close on Escape, and lock the page behind the modal while it's open.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="drill-overlay" role="presentation" onClick={onClose}>
      <div
        className="drill"
        style={{ borderLeftColor: color }}
        role="dialog"
        aria-modal="true"
        aria-label={`${e.title} — how this is calculated`}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="drill-head">
          <h3>
            <span className="src-dot" style={{ background: color }} />
            {e.title} — how this is calculated
          </h3>
          <button className="btn-reset" onClick={onClose} aria-label="Close calculation detail">
            close
          </button>
        </div>

      <div className="drill-step-label">1 · Monthly output</div>
      <div className="drill-row">
        <span className="drill-name">{e.output.label}</span>
        <span className="drill-formula">{e.output.formula}</span>
        <span className="drill-value">{e.output.value}</span>
      </div>

      <div className="drill-step-label">2 · Monthly cost components</div>
      <table className="drill-table">
        <tbody>
          {e.components.map((c) => (
            <tr key={c.label}>
              <td className="drill-name">
                {c.label}
                {c.variable && <span className="var-tag">variable</span>}
              </td>
              <td className="drill-formula">{c.formula}</td>
              <td className="drill-value">{c.value}</td>
            </tr>
          ))}
          <tr className="drill-total">
            <td className="drill-name">Total monthly cost</td>
            <td className="drill-formula">sum of the components above</td>
            <td className="drill-value">{e.totalValue}</td>
          </tr>
        </tbody>
      </table>

      <div className="drill-step-label">3 · Cost per cu m</div>
      <table className="drill-table">
        <tbody>
          {e.perUnit.map((p) => (
            <tr key={p.label}>
              <td className="drill-name">{p.label}</td>
              <td className="drill-formula">{p.formula}</td>
              <td className="drill-value">{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

        {result.notes.length > 0 && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Note: {result.notes.join(' ')}
          </p>
        )}
      </div>
    </div>
  )
}
