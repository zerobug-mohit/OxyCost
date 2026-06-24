// Reusable preset-aware numeric field (spec section 5b, 7 inputs/PresetToggle).
// Shows the label + tooltip, the current value, the default it came from, and a
// "reset" control to revert to the default once overridden.
import { NumberInput } from '../shared/NumberInput'
import { Tooltip } from '../shared/Tooltip'

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
  /** Extra hint line (e.g. peer range from the benchmark dataset). */
  hint?: string
  /** Inline reality-check flag rendered under the field. */
  flag?: import('react').ReactNode
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
  hint,
  flag,
}: PresetToggleProps) {
  const overridden = preset !== undefined && value !== preset
  const resolvedLevel = level ?? (preset === undefined ? 'required' : 'optional')
  const tone = resolvedLevel === 'required' ? 'req' : 'opt'
  return (
    <div className={`field lvl-${resolvedLevel}`}>
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
      {flag}
    </div>
  )
}
