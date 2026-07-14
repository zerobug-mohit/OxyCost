// Explains the input-field colour coding: green = a value you entered, yellow =
// a pre-filled default, red = a required field still empty. Shown inside each
// source panel so it is always near the fields.

export function FieldLegend() {
  return (
    <div className="field-legend">
      <span className="lg">
        <span className="legend-swatch entered" /> Green — your value
      </span>
      <span className="lg">
        <span className="legend-swatch opt" /> Yellow — pre-filled default, update with actual values if known
      </span>
      <span className="lg">
        <span className="legend-swatch req" /> Red — required field, enter a value
      </span>
    </div>
  )
}
