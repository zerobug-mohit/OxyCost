// PSA input panel (spec section 4a, 9a). Required inputs are prominent;
// presets sit in a "Customize" section, collapsed by default.
import {
  ASSESSMENT_LABEL,
  DEFAULT_ELECTRICITY_RATE,
  facilityFieldEcon,
  PSA_AMC_RATE,
  PSA_DEFAULTS,
} from '../../engine'
import type { PsaInputs } from '../../engine'
import { formatLakhs } from '../../utils/format'
import { PresetToggle } from './PresetToggle'
import { Tooltip } from '../shared/Tooltip'
import { PanelMeta } from '../shared/PanelMeta'
import { PanelToolbar } from '../shared/PanelToolbar'
import { SourceNote } from '../shared/SourceNote'
import { Collapsible } from '../shared/Collapsible'
import { IdentifierField } from './IdentifierField'
import { UnitToggle } from './UnitToggle'

interface Props {
  value: PsaInputs
  onChange: (patch: Partial<PsaInputs>) => void
  onReset: () => void
  instanceLabel?: string
  idRequired?: boolean
  idDuplicate?: boolean
  outputCuM?: number
  demand?: number
}

export function PsaInputPanel({ value, onChange, onReset, instanceLabel, idRequired, idDuplicate, outputCuM, demand }: Props) {
  const autoAmc = PSA_AMC_RATE * value.psa_plant_cost

  return (
    <details className="panel src-psa">
      <summary className="panel-head">
        <span className="panel-title">
          PSA {value.psa_capacity_lpm} LPM{instanceLabel ? ` ${instanceLabel}` : ''}
          <Tooltip
            text="On-site oxygen generation. Fixed costs (depreciation, technician, AMC) are large, so cost per cu m falls steeply the more the plant runs."
            effect="The single biggest lever is run hours: doubling them roughly halves the per-unit cost until you hit the 720h ceiling."
          />
        </span>
      </summary>
      <div className="panel-body">
        <PanelMeta source="psa" outputCuM={outputCuM ?? 0} demand={demand ?? 0} />
        <p className="estimate-note">
          PSA output is highly sensitive to run hours, compressor-run fraction and
          utilization — small changes swing it a lot. Check the share of demand shown
          above and confirm it against metered output, as it is easy to overestimate.
        </p>
        <PanelToolbar onReset={onReset} />
        <div className="panel-section-title">Required</div>
        {idRequired && (
          <IdentifierField value={value} onChange={onChange} required duplicate={idDuplicate} />
        )}
        <p className="variant-note">
          Capacity <strong>{value.psa_capacity_lpm} LPM</strong>{' '}
          <UnitToggle lpm={value.psa_capacity_lpm} /> — set in Step 2.
        </p>

        <div className="field" data-tour="source-ownership">
          <label className="field-label">
            Plant ownership
            <Tooltip
              text="Is the plant a capital purchase (owned) or rented for a fixed monthly fee? Only the matching cost is counted — the other defaults to zero."
              effect="Purchased adds depreciation (capex+opex view only). On rent adds a fixed monthly rent that counts as opex; there is no depreciation."
            />
          </label>
          <div className="view-toggle">
            <button
              className={value.psa_ownership === 'purchased' ? 'active' : ''}
              onClick={() => onChange({ psa_ownership: 'purchased', psa_rental_monthly: 0 })}
            >
              Purchased
            </button>
            <button
              className={value.psa_ownership === 'rented' ? 'active' : ''}
              onClick={() => onChange({ psa_ownership: 'rented', psa_plant_cost: 0 })}
            >
              On rent
            </button>
          </div>
          <p className="toggle-note">
            {value.psa_ownership === 'purchased'
              ? 'Set the plant purchase cost in Customize (presets) below — it defaults to ₹0, assuming a donated / grant-funded plant.'
              : 'On a rental basis — set the monthly rental amount in Customize (presets) below.'}
          </p>
        </div>

        <div className="grid-2">
          <PresetToggle
            label="Power consumption"
            field="psa_power_kw"
            value={value.psa_power_kw}
            onChange={(v) => onChange({ psa_power_kw: v })}
            preset={PSA_DEFAULTS.psa_power_kw}
            required
            suffix="KW"
            min={0}
            tooltip="Total rated power of all PSA plant components (e.g., air compressor, oxygen generator, dryers, and auxiliary equipment). This value is used to estimate electricity consumption based on operating hours. Typical for a ~1000 LPM PSA plant: 40–80 kW."
            econ={facilityFieldEcon('psa', 'psa_power_kw', value)}
          />
          <PresetToggle
            label="Monthly run hours"
            field="psa_run_hours_monthly"
            value={value.psa_run_hours_monthly}
            onChange={(v) => onChange({ psa_run_hours_monthly: v })}
            preset={PSA_DEFAULTS.psa_run_hours_monthly}
            required
            suffix="hrs"
            min={0}
            max={720}
            hint="Hours the plant is switched on each month (max 720 = 24×30)."
            tooltip="Total hours the plant is switched ON in the month (max 720 = 24×30). Production (compressor) hours are a fraction of this — see below."
            tooltipEffect="More run hours spread the large fixed costs over more oxygen, sharply lowering cost per cu m. Below ~60 hrs/month PSA is very expensive per unit."
            econ={facilityFieldEcon('psa', 'psa_run_hours_monthly', value)}
          />
        </div>

        <Collapsible className="subpanel" summary="Customize (presets) — advanced & optional; the defaults already work">
        {!idRequired && (
          <IdentifierField value={value} onChange={onChange} required={false} duplicate={idDuplicate} />
        )}
        <div className="grid-2">
          <PresetToggle
            label="Compressor-run fraction"
            field="psa_compressor_run_fraction"
            value={value.psa_compressor_run_fraction}
            onChange={(v) => onChange({ psa_compressor_run_fraction: v })}
            preset={PSA_DEFAULTS.psa_compressor_run_fraction}
            min={0}
            max={1}
            step={0.05}
            tooltip="Oxygen is produced only while the compressor runs, which is a fraction of total run hours (production hrs = run hrs × this). Default 0.90 from facility data; facilities rarely meter production hours directly, so this preset stands in. Set to your compressor-hour-meter ratio if known."
            tooltipEffect="Lower fraction → fewer production hours → less oxygen and higher cost per cu m. It also cuts compressor electricity (compressor draws power only during production)."
          />
          <PresetToggle
            label="Capacity utilization"
            field="psa_capacity_utilization"
            value={value.psa_capacity_utilization}
            onChange={(v) => onChange({ psa_capacity_utilization: v })}
            preset={1}
            min={0}
            max={1}
            step={0.05}
            tooltip="Average fraction of rated LPM the plant actually delivers — it may throttle below full capacity to match a smaller demand. 1.0 = full capacity."
            tooltipEffect="Below 1.0, output falls proportionally but electricity stays roughly flat (a throttled compressor still draws similar power), so cost per cu m rises — part-load PSA is less efficient."
          />
          <PresetToggle
            label="Electricity usage rate"
            field="electricity_rate_per_kwh"
            value={value.electricity_rate_per_kwh}
            onChange={(v) => onChange({ electricity_rate_per_kwh: v })}
            preset={DEFAULT_ELECTRICITY_RATE}
            prefix="₹"
            suffix="/kWh"
            step={0.01}
            tooltip="Variable electricity charge per unit. Default 7.52 = a representative state industrial tariff."
          />
          <PresetToggle
            label="Electricity fixed charges"
            field="electricity_fixed_monthly"
            value={value.electricity_fixed_monthly}
            onChange={(v) => onChange({ electricity_fixed_monthly: v })}
            preset={PSA_DEFAULTS.electricity_fixed_monthly}
            prefix="₹"
            suffix="/mo"
            tooltip="Monthly demand/contract charge, independent of run hours. Varies by capacity (200=9,500; 500=20,000; 1000=25,000; 1500=30,436)."
          />
          {value.psa_ownership === 'purchased' ? (
            <>
              <PresetToggle
                label="Plant purchase cost"
                field="psa_plant_cost"
                value={value.psa_plant_cost}
                onChange={(v) => onChange({ psa_plant_cost: v })}
                preset={0}
                prefix="₹"
                tooltip="Capital cost, used for depreciation (cost ÷ life ÷ 12) and to auto-derive AMC. Leave 0 if the plant was donated / grant-funded."
                tooltipEffect="Affects the capex+opex view only; the opex-only and incremental views ignore it. Higher cost raises total cost of ownership."
                formatPreset={formatLakhs}
              />
              <PresetToggle
                label="Plant life"
                field="psa_plant_life_years"
                value={value.psa_plant_life_years}
                onChange={(v) => onChange({ psa_plant_life_years: v })}
                preset={PSA_DEFAULTS.psa_plant_life_years}
                suffix="yrs"
                min={1}
                tooltip="Used for straight-line depreciation: plant cost ÷ life ÷ 12."
              />
            </>
          ) : (
            <PresetToggle
              label="Plant rental"
              field="psa_rental_monthly"
              value={value.psa_rental_monthly}
              onChange={(v) => onChange({ psa_rental_monthly: v })}
              preset={0}
              prefix="₹"
              suffix="/mo"
              tooltip="Fixed monthly rent for a leased/BOOT plant, incl. applicable GST. Counts as an operating cost; there is no depreciation when rented."
              tooltipEffect="Raises the capex+opex and opex-only views by a fixed amount per month; the incremental (electricity-only) cost is unchanged."
            />
          )}
          <PresetToggle
            label="AMC/CMC annual"
            field="psa_amc_annual"
            value={value.psa_amc_annual ?? autoAmc}
            onChange={(v) => onChange({ psa_amc_annual: v })}
            preset={Math.round(autoAmc)}
            prefix="₹"
            tooltip="Annual maintenance contract. Auto-set to 3.27% of plant cost unless overridden."
            formatPreset={formatLakhs}
          />
          <PresetToggle
            label="Annual repairs"
            field="psa_repair_annual"
            value={value.psa_repair_annual}
            onChange={(v) => onChange({ psa_repair_annual: v })}
            preset={PSA_DEFAULTS.psa_repair_annual}
            prefix="₹"
            tooltip="Annual repair budget beyond AMC. Amortized monthly."
          />
          <PresetToggle
            label="Annual consumables / spares"
            field="psa_consumables_annual"
            value={value.psa_consumables_annual}
            onChange={(v) => onChange({ psa_consumables_annual: v })}
            preset={PSA_DEFAULTS.psa_consumables_annual}
            prefix="₹"
            tooltip="Annual spend on consumables and spare parts not covered by AMC (filters, zeolite top-up, etc.). Amortized monthly."
          />
          <PresetToggle
            label="Compressor power share"
            field="psa_compressor_power_fraction"
            value={value.psa_compressor_power_fraction}
            onChange={(v) => onChange({ psa_compressor_power_fraction: v })}
            preset={PSA_DEFAULTS.psa_compressor_power_fraction}
            min={0}
            max={1}
            step={0.05}
            tooltip="Share of total plant power drawn by the compressor (default 0.90). The compressor draws power only during production hours; the remaining 10% (dryers, valves, controls) draws power for all run hours."
            tooltipEffect="A higher share concentrates energy in production hours; total electricity changes only if run and production hours differ."
          />
        </div>
        <p className="small muted" style={{ marginTop: 4 }}>
          Technician / HR salary is now entered once in <strong>Shared facility costs</strong> at the top of Step 3.
        </p>
        </Collapsible>
        <SourceNote>
          Compressor-run fraction (≈0.90) and the cost structure are informed by the{' '}
          {ASSESSMENT_LABEL}. Power rating and electricity rate are pre-filled
          defaults — verify both for your plant.
        </SourceNote>
      </div>
    </details>
  )
}
