// Top-of-panel row: the field-colour legend plus a "Reset all" button that
// clears the required fields and restores the pre-filled defaults for this unit.
import { FieldLegend } from './FieldLegend'

interface Props {
  onReset: () => void
}

export function PanelToolbar({ onReset }: Props) {
  return (
    <div className="panel-toolbar">
      <FieldLegend />
      <button
        type="button"
        className="btn-reset-all"
        onClick={onReset}
        title="Clear the required fields and restore the pre-filled defaults for this unit"
      >
        ↺ Reset all
      </button>
    </div>
  )
}
