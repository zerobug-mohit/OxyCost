// Explains the input-field colour coding: required (red) vs optional preset
// (amber). Shown inside each source panel so it is always near the fields.

export function FieldLegend() {
  return (
    <div className="field-legend">
      <span className="lg">
        <span className="legend-swatch req" /> Required — you must enter
      </span>
      <span className="lg">
        <span className="legend-swatch opt" /> Optional — preset you may change
      </span>
    </div>
  )
}
