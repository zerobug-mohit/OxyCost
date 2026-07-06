// Oxygen concentrator input panel (spec section 4d). The limitations banner is
// rendered here and again with results.
import { DEFAULT_ELECTRICITY_RATE, OC_DEFAULTS, OC_LIMITATIONS } from '../../engine'
import type { OcInputs } from '../../engine'
import { PresetToggle } from './PresetToggle'
import { InfoBanner } from '../shared/InfoBanner'
import { Tooltip } from '../shared/Tooltip'
import { PanelMeta } from '../shared/PanelMeta'
import { PanelToolbar } from '../shared/PanelToolbar'
import { SourceNote } from '../shared/SourceNote'
import { Collapsible } from '../shared/Collapsible'
import { IdentifierField } from './IdentifierField'

interface Props {
  value: OcInputs
  onChange: (patch: Partial<OcInputs>) => void
  onReset: () => void
  instanceLabel?: string
  idRequired?: boolean
  idDuplicate?: boolean
  outputCuM?: number
  demand?: number
}

export function OcInputPanel({ value, onChange, onReset, instanceLabel, idRequired, idDuplicate, outputCuM, demand }: Props) {
  return (
    <details className="panel src-oc">
      <summary className="panel-head">
        <span className="panel-title">
          Concentrators {value.oc_output_lpm} LPM{instanceLabel ? ` ${instanceLabel}` : ''}
          <Tooltip
            text="Bedside devices concentrating O₂ from air. Low capex per unit but low flow and low purity — a supplement, not a primary supply."
            effect="Cost per cu m falls with more run hours (electricity is the only variable cost), but clinical limitations cap where they can be used."
          />
        </span>
        <span className="small muted">supplementary only</span>
      </summary>
      <div className="panel-body">
        <PanelMeta source="oc" outputCuM={outputCuM ?? 0} demand={demand ?? 0} />
        <p className="estimate-note">
          Concentrator output is highly sensitive to the deployed unit counts and run
          hours you enter — check the share of demand shown above and confirm it, as it
          is easy to overestimate.
        </p>
        <PanelToolbar onReset={onReset} />
        <InfoBanner kind="warn" title="Clinical limitations" items={OC_LIMITATIONS} />

        <div className="panel-section-title">Required — deployed &amp; functional units only</div>
        {idRequired && (
          <IdentifierField value={value} onChange={onChange} required duplicate={idDuplicate} />
        )}
        <p className="variant-note">
          Output <strong>{value.oc_output_lpm} LPM</strong> per unit — set in Step 2.
        </p>
        <div className="grid-2">
          <PresetToggle
            label="High-use units (≥8 h/day)"
            field="oc_high_use_units"
            value={value.oc_high_use_units}
            onChange={(v) => onChange({ oc_high_use_units: v })}
            min={0}
            hint="Working devices run 8 or more hours a day."
            tooltip="Count of deployed, functional concentrators run 8+ hours/day. Only deployed-functional units produce oxygen; units in storage or non-functional are excluded."
          />
          <PresetToggle
            label="Low-use units (<8 h/day)"
            field="oc_low_use_units"
            value={value.oc_low_use_units}
            onChange={(v) => onChange({ oc_low_use_units: v })}
            min={0}
            hint="Working devices run under 8 hours a day."
            tooltip="Count of deployed, functional concentrators run under 8 hours/day."
          />
        </div>

        <Collapsible className="subpanel" summary="Customize (presets) — defaults you can override">
        {!idRequired && (
          <IdentifierField value={value} onChange={onChange} required={false} duplicate={idDuplicate} />
        )}
        <div className="grid-2">
          <PresetToggle
            label="High-use hours / day"
            field="oc_high_use_hours"
            value={value.oc_high_use_hours}
            onChange={(v) => onChange({ oc_high_use_hours: v })}
            preset={OC_DEFAULTS.oc_high_use_hours}
            suffix="hrs"
            min={0}
            max={24}
            tooltip="Average daily run hours for the high-use group."
          />
          <PresetToggle
            label="Low-use hours / day"
            field="oc_low_use_hours"
            value={value.oc_low_use_hours}
            onChange={(v) => onChange({ oc_low_use_hours: v })}
            preset={OC_DEFAULTS.oc_low_use_hours}
            suffix="hrs"
            min={0}
            max={24}
            tooltip="Average daily run hours for the low-use group."
          />
          <PresetToggle
            label="Price per unit"
            field="oc_price_per_unit"
            value={value.oc_price_per_unit}
            onChange={(v) => onChange({ oc_price_per_unit: v })}
            preset={OC_DEFAULTS.oc_price_per_unit}
            prefix="₹"
            tooltip="Purchase price per concentrator (₹30,000–80,000)."
          />
          <PresetToggle
            label="Unit life"
            field="oc_life_years"
            value={value.oc_life_years}
            onChange={(v) => onChange({ oc_life_years: v })}
            preset={OC_DEFAULTS.oc_life_years}
            suffix="yrs"
            min={1}
            tooltip="Service life per unit (typically 5–8 years)."
          />
          <PresetToggle
            label="Power per unit"
            field="oc_power_watts"
            value={value.oc_power_watts}
            onChange={(v) => onChange({ oc_power_watts: v })}
            preset={OC_DEFAULTS.oc_power_watts}
            suffix="W"
            tooltip="Power draw per unit (300–600 W)."
          />
          <PresetToggle
            label="Electricity rate"
            field="oc_electricity_rate"
            value={value.oc_electricity_rate}
            onChange={(v) => onChange({ oc_electricity_rate: v })}
            preset={DEFAULT_ELECTRICITY_RATE}
            prefix="₹"
            suffix="/kWh"
            step={0.01}
            tooltip="Per-kWh electricity charge (shared with PSA default)."
          />
          <PresetToggle
            label="Days per month"
            field="oc_days_per_month"
            value={value.oc_days_per_month}
            onChange={(v) => onChange({ oc_days_per_month: v })}
            preset={OC_DEFAULTS.oc_days_per_month}
            suffix="days"
            min={1}
            max={31}
            tooltip="Operating days per month."
          />
          <PresetToggle
            label="Maintenance / unit / yr"
            field="oc_maintenance_per_unit"
            value={value.oc_maintenance_per_unit}
            onChange={(v) => onChange({ oc_maintenance_per_unit: v })}
            preset={OC_DEFAULTS.oc_maintenance_per_unit}
            prefix="₹"
            tooltip="Annual maintenance per unit (filter replacement, compressor servicing)."
          />
        </div>
        </Collapsible>
        <SourceNote>
          Concentrator cost presets (price, power, life, maintenance) are
          market/manufacturer estimates — the WJCF facility assessment captured
          concentrator counts and usage, but not per-unit cost. Enter your own
          figures where known.
        </SourceNote>
      </div>
    </details>
  )
}
