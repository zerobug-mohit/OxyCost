// Lets the user tag a source instance with an identifier of their choice
// (manufacturer, donor, item/asset id, …) so duplicate units are easy to tell
// apart. The chosen identifier flows into the result label.
import type { ItemIdentity } from '../../engine'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  value: ItemIdentity
  onChange: (patch: ItemIdentity) => void
}

const ID_TYPES = ['Manufacturer', 'Donor', 'Item ID', 'Asset tag', 'Supplier', 'Other']

export function IdentifierField({ value, onChange }: Props) {
  return (
    <div className="field lvl-required">
      <label className="field-label">
        Identifier
        <Tooltip
          text="A label of your choice to tell this unit apart from others — pick the kind (manufacturer, donor, asset id…) and type the value."
          effect="It does not affect any cost; it just names the row, bar and line for this unit in the results."
        />
      </label>
      <div className="field-row">
        <select
          className="control"
          style={{ flex: '0 0 38%' }}
          value={value.item_id_type ?? 'Manufacturer'}
          onChange={(e) => onChange({ ...value, item_id_type: e.target.value })}
          aria-label="Identifier type"
        >
          {ID_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className="text-input req"
          type="text"
          placeholder={`e.g. ${exampleFor(value.item_id_type)}`}
          value={value.item_id_value ?? ''}
          onChange={(e) => onChange({ ...value, item_id_value: e.target.value })}
          aria-label="Identifier value"
        />
      </div>
    </div>
  )
}

function exampleFor(type?: string): string {
  switch (type) {
    case 'Donor':
      return 'PM CARES'
    case 'Item ID':
      return 'PSA-2021-07'
    case 'Asset tag':
      return 'OX/DH/014'
    case 'Supplier':
      return 'Inox Air'
    default:
      return 'Inox / Airox'
  }
}
