// Inline per-unit "unit economics" line for a facility input field: the monthly
// cost that one unit of the input drives, with clickable pills that jump to the
// related field in the same panel. Mirrors the output-side breakdown, in reverse.
import type { EconPart } from '../../engine'
import { focusFieldFrom } from '../../utils/focusField'

export function FieldEcon({ parts }: { parts: EconPart[] }) {
  return (
    <p className="field-econ">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <button
            key={i}
            type="button"
            className="calc-ref"
            title="Go to this field"
            onClick={(e) => focusFieldFrom(e.currentTarget, p.field)}
          >
            {p.t}
          </button>
        ),
      )}
    </p>
  )
}
