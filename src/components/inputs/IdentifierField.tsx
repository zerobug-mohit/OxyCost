// A free-text identifier to tell otherwise-identical units apart. Required only
// when two or more units of the same type/capacity exist (set via `required`);
// otherwise optional.
import type { ItemIdentity } from '../../engine'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  value: ItemIdentity
  onChange: (patch: ItemIdentity) => void
  /** True when 2+ units of the same variant exist — then it must be filled. */
  required?: boolean
}

export function IdentifierField({ value, onChange, required = false }: Props) {
  return (
    <div className={`field lvl-${required ? 'required' : 'optional'}`}>
      <label className="field-label">
        Identifier{' '}
        <span className="muted small">
          {required ? '(required — multiple identical units)' : '(optional)'}
        </span>
        <Tooltip
          text="A label to tell this unit apart from others — e.g. manufacturer, supplier, donor or asset ID. It does not affect any cost; it names the unit in the results."
          effect="Required only when you have two or more units of the same type/capacity, so the results can distinguish them."
        />
      </label>
      <input
        className={`text-input ${required ? 'req' : 'opt'}`}
        type="text"
        placeholder="Add any identifier to differentiate this from others — e.g. Manufacturer, Supplier"
        value={value.item_id_value ?? ''}
        onChange={(e) => onChange({ item_id_value: e.target.value })}
        aria-label="Identifier"
      />
    </div>
  )
}
