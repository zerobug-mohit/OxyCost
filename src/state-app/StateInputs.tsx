// Input column for the State / District tab. The only required input is how
// many facilities fall in each oxygen-bed band; the state unit rates (Form B)
// and the per-band model archetypes are pre-filled and editable.
import type { BandKey, BandProfile, StateInputs, StateRates } from '../state-engine'
import { BAND_KEYS, STATE_LIST, confidenceLevel } from '../state-engine'
import { NumberInput } from '../components/shared/NumberInput'
import { Tooltip } from '../components/shared/Tooltip'
import { Collapsible } from '../components/shared/Collapsible'
import { formatNumber } from '../utils/format'

interface Props {
  value: StateInputs
  onCount: (band: BandKey, n: number) => void
  onStateName: (name: string) => void
  onBeds: (band: BandKey, beds: number) => void
  onRates: (patch: Partial<StateRates>) => void
  onProfile: (band: BandKey, patch: Partial<BandProfile>) => void
  onReset: () => void
}

/** Small labelled numeric field. */
function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  min = 0,
  max,
  tip,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  step?: number
  min?: number
  max?: number
  tip?: string
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {tip && <Tooltip text={tip} />}
      </label>
      <NumberInput
        value={value}
        onChange={onChange}
        prefix={prefix}
        suffix={suffix}
        step={step}
        min={min}
        max={max}
        tone="opt"
        ariaLabel={label}
      />
    </div>
  )
}

/** Percentage field: stores a 0–1 fraction, shows 0–100. */
function Pct({
  label,
  value,
  onChange,
  tip,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  tip?: string
}) {
  return (
    <Field
      label={label}
      value={Math.round(value * 1000) / 10}
      onChange={(v) => onChange(v / 100)}
      suffix="%"
      step={0.5}
      max={100}
      tip={tip}
    />
  )
}

export function StateInputsPanel({
  value,
  onCount,
  onStateName,
  onBeds,
  onRates,
  onProfile,
  onReset,
}: Props) {
  const { counts, profiles, rates, stateName } = value
  const totalFac = BAND_KEYS.reduce((s, b) => s + (counts[b] || 0), 0)

  return (
    <div>
      {/* ---- State selector ---- */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">
          State
          <Tooltip
            text="Choosing your state sets rate defaults (cylinder refill prices, technician salary) to that state's median from the assessment, and biases the infrastructure model toward same-state facilities."
            effect="Rates the survey didn't observe (electricity tariff, asset values, AMC %, training, IEC) stay at national defaults — adjust them under State unit rates."
          />
        </label>
        <select
          className="control"
          value={stateName}
          onChange={(e) => onStateName(e.target.value)}
          aria-label="State"
        >
          {STATE_LIST.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ---- Required: facility counts by bed band ---- */}
      <div className="panel src-shared" style={{ padding: '14px 15px' }}>
        <div className="panel-section-title" style={{ marginTop: 0 }}>
          Your facilities — count &amp; typical size by band
          <Tooltip
            text="For each oxygen-bed band, enter how many facilities you have and their typical oxygen-bed size. A similarity (k-nearest-neighbours) model predicts each one's likely oxygen infrastructure from the size + state and estimates its cost."
            effect="Facility count is the only strictly required input; the typical bed size is pre-filled from the data and refines the prediction."
          />
        </div>
        <p className="small muted" style={{ marginTop: 0 }}>
          Bed band is a size proxy — the label shows the facility level it usually maps to.
          Tune the typical size to sharpen the estimate.
        </p>
        <div className="state-band-rows">
          {profiles.map((p) => {
            const lvl = confidenceLevel(p.confidence)
            return (
              <div className="state-band-row" key={p.band}>
                <div className="state-band-meta">
                  <strong>{p.band} oxygen beds</strong>
                  <span className="small muted">{p.label.replace(/\s*\(.*\)/, '')}</span>
                </div>
                <div className="state-band-fields">
                  <div style={{ width: 96 }}>
                    <NumberInput
                      value={p.oxBeds}
                      onChange={(v) => onBeds(p.band, Math.max(1, Math.round(v)))}
                      min={1}
                      tone="opt"
                      suffix="beds"
                      ariaLabel={`Typical oxygen beds for ${p.band} band`}
                    />
                  </div>
                  <div style={{ width: 96 }}>
                    <NumberInput
                      value={counts[p.band] || 0}
                      onChange={(v) => onCount(p.band, Math.max(0, Math.round(v)))}
                      min={0}
                      tone="req"
                      suffix="fac."
                      ariaLabel={`Facilities with ${p.band} oxygen beds`}
                    />
                  </div>
                  {(counts[p.band] || 0) > 0 && (
                    <span className={`conf-chip conf-${lvl.toLowerCase()}`} title={`${p.neighbors} similar facilities`}>
                      {lvl}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Total: <strong>{formatNumber(totalFac)}</strong> facilities.{' '}
          <button className="btn-reset" onClick={onReset}>↺ Reset all inputs</button>
        </p>
      </div>

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

      {/* ---- Model assumptions per bed band ---- */}
      <Collapsible className="subpanel" summary="Model assumptions per bed band — derived from 92 facilities, editable">
        <p className="small muted">
          What a typical facility of each size has and how hard it runs. &quot;% have&quot; is the
          share of facilities in that band with the source — the engine multiplies that
          source&apos;s cost by it, so a band total is the expected cost across its facilities.
          Oximeter, clinical-staff and booster figures are default norms (not in the survey).
        </p>
        {profiles.map((p) => (
          <Collapsible key={p.band} className="subpanel" summary={`${p.band} oxygen beds — ${p.label.replace(/\s*\(.*\)/, '')} · predicted at ${p.oxBeds} beds · ${confidenceLevel(p.confidence)} confidence (${p.neighbors} similar)`}>
            <div className="panel-section-title">Beds &amp; PSA</div>
            <div className="grid-2">
              <Field label="Functional beds (typical)" value={p.funcBeds} onChange={(v) => onProfile(p.band, { funcBeds: v })} />
              <Pct label="% have PSA" value={p.psaProb} onChange={(v) => onProfile(p.band, { psaProb: v })} />
              <Field label="PSA plants (if any)" value={p.psaPlants} onChange={(v) => onProfile(p.band, { psaPlants: v })} />
              <Field label="PSA capacity" value={p.psaCapacityLpm} onChange={(v) => onProfile(p.band, { psaCapacityLpm: v })} suffix="LPM" />
              <Field label="PSA production hrs/day" value={p.psaProdHrsPerDay} onChange={(v) => onProfile(p.band, { psaProdHrsPerDay: v })} suffix="h" max={24} />
            </div>
            <div className="panel-section-title">LMO &amp; cylinders</div>
            <div className="grid-2">
              <Pct label="% have LMO" value={p.lmoProb} onChange={(v) => onProfile(p.band, { lmoProb: v })} />
              <Field label="LMO annual volume" value={p.lmoAnnualKl} onChange={(v) => onProfile(p.band, { lmoAnnualKl: v })} suffix="KL" />
              <Pct label="% have cylinders" value={p.cylProb} onChange={(v) => onProfile(p.band, { cylProb: v })} />
              <Field label="D-type refills/mo" value={p.cylDRefillsMo} onChange={(v) => onProfile(p.band, { cylDRefillsMo: v })} />
              <Field label="B-type refills/mo" value={p.cylBRefillsMo} onChange={(v) => onProfile(p.band, { cylBRefillsMo: v })} />
              <Field label="A-type refills/mo" value={p.cylARefillsMo} onChange={(v) => onProfile(p.band, { cylARefillsMo: v })} />
              <Field label="Cylinders owned (D/B/A total)" value={p.cylDCount + p.cylBCount + p.cylACount} onChange={(v) => onProfile(p.band, { cylDCount: v, cylBCount: 0, cylACount: 0 })} tip="Total cylinders in stock, used to amortise 5-yearly hydrotesting." />
            </div>
            <div className="panel-section-title">Concentrators &amp; MGPS</div>
            <div className="grid-2">
              <Pct label="% have concentrators" value={p.ocProb} onChange={(v) => onProfile(p.band, { ocProb: v })} />
              <Field label="Concentrators deployed" value={p.ocDeployed} onChange={(v) => onProfile(p.band, { ocDeployed: v })} />
              <Field label="Concentrator hrs/day" value={p.ocHrsPerDay} onChange={(v) => onProfile(p.band, { ocHrsPerDay: v })} suffix="h" max={24} />
              <Pct label="% have MGPS" value={p.mgpsProb} onChange={(v) => onProfile(p.band, { mgpsProb: v })} />
              <Field label="MGPS bed-head units" value={p.mgpsBhu} onChange={(v) => onProfile(p.band, { mgpsBhu: v })} />
            </div>
            <div className="panel-section-title">HR, oximeters &amp; staff (norms)</div>
            <div className="grid-2">
              <Pct label="% have dedicated tech" value={p.techProb} onChange={(v) => onProfile(p.band, { techProb: v })} />
              <Field label="Dedicated technicians" value={p.techs} onChange={(v) => onProfile(p.band, { techs: v })} />
              <Field label="Fingertip oximeters" value={p.fingertip} onChange={(v) => onProfile(p.band, { fingertip: v })} />
              <Field label="Bedside oximeters" value={p.bedside} onChange={(v) => onProfile(p.band, { bedside: v })} />
              <Field label="Doctors (to train)" value={p.doctors} onChange={(v) => onProfile(p.band, { doctors: v })} />
              <Field label="Nurses (to train)" value={p.nurses} onChange={(v) => onProfile(p.band, { nurses: v })} />
              <Field label="Paramedics (to train)" value={p.paramedics} onChange={(v) => onProfile(p.band, { paramedics: v })} />
            </div>
          </Collapsible>
        ))}
      </Collapsible>
    </div>
  )
}
