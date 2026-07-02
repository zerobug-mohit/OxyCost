// Input column for the District / State planner. Required input: how many
// facilities in each size band (+ their typical size). The infrastructure mix
// (sub-bands), state rates and model assumptions are pre-filled and editable.
import type { BandKey, BandProfile, StateInputs, StateRates, StateResult } from '../state-engine'
import { BAND_KEYS, STATE_LIST, STATE_META, bandLabel, confidenceLevel, defaultBandBeds, defaultRates, predictBand } from '../state-engine'
import type { TabKey } from '../components/layout/Header'
import { NumberInput } from '../components/shared/NumberInput'
import { Tooltip } from '../components/shared/Tooltip'
import { Collapsible } from '../components/shared/Collapsible'
import { formatNumber } from '../utils/format'
import { BandComposition } from './BandVisual'
import { MiniDistribution } from './MiniDistribution'

interface Props {
  value: StateInputs
  result: StateResult
  onCount: (band: BandKey, n: number) => void
  onStateName: (name: string) => void
  onBeds: (band: BandKey, beds: number) => void
  onShares: (band: BandKey, fractions: number[]) => void
  onOverride: (band: BandKey, patch: Partial<BandProfile>) => void
  onResetOverride: (band: BandKey, key: keyof BandProfile) => void
  onRates: (patch: Partial<StateRates>) => void
  onReset: () => void
  onNavigate?: (tab: TabKey, anchor?: string) => void
}

/** Colour legend for the input fields (amber wording varies by section). */
function StateLegend({ amber }: { amber: string }) {
  return (
    <div className="field-legend">
      <span className="lg">
        <span className="legend-swatch req" /> Red — required, you must enter
      </span>
      <span className="lg">
        <span className="legend-swatch opt" /> Yellow — {amber}
      </span>
    </div>
  )
}

/** e.g. "81 facilities — Madhya Pradesh 40, Punjab 27, Chhattisgarh 14". */
const SAMPLE_SUMMARY = (() => {
  const rows = Object.entries(STATE_META.states).sort((a, b) => b[1].n - a[1].n)
  return `${STATE_META.n} facilities — ${rows.map(([s, v]) => `${s} ${v.n}`).join(', ')}`
})()

function Field({
  label, value, onChange, prefix, suffix, step, min = 0, max, tip, canReset, onReset,
}: {
  label: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; min?: number; max?: number; tip?: string
  canReset?: boolean; onReset?: () => void
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {tip && <Tooltip text={tip} />}
      </label>
      <div className="field-row">
        <NumberInput value={value} onChange={onChange} prefix={prefix} suffix={suffix} step={step} min={min} max={max} tone="opt" ariaLabel={label} />
        {canReset && onReset && (
          <button type="button" className="btn-reset" title="Reset to model / default value" onClick={onReset}>
            ↺
          </button>
        )}
      </div>
    </div>
  )
}

function Pct({
  label, value, onChange, tip, canReset, onReset,
}: {
  label: string; value: number; onChange: (v: number) => void; tip?: string
  canReset?: boolean; onReset?: () => void
}) {
  return (
    <Field label={label} value={Math.round(value * 1000) / 10} onChange={(v) => onChange(v / 100)} suffix="%" step={0.5} max={100} tip={tip} canReset={canReset} onReset={onReset} />
  )
}

/** An editable field with an optional "where it lands vs the survey" curve. */
function EditField({
  label, value, onChange, dist, prefix, suffix, min = 0, max, step, tip, canReset, onReset,
}: {
  label: string; value: number; onChange: (v: number) => void
  dist?: string; prefix?: string; suffix?: string; min?: number; max?: number; step?: number; tip?: string
  canReset?: boolean; onReset?: () => void
}) {
  return (
    <div className="edit-field">
      <Field label={label} value={value} onChange={onChange} prefix={prefix} suffix={suffix} min={min} max={max} step={step} tip={tip} canReset={canReset} onReset={onReset} />
      {dist ? <MiniDistribution field={dist} current={value} /> : null}
    </div>
  )
}

export function StateInputsPanel({ value, result, onCount, onStateName, onBeds, onShares, onOverride, onResetOverride, onRates, onReset, onNavigate }: Props) {
  const { counts, beds, overrides, rates, stateName } = value
  const totalFac = BAND_KEYS.reduce((s, b) => s + (counts[b] || 0), 0)
  const bandResultOf = (b: BandKey) => result.byBand.find((x) => x.band === b)
  // Default rates for the current state — used to show/reset changed rate fields.
  const rd = defaultRates(stateName)

  /** A rate field with reset-to-default and an optional survey curve. */
  const RateField = (
    k: keyof StateRates & string,
    label: string,
    opts: { prefix?: string; suffix?: string; step?: number; min?: number; dist?: string } = {},
  ) => (
    <EditField
      label={label}
      value={rates[k] as number}
      onChange={(v) => onRates({ [k]: v } as Partial<StateRates>)}
      prefix={opts.prefix}
      suffix={opts.suffix}
      step={opts.step}
      min={opts.min}
      dist={opts.dist}
      canReset={(rates[k] as number) !== (rd[k] as number)}
      onReset={() => onRates({ [k]: rd[k] } as Partial<StateRates>)}
    />
  )
  const RatePct = (k: keyof StateRates & string, label: string, tip?: string) => (
    <Pct
      label={label}
      value={rates[k] as number}
      onChange={(v) => onRates({ [k]: v } as Partial<StateRates>)}
      tip={tip}
      canReset={(rates[k] as number) !== (rd[k] as number)}
      onReset={() => onRates({ [k]: rd[k] } as Partial<StateRates>)}
    />
  )
  /** A nested-map rate field (e.g. PSA power by capacity). */
  const RateMap = (
    mapKey: 'psaPowerByCapacity' | 'psaAssetByCapacity' | 'lmoAssetByKl' | 'iec',
    sub: string,
    label: string,
    opts: { prefix?: string; suffix?: string } = {},
  ) => {
    const cur = (rates[mapKey] as Record<string, number>)[sub]
    const def = (rd[mapKey] as Record<string, number>)[sub]
    const set = (v: number) =>
      onRates({ [mapKey]: { ...(rates[mapKey] as Record<string, number>), [sub]: v } } as Partial<StateRates>)
    return (
      <Field label={label} value={cur} onChange={set} prefix={opts.prefix} suffix={opts.suffix} canReset={cur !== def} onReset={() => set(def)} />
    )
  }

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
        <p className="small muted" style={{ marginTop: 0 }}>
          The <strong>typical size</strong> is pre-filled by the{' '}
          <strong>k-Nearest-Neighbour model</strong> from{' '}
          <strong>{stateName}</strong>&apos;s survey facilities — edit it to match your
          facilities.{' '}
          {onNavigate && (
            <button className="link-btn" onClick={() => onNavigate('methodology', 'knn')}>
              How the model works →
            </button>
          )}
        </p>
        <StateLegend amber="k-NN model prediction for the selected state (editable)" />
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
                    <div className="field-row">
                      <NumberInput value={beds[b]} onChange={(v) => onBeds(b, Math.max(1, Math.round(v)))} min={1} tone="opt" ariaLabel={`Typical oxygen beds for ${level}`} />
                      {beds[b] !== defaultBandBeds(b) && (
                        <button type="button" className="btn-reset" title="Reset to model default" onClick={() => onBeds(b, defaultBandBeds(b))}>↺</button>
                      )}
                    </div>
                  </div>
                  <div className="mini-field">
                    <span className="mini-field-cap"># facilities</span>
                    <div className="field-row">
                      <NumberInput value={counts[b] || 0} onChange={(v) => onCount(b, Math.max(0, Math.round(v)))} min={0} tone="req" ariaLabel={`Number of ${level} facilities`} />
                      {(counts[b] || 0) > 0 && (
                        <button type="button" className="btn-reset" title="Reset to 0" onClick={() => onCount(b, 0)}>↺</button>
                      )}
                    </div>
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
        <p className="small muted">
          Predictions are drawn from the WJCF assessment of <strong>{SAMPLE_SUMMARY}</strong>{' '}
          (11 of 92 excluded — no oxygen-bed count recorded).
          With <strong>{stateName}</strong> selected, {stateName}&apos;s{' '}
          {STATE_META.states[stateName]?.n ?? 0} facilities are weighted most heavily.{' '}
          {onNavigate && (
            <button className="link-btn" onClick={() => onNavigate('methodology', 'knn')}>
              How the k-nearest-neighbour model works →
            </button>
          )}
        </p>
        <StateLegend amber="k-NN model prediction (editable)" />
        {BAND_KEYS.map((b) => {
          const br = bandResultOf(b)
          if (!br) return null
          const level = bandLabel(b).split(' (')[0]
          const p: BandProfile = { ...predictBand(b, beds[b], stateName), ...overrides[b] }
          const ov = (patch: Partial<BandProfile>) => onOverride(b, patch)
          const isOv = (k: keyof BandProfile) => overrides[b][k] !== undefined
          const rst = (k: keyof BandProfile) => () => onResetOverride(b, k)
          const EF = (k: keyof BandProfile, label: string, opts: { dist?: string; suffix?: string; min?: number; max?: number; tip?: string } = {}) => (
            <EditField label={label} value={p[k] as number} onChange={(v) => ov({ [k]: v } as Partial<BandProfile>)} dist={opts.dist} suffix={opts.suffix} min={opts.min} max={opts.max} tip={opts.tip} canReset={isOv(k)} onReset={rst(k)} />
          )
          const PF = (k: keyof BandProfile, label: string) => (
            <Pct label={label} value={p[k] as number} onChange={(v) => ov({ [k]: v } as Partial<BandProfile>)} canReset={isOv(k)} onReset={rst(k)} />
          )
          return (
            <Collapsible
              key={b}
              className="subpanel"
              summary={`${level} · ~${beds[b]} beds · ${confidenceLevel(br.confidence)} confidence`}
            >
              <BandComposition bandResult={br} onShares={(fr) => onShares(b, fr)} />

              <div className="panel-section-title">Predicted archetype — edit any value to override</div>
              <p className="small muted">
                These values are <strong>k-Nearest-Neighbour (k-NN) model</strong>{' '}
                predictions — the median of the most similar {stateName} survey facilities
                for this size.{' '}
                {onNavigate && (
                  <button className="link-btn" onClick={() => onNavigate('methodology', 'knn')}>
                    See the model &amp; diagram →
                  </button>
                )}{' '}
                Edit any value to override it (applies to every sub-band); <strong>↺</strong>{' '}
                resets to the model value. The mini curve shows where your value sits among
                surveyed facilities — only for variables the survey measured; run-hours, LMO
                volume, oximeters and staff are norm-based (no curve). PSA / LMO presence is
                set by the mix above.
              </p>
              <div className="grid-2">
                <EditField label="Typical oxygen beds" value={beds[b]} onChange={(v) => onBeds(b, Math.max(1, Math.round(v)))} dist="oxBeds" suffix="beds" min={1} canReset={beds[b] !== defaultBandBeds(b)} onReset={() => onBeds(b, defaultBandBeds(b))} />
                {EF('psaPlants', 'PSA plants (if PSA)', { dist: 'psaPlants', min: 1 })}
                {EF('psaCapacityLpm', 'PSA capacity', { dist: 'psaCapacityLpm', suffix: 'LPM' })}
                {EF('psaProdHrsPerDay', 'PSA production hrs/day', { suffix: 'h', max: 24 })}
                {EF('lmoAnnualKl', 'LMO annual volume (if LMO)', { suffix: 'KL' })}
                {EF('cylDRefillsMo', 'D-type refills/mo', { dist: 'cylDRefillsMo' })}
                {EF('cylBRefillsMo', 'B-type refills/mo', { dist: 'cylBRefillsMo' })}
                {EF('cylARefillsMo', 'A-type refills/mo', { dist: 'cylARefillsMo' })}
                {EF('cylDCount', 'Cylinders owned', { dist: 'cylDCount', tip: 'Total cylinders in stock, used to amortise 5-yearly hydrotesting.' })}
                {EF('ocDeployed', 'Concentrators deployed', { dist: 'ocDeployed' })}
                {EF('ocHrsPerDay', 'Concentrator hrs/day', { suffix: 'h', max: 24 })}
                {EF('mgpsBhu', 'MGPS bed-head units', { dist: 'mgpsBhu' })}
                {EF('techs', 'Dedicated technicians', { dist: 'techs', min: 0 })}
                {PF('cylProb', '% have cylinders')}
                {PF('ocProb', '% have concentrators')}
                {PF('mgpsProb', '% have MGPS')}
                {PF('techProb', '% have dedicated tech')}
                {EF('fingertip', 'Fingertip oximeters')}
                {EF('bedside', 'Bedside oximeters')}
                {EF('doctors', 'Doctors (to train)')}
                {EF('nurses', 'Nurses (to train)')}
                {EF('paramedics', 'Paramedics (to train)')}
              </div>
            </Collapsible>
          )
        })}
      </Collapsible>

      {/* ---- State unit rates (Form B) ---- */}
      <Collapsible className="subpanel" summary="State unit rates (Form B) — pre-filled, editable">
        <p className="small muted">
          Defaults from the workbook Assumptions sheet (refill prices &amp; technician
          salary use your selected state&apos;s median). Update to your state&apos;s DISCOM
          tariff, rate contracts and pay matrix.
        </p>
        <StateLegend amber="default rate (editable)" />
        <div className="panel-section-title">Electricity</div>
        <div className="grid-2">
          {RateField('electricityTariff', 'Electricity tariff', { prefix: '₹', suffix: '/kWh', step: 0.1 })}
          {RateField('ocPowerKwh', 'Concentrator power', { suffix: 'kWh/hr', step: 0.05 })}
          {RateMap('psaPowerByCapacity', '500', 'PSA power — 500 LPM', { suffix: 'kWh/hr' })}
          {RateMap('psaPowerByCapacity', '1000', 'PSA power — 1000 LPM', { suffix: 'kWh/hr' })}
        </div>
        <div className="panel-section-title">Refilling</div>
        <div className="grid-2">
          {RateField('cylRefillD', 'D-type refill', { prefix: '₹', dist: 'cylRefillD' })}
          {RateField('cylRefillB', 'B-type refill', { prefix: '₹', dist: 'cylRefillB' })}
          {RateField('cylRefillA', 'A-type refill', { prefix: '₹' })}
          {RateField('lmoRatePerKg', 'LMO rate', { prefix: '₹', suffix: '/kg' })}
          {RateField('cylTransportPerTrip', 'Cylinder transport', { prefix: '₹', suffix: '/trip' })}
          {RateField('cylPerTrip', 'Cylinders / trip', { min: 1 })}
          {RateField('cylHydrotest', 'Hydrotest / cylinder', { prefix: '₹' })}
        </div>
        <div className="panel-section-title">Asset values &amp; AMC / repairs</div>
        <div className="grid-2">
          {RateMap('psaAssetByCapacity', '500', 'PSA asset — 500 LPM', { prefix: '₹' })}
          {RateMap('psaAssetByCapacity', '1000', 'PSA asset — 1000 LPM', { prefix: '₹' })}
          {RatePct('psaCamcPct', 'PSA CAMC rate')}
          {RatePct('psaRepairPct', 'PSA repairs rate')}
          {RateMap('lmoAssetByKl', '5', 'LMO tank asset — 5 KL', { prefix: '₹' })}
          {RateMap('lmoAssetByKl', '10', 'LMO tank asset — 10 KL', { prefix: '₹' })}
          {RatePct('lmoAmcPct', 'LMO AMC rate')}
          {RateField('mgpsAssetPerBhu', 'MGPS asset / BHU', { prefix: '₹' })}
          {RatePct('mgpsAmcPct', 'MGPS AMC rate')}
          {RatePct('mgpsRepairPct', 'MGPS repairs rate')}
          {RateField('ocAsset', 'Concentrator asset', { prefix: '₹' })}
          {RatePct('ocAmcPct', 'Concentrator AMC rate')}
          {RateField('ocFilterPerYear', 'Concentrator filters', { prefix: '₹', suffix: '/yr' })}
          {RateField('oxiBedsideAsset', 'Bedside oximeter asset', { prefix: '₹' })}
          {RatePct('oxiBedsideAmcPct', 'Bedside oximeter AMC')}
          {RateField('oxiFingertipPerYear', 'Fingertip oximeter / yr', { prefix: '₹' })}
          {RateField('oxiBedsideProbePerYear', 'Bedside probe / yr', { prefix: '₹' })}
        </div>
        <div className="panel-section-title">Human resources</div>
        <div className="grid-2">
          {RateField('salaryGovtTech', 'Govt technician salary', { prefix: '₹', suffix: '/mo' })}
          {RateField('salaryContractTech', 'Contractual technician salary', { prefix: '₹', suffix: '/mo', dist: 'salaryContractTech' })}
          {RatePct('govtTechShare', 'Share on govt payroll', 'Share of dedicated oxygen technicians on regular government payroll; the rest are treated as NHM contractual.')}
        </div>
        <div className="panel-section-title">Training</div>
        <div className="grid-2">
          {RateField('trainDoctor', 'Training — doctor', { prefix: '₹' })}
          {RateField('trainNurse', 'Training — nurse', { prefix: '₹' })}
          {RateField('trainParamedic', 'Training — paramedic', { prefix: '₹' })}
          {RateField('trainPsaTech', 'Training — PSA technician', { prefix: '₹' })}
          {RateField('refresherEveryYears', 'Refresher every', { suffix: 'yrs', min: 1 })}
          {RatePct('refresherPct', 'Refresher cost (of initial)')}
        </div>
        <div className="panel-section-title">IEC &amp; contingency</div>
        <div className="grid-2">
          {RateMap('iec', 'large', 'IEC — large (MC / DH)', { prefix: '₹', suffix: '/yr' })}
          {RateMap('iec', 'mid', 'IEC — mid (DH / SDH)', { prefix: '₹', suffix: '/yr' })}
          {RateMap('iec', 'small', 'IEC — small (CHC / PHC)', { prefix: '₹', suffix: '/yr' })}
          {RatePct('contingencyPct', 'Contingency buffer')}
        </div>
      </Collapsible>
    </div>
  )
}
