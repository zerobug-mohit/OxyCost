// LMO input panel (spec section 4b). Monthly consumption can be entered in any
// common unit (cu m gas / Nm³ / litres / KL / kg) and is converted to cu m gas.
import { useState } from 'react'
import {
  ASSESSMENT_LABEL,
  cuMToLmoUnit,
  LMO_DEFAULTS,
  LMO_UNIT_LABELS,
  lmoUnitToCuM,
} from '../../engine'
import type { LmoInputs, LmoUnit } from '../../engine'
import { formatLakhs } from '../../utils/format'
import { PresetToggle } from './PresetToggle'
import { NumberInput } from '../shared/NumberInput'
import { Tooltip } from '../shared/Tooltip'
import { PanelMeta } from '../shared/PanelMeta'
import { PanelToolbar } from '../shared/PanelToolbar'
import { SourceNote } from '../shared/SourceNote'
import { Collapsible } from '../shared/Collapsible'
import { metricFlag, rangeFor } from '../../insights/benchmark'
import { FieldFlag } from '../shared/FieldFlag'

const lmoRentalHint = (() => {
  const r = rangeFor('lmoRental')
  const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`
  return r ? `Peers: ${inr(r.p25)}–${inr(r.p75)}/mo (median ${inr(r.median)})` : undefined
})()
import { IdentifierField } from './IdentifierField'

interface Props {
  value: LmoInputs
  onChange: (patch: Partial<LmoInputs>) => void
  onReset: () => void
  instanceLabel?: string
  idRequired?: boolean
  idDuplicate?: boolean
  outputCuM?: number
  demand?: number
}

const UNIT_ORDER: LmoUnit[] = ['cu_m', 'nm3', 'litres', 'kl', 'kg']

export function LmoInputPanel({ value, onChange, onReset, instanceLabel, idRequired, idDuplicate, outputCuM, demand }: Props) {
  const [unit, setUnit] = useState<LmoUnit>('cu_m')
  const shownValue = round2(cuMToLmoUnit(value.lmo_monthly_cu_m, unit))

  return (
    <details className="panel src-lmo">
      <summary className="panel-head">
        <span className="panel-title">
          LMO{value.lmo_capacity_kl > 0 ? ` ${value.lmo_capacity_kl} KL` : ''}
          {instanceLabel ? ` ${instanceLabel}` : ''}
          <Tooltip
            text="Bulk liquid oxygen. Refilling and handling are charged per cu m, while rent is fixed per month — so cost per cu m drops as monthly volume rises."
            effect="At low volume the rental dominates; at high volume cost approaches the refilling + handling floor."
          />
        </span>
        <span className="small muted">bulk cryogenic supply</span>
      </summary>
      <div className="panel-body">
        <PanelMeta source="lmo" outputCuM={outputCuM ?? 0} demand={demand ?? 0} />
        <PanelToolbar onReset={onReset} />
        <div className="panel-section-title">Required</div>
        {idRequired && (
          <IdentifierField value={value} onChange={onChange} required duplicate={idDuplicate} />
        )}
        {value.lmo_capacity_kl > 0 && (
          <p className="variant-note">
            Tank capacity <strong>{value.lmo_capacity_kl} KL</strong> (set in Step 2) —
            descriptive; LMO cost depends on consumption below.
          </p>
        )}

        <div className="field">
          <label className="field-label">
            Monthly consumption (delivered)
            <Tooltip
              text="Oxygen delivered to patients per month. Enter it in whatever unit you have — it is converted to cu m of gas (Nm³ ≈ cu m; 1 L LMO = 0.861 cu m; 1 KL = 861 cu m; 1 kg ≈ 0.700 cu m)."
              effect="Higher consumption dilutes the fixed rental, lowering cost per cu m; it does not change the incremental (refilling + handling) cost."
            />
          </label>
          <div className="field-row">
            <NumberInput
              value={shownValue}
              onChange={(v) => onChange({ lmo_monthly_cu_m: lmoUnitToCuM(v, unit) })}
              min={0}
              tone="req"
              ariaLabel="Monthly consumption"
            />
            <select
              className="control"
              style={{ flex: '0 0 38%' }}
              value={unit}
              onChange={(e) => setUnit(e.target.value as LmoUnit)}
              aria-label="Consumption unit"
            >
              {UNIT_ORDER.map((u) => (
                <option key={u} value={u}>
                  {LMO_UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
          <span className="preset-hint">
            = {round2(value.lmo_monthly_cu_m)} cu m gas (engine basis)
          </span>
        </div>

        <div className="field">
          <label className="field-label">
            Tank ownership
            <Tooltip
              text="Is the cryogenic tank rented (the usual arrangement — a fixed monthly rent) or a capital purchase you own? Only the matching cost is counted — the other defaults to zero."
              effect="On rent adds a fixed monthly rental that counts as opex; there is no depreciation. Purchased adds depreciation (capex+opex view only) and no rent."
            />
          </label>
          <div className="view-toggle">
            <button
              className={value.lmo_ownership === 'rented' ? 'active' : ''}
              onClick={() => onChange({ lmo_ownership: 'rented', lmo_tank_cost: 0 })}
            >
              On rent
            </button>
            <button
              className={value.lmo_ownership === 'purchased' ? 'active' : ''}
              onClick={() =>
                onChange({
                  lmo_ownership: 'purchased',
                  lmo_rental_monthly: 0,
                  lmo_tank_cost: value.lmo_tank_cost || LMO_DEFAULTS.lmo_tank_cost,
                })
              }
            >
              Purchased
            </button>
          </div>
          <p className="toggle-note">
            {value.lmo_ownership === 'rented'
              ? 'On a rental basis — set the monthly tank rental in Customize (presets) below.'
              : 'Purchased — set the tank purchase cost in Customize (presets) below.'}
          </p>
        </div>

        <Collapsible className="subpanel" summary="Customize (presets) — defaults you can override">
        {!idRequired && (
          <IdentifierField value={value} onChange={onChange} required={false} duplicate={idDuplicate} />
        )}
        <div className="grid-2">
          {value.lmo_ownership === 'rented' && (
            <PresetToggle
              label="Tank rental"
              value={value.lmo_rental_monthly}
              onChange={(v) => onChange({ lmo_rental_monthly: v })}
              preset={LMO_DEFAULTS.lmo_rental_monthly}
              prefix="₹"
              suffix="/mo"
              tooltip="Monthly cryogenic vessel rental, incl. 18% GST. Default 67,260 = 57,000 × 1.18 (validated against survey median)."
              hint={lmoRentalHint}
              flag={<FieldFlag flag={metricFlag('lmoRental', value.lmo_rental_monthly)} />}
            />
          )}
          <PresetToggle
            label="Boil-off loss"
            value={round2(value.lmo_loss_pct * 100)}
            onChange={(v) => onChange({ lmo_loss_pct: v / 100 })}
            preset={0}
            suffix="%"
            min={0}
            max={50}
            step={0.5}
            tooltip="Cryogenic LMO evaporates over time (boil-off), so you purchase more than you deliver. This % inflates the refilling & handling cost per delivered cu m by 1/(1 − loss). The survey could not isolate it directly — set from experience; 1–5%/month is typical."
            tooltipEffect="Raising it increases the variable (refilling + handling) cost per delivered cu m; rental and depreciation are unaffected."
          />
          <PresetToggle
            label="Refill cost / litre"
            value={value.lmo_refill_base_per_litre}
            onChange={(v) => onChange({ lmo_refill_base_per_litre: v })}
            preset={LMO_DEFAULTS.lmo_refill_base_per_litre}
            prefix="₹"
            suffix="/L"
            step={0.01}
            tooltip="Base refilling cost per litre of LMO, before GST. Per cu m = base × 1.12 ÷ 0.861. Survey: ≈₹15–18/Nm³."
          />
          <PresetToggle
            label="Handling cost / litre"
            value={value.lmo_handling_base_per_litre}
            onChange={(v) => onChange({ lmo_handling_base_per_litre: v })}
            preset={LMO_DEFAULTS.lmo_handling_base_per_litre}
            prefix="₹"
            suffix="/L"
            step={0.01}
            tooltip="Base handling/transport cost per litre of LMO, before GST. Per cu m = base × 1.18 ÷ 0.861."
          />
          {value.lmo_ownership === 'purchased' && (
            <>
              <PresetToggle
                label="Tank purchase cost"
                value={value.lmo_tank_cost}
                onChange={(v) => onChange({ lmo_tank_cost: v })}
                preset={LMO_DEFAULTS.lmo_tank_cost}
                prefix="₹"
                tooltip="Capital cost of the cryogenic vessel (~₹50 lakh). Used for depreciation."
                formatPreset={formatLakhs}
              />
              <PresetToggle
                label="Tank life"
                value={value.lmo_tank_life_years}
                onChange={(v) => onChange({ lmo_tank_life_years: v })}
                preset={LMO_DEFAULTS.lmo_tank_life_years}
                suffix="yrs"
                min={1}
                tooltip="Used for straight-line depreciation of the vessel."
              />
            </>
          )}
        </div>
        <p className="small muted" style={{ marginTop: 4 }}>
          Operator / HR salary is now entered once in <strong>Shared facility costs</strong> at the top of Step 3.
        </p>
        </Collapsible>
        <SourceNote>
          Presets are derived from the {ASSESSMENT_LABEL}: tank rental median
          ₹67,260/month, refilling ≈₹15–18 and handling ≈₹16–18 per Nm³. GST applied
          per regulation (rental &amp; handling 18%, refilling 12%).
        </SourceNote>
      </div>
    </details>
  )
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
