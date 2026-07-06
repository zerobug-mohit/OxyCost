// Calculation detail for one source: the full numbers-substituted breakdown so
// the user can trace exactly how a figure was produced. Rendered inline inside
// the "Calculation" output section, driven by its Scenario + Source toggles.
// Each substituted input value is a clickable pill that jumps to that field on
// the left pane (only when the "Now" inputs are shown — see `onField`).
import { explainSource } from '../../engine'
import type { FormulaPart, InstanceInputs, SourceResult, SourceType } from '../../engine'
import { instanceColor } from '../shared/sourceColors'

interface Props {
  source: SourceType
  instance: InstanceInputs
  result: SourceResult
  /** When set, formula input values become links to the matching field. */
  onField?: (field: string) => void
}

/** Render a token formula: plain text runs + clickable input-value pills. */
function Formula({
  parts,
  onField,
}: {
  parts: FormulaPart[]
  onField?: (field: string) => void
}) {
  return (
    <span className="drill-formula">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : onField ? (
          <button
            key={i}
            type="button"
            className="calc-ref"
            onClick={() => onField(p.field)}
            title="Go to this input on the left"
          >
            {p.t}
          </button>
        ) : (
          <span key={i} className="calc-ref static" title="Shown for a saved scenario — load it to edit">
            {p.t}
          </span>
        ),
      )}
    </span>
  )
}

export function CalculationDetail({ source, instance, result, onField }: Props) {
  const e = explainSource(source, instance, result)
  const color = instanceColor(source, result.index)

  return (
    <div className="calc-detail" style={{ borderLeftColor: color }}>
      <div className="calc-detail-title">
        <span className="src-dot" style={{ background: color }} />
        {e.title}
      </div>

      <div className="drill-step-label">1 · Monthly output</div>
      <div className="drill-row">
        <span className="drill-name">{e.output.label}</span>
        <Formula parts={e.output.formula} onField={onField} />
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
              <td>
                <Formula parts={c.formula} onField={onField} />
              </td>
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
              <td>
                <Formula parts={p.formula} onField={onField} />
              </td>
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
  )
}
