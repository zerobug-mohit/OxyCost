// Input column for the District / State planner. Required input: how many
// facilities in each size band (+ their typical size). The infrastructure mix
// (sub-bands), state rates and model assumptions are pre-filled and editable.
import type { BandKey, StateInputs, StateRates, StateResult } from '../state-engine'
import { BAND_KEYS, STATE_LIST, bandLabel, confidenceLevel } from '../state-engine'
import { NumberInput } from '../components/shared/NumberInput'
import { Tooltip } from '../components/shared/Tooltip'
import { Collapsible } from '../components/shared/Collapsible'
import { formatNumber } from '../utils/format'
import { BandComposition } from './BandVisual'

interface Props {
  value: StateInputs
  result: StateResult
  onCount: (band: BandKey, n: number) => void
  onStateName: (name: string) => void
  onBeds: (band: BandKey, beds: number) => void
  onShares: (band: BandKey, fractions: number[]) => void
  onRates: (patch: Partial<StateRates>) => void
  onReset: () => void
}

function Field({
  label, value, onChange, prefix, suffix, step, min = 0, max, tip,
}: {
  label: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; min?: number; max?: number; tip?: string
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {tip && <Tooltip text={tip} />}
      </label>
      <NumberInput value={value} onChange={onChange} prefix={prefix} suffix={suffix} step={step} min={min} max={max} tone="opt" ariaLabel={label} />
    </div>
  )
}

function Pct({ label, value, onChange, tip }: { label: string; value: number; onChange: (v: number) => void; tip?: string }) {
  return (
    <Field label={label} value={Math.round(value * 1000) / 10} onChange={(v) => onChange(v / 100)} suffix="%" step={0.5} max={100} tip={tip} />
  )
}

export function StateInputsPanel({ value, result, onCount, onStateName, onBeds, onShares, onRates, onReset }: Props) {
  const { counts, beds, rates, stateName } = value
  const totalFac = BAND_KEYS.reduce((s, b) => s + (counts[b] || 0), 0)
  const bandResultOf = (b: BandKey) => result.byBand.find((x) => x.band === b)

  return (
    <div>
      {/* ---- State ---- */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">
          State
          <Tooltip
            text="Choosing your state sets the rates the survey observed (cylinder refill prices, technician salary) to that state's median, and biases the infrastructure model toward same-state facilities."
            effect="Rates the survey didn't observe (tariff, asset values, AMC %, training, IEC) stay at national defaults — adjust them under State unit rates."
          />
        </label>
        <select className="control" value={stateName} onChange={(e) => onStateName(e.target.value)} aria-label="State">
          {STATE_LIST.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ---- Facility counts + sizes ---- */}
      <div className="panel src-shared" style={{ padding: '14px 15px' }}>
        <div className="panel-section-title" style={{ marginTop: 0 }}>
          Your facilities — by size band
          <Tooltip
            text="Group your facilities by size. For each band, enter how many facilities you have and their typical oxygen-bed size."
            effect="Size drives a data-based prediction of each facility's oxygen equipment and running cost; the count multiplies it. Refine the infrastructure mix per band under Model assumptions for more accuracy."
          />
        </div>
        <p className="small muted" style={{ marginTop: 0 }}>
          Facilities come in different sizes, so we group them into four bands (roughly PHC
          → Medical College). Enter <strong># facilities</strong> and their{' '}
          <strong>typical size</strong> (oxygen beds). Only the count is required.
        </p>
        <div className="state-band-rows">
          <div className="state-band-head">
            <span />
            <span className="state-field-cap">Typical size</span>
            <span className="state-field-cap">How many</span>
          </div>
          {BAND_KEYS.map((b) => {
            const level = bandLabel(b).split(' (')[0]
            const conf = bandResultOf(b)?.confidence ?? 0
            const lvl = confidenceLevel(conf)
            return (
              <div className="state-band-row" key={b}>
                <div className="state-band-meta">
                  <strong>{level}</strong>
                  <span className="small muted">Typically {b} oxygen beds</span>
                </div>
                <div className="state-band-fields">
                  <div className="mini-field">
                    <span className="mini-field-cap">beds / facility</span>
                    <NumberInput value={beds[b]} onChange={(v) => onBeds(b, Math.max(1, Math.round(v)))} min={1} tone="opt" ariaLabel={`Typical oxygen beds for ${level}`} />
                  </div>
                  <div className="mini-field">
                    <span className="mini-field-cap"># facilities</span>
                    <NumberInput value={counts[b] || 0} onChange={(v) => onCount(b, Math.max(0, Math.round(v)))} min={0} tone="req" ariaLabel={`Number of ${level} facilities`} />
                  </div>
                  {(counts[b] || 0) > 0 && (
                    <span className={`conf-chip conf-${lvl.toLowerCase()}`} title={`Data support for this size: ${lvl.toLowerCase()}`}>
                      {lvl}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Total: <strong>{formatNumber(totalFac)}</strong> {totalFac === 1 ? 'facility' : 'facilities'}.{' '}
          <button className="btn-reset" onClick={onReset}>↺ Reset all inputs</button>
        </p>
      </div>

      {/* ---- Model assumptions & sub-bands ---- */}
      <Collapsible className="subpanel" summary="Model assumptions — infrastructure mix per band (editable)">
        <p className="small muted">
          Within each size band, facilities differ most in their infrastructure — some run
          a PSA plant, some an LMO tank, some rely on cylinders. The model splits each band
          into these <strong>sub-bands</strong> and predicts each one from the most similar
          surveyed facilities. The mix below is data-derived; edit the shares to match what
          you know about your district for a sharper estimate.
        </p>
        {BAND_KEYS.map((b) => {
          const br = bandResultOf(b)
          if (!br) return null
          const level = bandLabel(b).split(' (')[0]
          return (
            <Collapsible
              key={b}
              className="subpanel"
              summary={`${level} · ~${beds[b]} beds · ${confidenceLevel(br.confidence)} confidence`}
            >
              <BandComposition bandResult={br} onShares={(fr) => onShares(b, fr)} />
            </Collapsible>
          )
        })}
      </Collapsible>

      {/* ---- State unit rates (Form B) ---- */}
      <Collapsible className="subpanel" summary="State unit rates (Form B) — pre-filled, editable">
        <p className="small muted">
          Defaults from the workbook Assumptions sheet. Update to your state&apos;s DISCOM
          tariff, rate contracts and pay matrix.
        </p>
        <div className="panel-section-title">Electricity</div>
        <div className="grid-2">
          <Field label="Electricity tariff" value={rates.electricityTariff} onChange={(v) => onRates({ electricityTariff: v })} prefix="₹" suffix="/kWh" step={0.1} />
          <Field label="Concentrator power" value={rates.ocPowerKwh} onChange={(v) => onRates({ ocPowerKwh: v })} suffix="kWh/hr" step={0.05} />
          <Field label="PSA power — 500 LPM" value={rates.psaPowerByCapacity['500']} onChange={(v) => onRates({ psaPowerByCapacity: { ...rates.psaPowerByCapacity, '500': v } })} suffix="kWh/hr" />
          <Field label="PSA power — 1000 LPM" value={rates.psaPowerByCapacity['1000']} onChange={(v) => onRates({ psaPowerByCapacity: { ...rates.psaPowerByCapacity, '1000': v } })} suffix="kWh/hr" />
        </div>
        <div className="panel-section-title">Refilling</div>
        <div className="grid-2">
          <Field label="D-type refill" value={rates.cylRefillD} onChange={(v) => onRates({ cylRefillD: v })} prefix="₹" />
          <Field label="B-type refill" value={rates.cylRefillB} onChange={(v) => onRates({ cylRefillB: v })} prefix="₹" />
          <Field label="A-type refill" value={rates.cylRefillA} onChange={(v) => onRates({ cylRefillA: v })} prefix="₹" />
          <Field label="LMO rate" value={rates.lmoRatePerKg} onChange={(v) => onRates({ lmoRatePerKg: v })} prefix="₹" suffix="/kg" />
          <Field label="Cylinder transport" value={rates.cylTransportPerTrip} onChange={(v) => onRates({ cylTransportPerTrip: v })} prefix="₹" suffix="/trip" />
          <Field label="Cylinders / trip" value={rates.cylPerTrip} onChange={(v) => onRates({ cylPerTrip: v })} min={1} />
          <Field label="Hydrotest / cylinder" value={rates.cylHydrotest} onChange={(v) => onRates({ cylHydrotest: v })} prefix="₹" />
        </div>
        <div className="panel-section-title">Asset values &amp; AMC / repairs</div>
        <div className="grid-2">
          <Field label="PSA asset — 500 LPM" value={rates.psaAssetByCapacity['500']} onChange={(v) => onRates({ psaAssetByCapacity: { ...rates.psaAssetByCapacity, '500': v } })} prefix="₹" />
          <Field label="PSA asset — 1000 LPM" value={rates.psaAssetByCapacity['1000']} onChange={(v) => onRates({ psaAssetByCapacity: { ...rates.psaAssetByCapacity, '1000': v } })} prefix="₹" />
          <Pct label="PSA CAMC rate" value={rates.psaCamcPct} onChange={(v) => onRates({ psaCamcPct: v })} />
          <Pct label="PSA repairs rate" value={rates.psaRepairPct} onChange={(v) => onRates({ psaRepairPct: v })} />
          <Field label="LMO tank asset — 5 KL" value={rates.lmoAssetByKl['5']} onChange={(v) => onRates({ lmoAssetByKl: { ...rates.lmoAssetByKl, '5': v } })} prefix="₹" />
          <Field label="LMO tank asset — 10 KL" value={rates.lmoAssetByKl['10']} onChange={(v) => onRates({ lmoAssetByKl: { ...rates.lmoAssetByKl, '10': v } })} prefix="₹" />
          <Pct label="LMO AMC rate" value={rates.lmoAmcPct} onChange={(v) => onRates({ lmoAmcPct: v })} />
          <Field label="MGPS asset / BHU" value={rates.mgpsAssetPerBhu} onChange={(v) => onRates({ mgpsAssetPerBhu: v })} prefix="₹" />
          <Pct label="MGPS AMC rate" value={rates.mgpsAmcPct} onChange={(v) => onRates({ mgpsAmcPct: v })} />
          <Pct label="MGPS repairs rate" value={rates.mgpsRepairPct} onChange={(v) => onRates({ mgpsRepairPct: v })} />
          <Field label="Concentrator asset" value={rates.ocAsset} onChange={(v) => onRates({ ocAsset: v })} prefix="₹" />
          <Pct label="Concentrator AMC rate" value={rates.ocAmcPct} onChange={(v) => onRates({ ocAmcPct: v })} />
          <Field label="Concentrator filters" value={rates.ocFilterPerYear} onChange={(v) => onRates({ ocFilterPerYear: v })} prefix="₹" suffix="/yr" />
          <Field label="Bedside oximeter asset" value={rates.oxiBedsideAsset} onChange={(v) => onRates({ oxiBedsideAsset: v })} prefix="₹" />
          <Pct label="Bedside oximeter AMC" value={rates.oxiBedsideAmcPct} onChange={(v) => onRates({ oxiBedsideAmcPct: v })} />
          <Field label="Fingertip oximeter / yr" value={rates.oxiFingertipPerYear} onChange={(v) => onRates({ oxiFingertipPerYear: v })} prefix="₹" />
          <Field label="Bedside probe / yr" value={rates.oxiBedsideProbePerYear} onChange={(v) => onRates({ oxiBedsideProbePerYear: v })} prefix="₹" />
        </div>
        <div className="panel-section-title">Human resources</div>
        <div className="grid-2">
          <Field label="Govt technician salary" value={rates.salaryGovtTech} onChange={(v) => onRates({ salaryGovtTech: v })} prefix="₹" suffix="/mo" />
          <Field label="Contractual technician salary" value={rates.salaryContractTech} onChange={(v) => onRates({ salaryContractTech: v })} prefix="₹" suffix="/mo" />
          <Pct label="Share on govt payroll" value={rates.govtTechShare} onChange={(v) => onRates({ govtTechShare: v })} tip="Share of dedicated oxygen technicians on regular government payroll; the rest are treated as NHM contractual." />
        </div>
        <div className="panel-section-title">Training</div>
        <div className="grid-2">
          <Field label="Training — doctor" value={rates.trainDoctor} onChange={(v) => onRates({ trainDoctor: v })} prefix="₹" />
          <Field label="Training — nurse" value={rates.trainNurse} onChange={(v) => onRates({ trainNurse: v })} prefix="₹" />
          <Field label="Training — paramedic" value={rates.trainParamedic} onChange={(v) => onRates({ trainParamedic: v })} prefix="₹" />
          <Field label="Training — PSA technician" value={rates.trainPsaTech} onChange={(v) => onRates({ trainPsaTech: v })} prefix="₹" />
          <Field label="Refresher every" value={rates.refresherEveryYears} onChange={(v) => onRates({ refresherEveryYears: v })} suffix="yrs" min={1} />
          <Pct label="Refresher cost (of initial)" value={rates.refresherPct} onChange={(v) => onRates({ refresherPct: v })} />
        </div>
        <div className="panel-section-title">IEC &amp; contingency</div>
        <div className="grid-2">
          <Field label="IEC — large (MC / DH)" value={rates.iec.large} onChange={(v) => onRates({ iec: { ...rates.iec, large: v } })} prefix="₹" suffix="/yr" />
          <Field label="IEC — mid (DH / SDH)" value={rates.iec.mid} onChange={(v) => onRates({ iec: { ...rates.iec, mid: v } })} prefix="₹" suffix="/yr" />
          <Field label="IEC — small (CHC / PHC)" value={rates.iec.small} onChange={(v) => onRates({ iec: { ...rates.iec, small: v } })} prefix="₹" suffix="/yr" />
          <Pct label="Contingency buffer" value={rates.contingencyPct} onChange={(v) => onRates({ contingencyPct: v })} />
        </div>
      </Collapsible>
    </div>
  )
}
