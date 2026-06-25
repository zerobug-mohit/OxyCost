// Cylinder input panel (spec section 4c, 10a). Shows the MP refill-cost
// reference range as a hint when entering refill cost.
import { ASSESSMENT_LABEL, CYL_PURCHASE_PRICE, CYL_REFILL_REFERENCE } from '../../engine'
import type { CylinderInputs } from '../../engine'
import { metricFlag } from '../../insights/benchmark'
import { FieldFlag } from '../shared/FieldFlag'
import { PresetToggle } from './PresetToggle'
import { NumberInput } from '../shared/NumberInput'
import { Tooltip } from '../shared/Tooltip'
import { PanelMeta } from '../shared/PanelMeta'
import { PanelToolbar } from '../shared/PanelToolbar'
import { SourceNote } from '../shared/SourceNote'
import { Collapsible } from '../shared/Collapsible'
import { IdentifierField } from './IdentifierField'

interface Props {
  value: CylinderInputs
  onChange: (patch: Partial<CylinderInputs>) => void
  onReset: () => void
  instanceLabel?: string
  idRequired?: boolean
  idDuplicate?: boolean
  outputCuM?: number
  demand?: number
}

export function CylinderInputPanel({ value, onChange, onReset, instanceLabel, idRequired, idDuplicate, outputCuM, demand }: Props) {
  // Surface the identifier in the main area when there are 2+ cylinder lines; a
  // single line keeps the optional identifier in Customize.
  const showIdInMain = idRequired || !!instanceLabel
  const ref = CYL_REFILL_REFERENCE[value.cyl_type]

  return (
    <details className="panel src-cylinder">
      <summary className="panel-head">
        <span className="panel-title">
          Cylinders ({value.cyl_type === 'd_type' ? 'D-type' : 'B-type'})
          {instanceLabel ? ` ${instanceLabel}` : ''}
          <Tooltip
            text="Compressed gas in portable cylinders. The cost per cu m is almost entirely the refill cost ÷ cylinder size, so it stays roughly flat regardless of volume."
            effect="Because every extra cylinder is a fresh refill, cylinders rarely get cheaper at scale — they suit low or backup demand."
          />
        </span>
        <span className="small muted">portable, supplier-refilled</span>
      </summary>
      <div className="panel-body">
        <PanelMeta source="cylinder" outputCuM={outputCuM ?? 0} demand={demand ?? 0} />
        <PanelToolbar onReset={onReset} />
        <div className="panel-section-title">Required</div>
        {showIdInMain && (
          <IdentifierField value={value} onChange={onChange} required={idRequired} duplicate={idDuplicate} />
        )}
        <p className="variant-note">
          Type{' '}
          <strong>
            {value.cyl_type === 'd_type' ? 'D-type / Jumbo (7 cu m)' : 'B-type (1.5 cu m)'}
          </strong>{' '}
          — set in Step 2.
        </p>

        <div className="grid-2">
          <div>
            <PresetToggle
              label="Refill cost / cylinder"
              value={value.cyl_refill_cost}
              onChange={(v) => onChange({ cyl_refill_cost: v })}
              prefix="₹"
              min={0}
              tooltip="Cost to refill one cylinder (opex). Divided by cylinder size (7 or 1.5 cu m) to give cost per cu m. The primary cost driver, and varies widely by location."
              tooltipEffect="Directly scales the per-cu-m cost: at ₹395 a D-type is ₹56.4/cu m; at ₹700 it is ₹100/cu m."
            />
            <span className="preset-hint">
              WJCF assessment: ₹{ref.min}–₹{ref.max} (median ₹{ref.median})
            </span>
            <FieldFlag
              flag={metricFlag(
                value.cyl_type === 'd_type' ? 'cylRefillD' : 'cylRefillB',
                value.cyl_refill_cost,
              )}
            />
          </div>
          <PresetToggle
            label="Cylinders / month"
            value={value.cyl_monthly_count}
            onChange={(v) => onChange({ cyl_monthly_count: v })}
            min={0}
            tooltip="Number of cylinder refills consumed per month."
          />
        </div>

        <Collapsible className="subpanel" summary="Customize (capex & testing) — defaults you can override">
        {!showIdInMain && (
          <IdentifierField value={value} onChange={onChange} required={false} duplicate={idDuplicate} />
        )}
        <div className="grid-2">
          <PresetToggle
            label="Purchase price / cylinder"
            value={value.cyl_purchase_price}
            onChange={(v) => onChange({ cyl_purchase_price: v })}
            preset={CYL_PURCHASE_PRICE[value.cyl_type]}
            prefix="₹"
            tooltip="Capital cost per cylinder (D=11,200; B=5,100). Amortized over rotations across its life."
          />
          <PresetToggle
            label="Cylinder lifetime"
            value={value.cyl_lifetime_years}
            onChange={(v) => onChange({ cyl_lifetime_years: v })}
            preset={15}
            suffix="yrs"
            min={1}
            tooltip="Service life of a cylinder. Default 15 years."
          />
          <div className="field">
            <label className="field-label">
              Cylinders owned
              <Tooltip text="Total cylinders in rotation. Affects capex-per-cu-m and hydrotest cost. If blank, assumes one rotation per cylinder per month." />
            </label>
            <NumberInput
              value={value.cyl_owned_count ?? 0}
              onChange={(v) => onChange({ cyl_owned_count: v > 0 ? v : null })}
              min={0}
              tone="opt"
              ariaLabel="Cylinders owned"
            />
            <span className="preset-hint">0 = auto (one rotation/month)</span>
          </div>
          <PresetToggle
            label="Hydrotest cost / cylinder"
            value={value.cyl_hydrotest_cost}
            onChange={(v) => onChange({ cyl_hydrotest_cost: v })}
            preset={0}
            prefix="₹"
            tooltip="Periodic hydrostatic pressure test cost per cylinder (regulatory, typically ₹200–500)."
          />
          <PresetToggle
            label="Hydrotest interval"
            value={value.cyl_hydrotest_interval_years}
            onChange={(v) => onChange({ cyl_hydrotest_interval_years: v })}
            preset={5}
            suffix="yrs"
            min={1}
            tooltip="Years between mandatory hydrostatic tests. Default 5 years."
          />
          <PresetToggle
            label="Transport cost / trip"
            value={value.cyl_transport_per_trip}
            onChange={(v) => onChange({ cyl_transport_per_trip: v })}
            preset={0}
            prefix="₹"
            tooltip="Cost to transport one delivery trip of cylinders to/from the supplier. Spread across the cylinders carried per trip."
            tooltipEffect="Adds a per-cu-m transport cost to opex and incremental: (trip cost ÷ cylinders per trip) ÷ cylinder size."
          />
          <PresetToggle
            label="Cylinders per trip"
            value={value.cyl_cylinders_per_trip}
            onChange={(v) => onChange({ cyl_cylinders_per_trip: v })}
            preset={10}
            min={1}
            tooltip="How many cylinders are carried per delivery trip — used to split the per-trip transport cost across cylinders."
          />
        </div>
        </Collapsible>
        <SourceNote>
          Refill-cost presets are medians from the {ASSESSMENT_LABEL}: D-type ₹350,
          B-type ₹165 per refill. Refill prices vary widely by location — enter your
          actual contracted rate.
        </SourceNote>
      </div>
    </details>
  )
}
