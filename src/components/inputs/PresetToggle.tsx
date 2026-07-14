// Reusable preset-aware numeric field (spec section 5b, 7 inputs/PresetToggle).
// Shows the label + tooltip, the current value, the default it came from, and a
// "reset" control to revert to the default once overridden.
import type { EconPart } from '../../engine'
import { NumberInput } from '../shared/NumberInput'
import { Tooltip } from '../shared/Tooltip'
import { FieldEcon } from '../shared/FieldEcon'

interface PresetToggleProps {
  label: string
  value: number
  onChange: (v: number) => void
  /** Default/preset value. Shown as a hint; enables the reset control. */
  preset?: number
  tooltip?: string
  /** Optional "what changing this does" line, shown under the tooltip text. */
  tooltipEffect?: string
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  /** Optional formatter for the "default: X" hint. */
  formatPreset?: (v: number) => string
  /**
   * Override the colour tone. By default a field with a `preset` is treated as
   * optional (amber) and one without as required (red).
   */
  level?: 'required' | 'optional'
  /** Field must hold a value > 0; shows red while empty. */
  required?: boolean
  /** Extra hint line (e.g. peer range from the benchmark dataset). */
  hint?: string
  /** Inline reality-check flag rendered under the field. */
  flag?: import('react').ReactNode
  /** Input property name, so the Calculation panel can link back to this field. */
  field?: string
  /** Inline per-unit economics line (pills jump to related fields in this panel). */
  econ?: EconPart[] | null
}

export function PresetToggle({
  label,
  value,
  onChange,
  preset,
  tooltip,
  tooltipEffect,
  prefix,
  suffix,
  min,
  max,
  step,
  formatPreset,
  level,
  required,
  hint,
  flag,
  field,
  econ,
}: PresetToggleProps) {
  const overridden = preset !== undefined && value !== preset
  const isRequired = required ?? (level ? level === 'required' : preset === undefined)
  const filled = Number.isFinite(value) && value > 0
  // Green = user changed it from the default; yellow = at default; red = required & empty.
  const tone: 'req' | 'opt' | 'entered' =
    isRequired && !filled ? 'req' : overridden ? 'entered' : 'opt'
  const resolvedLevel = isRequired ? 'required' : 'optional'
  return (
    <div className={`field lvl-${resolvedLevel}`} data-field={field}>
      <label className="field-label">
        {label}
        {tooltip && <Tooltip text={tooltip} effect={tooltipEffect} />}
      </label>
      <div className="field-row">
        <NumberInput
          value={value}
          onChange={onChange}
          prefix={prefix}
          suffix={suffix}
          min={min}
          max={max}
          step={step}
          ariaLabel={label}
          tone={tone}
        />
        {overridden && (
          <button
            type="button"
            className="btn-reset"
            title={`Reset to default (${formatPreset ? formatPreset(preset!) : preset})`}
            onClick={() => onChange(preset!)}
          >
            ↺ reset
          </button>
        )}
      </div>
      {preset !== undefined && !overridden && (
        <span className="preset-hint">
          Default: {formatPreset ? formatPreset(preset) : preset}
        </span>
      )}
      {hint && <span className="preset-hint">{hint}</span>}
      {econ && econ.length > 0 && <FieldEcon parts={econ} />}
      {flag}
    </div>
  )
}
