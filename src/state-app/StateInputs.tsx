// Input column for the District / State planner. Required input: how many
// facilities in each size band (+ their typical size). The infrastructure mix
// (sub-bands), state rates and model assumptions are pre-filled and editable.
import type { BandKey, BandProfile, DirectInputs, StateInputs, StateMode, StateRates, StateResult } from '../state-engine'
import { BAND_KEYS, STATE_LIST, STATE_META, bandLabel, confidenceLevel, defaultBandBeds, defaultRates } from '../state-engine'
import type { TabKey } from '../components/layout/Header'
import { NumberInput } from '../components/shared/NumberInput'
import { Tooltip } from '../components/shared/Tooltip'
import { Collapsible } from '../components/shared/Collapsible'
import { formatNumber } from '../utils/format'
import { MiniDistribution } from './MiniDistribution'

interface Props {
  value: StateInputs
  result: StateResult
  onCount: (band: BandKey, n: number) => void
  onStateName: (name: string) => void
  onBeds: (band: BandKey, beds: number) => void
  onMode: (mode: StateMode) => void
  onDirect: (patch: Partial<DirectInputs>) => void
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
  label, value, onChange, prefix, suffix, step, min = 0, max, tip, canReset, onReset, field,
}: {
  label: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; min?: number; max?: number; tip?: string
  canReset?: boolean; onReset?: () => void; field?: string
}) {
  return (
    <div className="field" data-field={field}>
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
  label, value, onChange, tip, canReset, onReset, field,
}: {
  label: string; value: number; onChange: (v: number) => void; tip?: string
  canReset?: boolean; onReset?: () => void; field?: string
}) {
  return (
    <Field label={label} value={Math.round(value * 1000) / 10} onChange={(v) => onChange(v / 100)} suffix="%" step={0.5} max={100} tip={tip} canReset={canReset} onReset={onReset} field={field} />
  )
}

/** An editable field with an optional "where it lands vs the survey" curve. */
function EditField({
  label, value, onChange, dist, prefix, suffix, min = 0, max, step, tip, canReset, onReset, field,
}: {
  label: string; value: number; onChange: (v: number) => void
  dist?: string; prefix?: string; suffix?: string; min?: number; max?: number; step?: number; tip?: string
  canReset?: boolean; onReset?: () => void; field?: string
}) {
  return (
    <div className="edit-field">
      <Field label={label} value={value} onChange={onChange} prefix={prefix} suffix={suffix} min={min} max={max} step={step} tip={tip} canReset={canReset} onReset={onReset} field={field} />
      {dist ? <MiniDistribution field={dist} current={value} /> : null}
    </div>
  )
}

export function StateInputsPanel({ value, result, onCount, onStateName, onBeds, onMode, onDirect, onOverride, onResetOverride, onRates, onReset, onNavigate }: Props) {
  const { mode, counts, beds, overrides, rates, stateName, direct } = value
  const totalFac = BAND_KEYS.reduce((s, b) => s + (counts[b] || 0), 0)
  const bandResultOf = (b: BandKey) => result.byBand.find((x) => x.band === b)
  // Default rates for the current state — used to show/reset changed rate fields.
  const rd = defaultRates(stateName)

  /** A rate field with reset-to-default and an optional survey curve. */
  const RateField = (
    k: keyof StateRates & string,
    label: string,
    opts: { prefix?: string; suffix?: string; step?: number; min?: number; dist?: string; tip?: string } = {},
  ) => (
    <EditField
      label={label}
      field={k}
      value={rates[k] as number}
      onChange={(v) => onRates({ [k]: v } as Partial<StateRates>)}
      prefix={opts.prefix}
      suffix={opts.suffix}
      step={opts.step}
      min={opts.min}
      dist={opts.dist}
      tip={opts.tip}
      canReset={(rates[k] as number) !== (rd[k] as number)}
      onReset={() => onRates({ [k]: rd[k] } as Partial<StateRates>)}
    />
  )
  const RatePct = (k: keyof StateRates & string, label: string, tip?: string) => (
    <Pct
      label={label}
      field={k}
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
    opts: { prefix?: string; suffix?: string; tip?: string } = {},
  ) => {
    const cur = (rates[mapKey] as Record<string, number>)[sub]
    const def = (rd[mapKey] as Record<string, number>)[sub]
    const set = (v: number) =>
      onRates({ [mapKey]: { ...(rates[mapKey] as Record<string, number>), [sub]: v } } as Partial<StateRates>)
    return (
      <Field label={label} field={`${mapKey}.${sub}`} value={cur} onChange={set} prefix={opts.prefix} suffix={opts.suffix} tip={opts.tip} canReset={cur !== def} onReset={() => set(def)} />
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

      {/* ---- Mode: estimate from sizes vs enter equipment directly ---- */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">
          How should we work out your equipment?
          <Tooltip
            text="Estimate: you enter only how many facilities of each size you have, and the model fills in typical equipment. Enter equipment: you type your district's actual totals and we cost those directly."
          />
        </label>
        <div className="view-toggle">
          <button className={mode === 'estimate' ? 'active' : ''} onClick={() => onMode('estimate')}>
            Estimate from facility sizes
          </button>
          <button className={mode === 'direct' ? 'active' : ''} onClick={() => onMode('direct')}>
            Enter my district&apos;s equipment
          </button>
        </div>
        <p className="toggle-note">
          {mode === 'estimate'
            ? 'You only know how many facilities of each size you have — the model predicts a typical facility for each size and multiplies by your counts.'
            : 'You know your district totals (PSA plants, concentrators, LMO, cylinders…). Enter them below and we cost them directly — no model.'}
        </p>
      </div>

      {mode === 'estimate' && (
      <>
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
          const p: BandProfile = br.profile
          const ov = (patch: Partial<BandProfile>) => onOverride(b, patch)
          const isOv = (k: keyof BandProfile) => overrides[b][k] !== undefined
          const rst = (k: keyof BandProfile) => () => onResetOverride(b, k)
          const EF = (k: keyof BandProfile, label: string, opts: { dist?: string; suffix?: string; min?: number; max?: number; tip?: string } = {}) => (
            <EditField label={label} field={String(k)} value={p[k] as number} onChange={(v) => ov({ [k]: v } as Partial<BandProfile>)} dist={opts.dist} suffix={opts.suffix} min={opts.min} max={opts.max} tip={opts.tip} canReset={isOv(k)} onReset={rst(k)} />
          )
          const PF = (k: keyof BandProfile, label: string, tip?: string) => (
            <Pct label={label} field={String(k)} value={p[k] as number} onChange={(v) => ov({ [k]: v } as Partial<BandProfile>)} tip={tip} canReset={isOv(k)} onReset={rst(k)} />
          )
          return (
            <div key={b} data-field-scope={`band-${b}`}>
            <Collapsible
              className="subpanel"
              summary={`${level} · ~${beds[b]} beds · ${confidenceLevel(br.confidence)} confidence`}
            >
              <div className="panel-section-title">A typical facility this size — edit any value</div>
              <p className="small muted">
                These are <strong>k-Nearest-Neighbour (k-NN) model</strong> predictions for a
                typical facility of this size in {stateName} — the cost is this × how many
                facilities you have. The <strong>&ldquo;% have …&rdquo;</strong> values are how
                common each source is among facilities this size; a quantity like
                &ldquo;PSA plants&rdquo; is what those that have it run.{' '}
                {onNavigate && (
                  <button className="link-btn" onClick={() => onNavigate('methodology', 'knn')}>
                    See the model &amp; diagram →
                  </button>
                )}{' '}
                Edit any value to override it; <strong>↺</strong> resets to the model value.
              </p>
              <div className="grid-2">
                <EditField label="Typical oxygen beds" value={beds[b]} onChange={(v) => onBeds(b, Math.max(1, Math.round(v)))} dist="oxBeds" suffix="beds" min={1} tip="The typical number of oxygen-supported beds at a facility of this band. This is the size the model predicts everything else from." canReset={beds[b] !== defaultBandBeds(b)} onReset={() => onBeds(b, defaultBandBeds(b))} />
                {PF('psaProb', '% have a PSA plant', 'Share of facilities this size that run a PSA plant. PSA electricity, AMC and repair costs are multiplied by this.')}
                {EF('psaPlants', 'PSA plants (if they have one)', { dist: 'psaPlants', min: 1, tip: 'Number of PSA plants a facility of this size has, if it has any.' })}
                {EF('psaCapacityLpm', 'PSA capacity', { dist: 'psaCapacityLpm', suffix: 'LPM', tip: 'Rated output of the PSA plant in litres/minute. Larger plants draw more power and cost more to buy and maintain.' })}
                {EF('psaProdHrsPerDay', 'PSA production hrs/day', { suffix: 'h', max: 24, tip: 'Hours per day the plant actually produces oxygen. Directly scales PSA electricity cost. (Survey run-hours were unreliable, so this is a size-based assumption.)' })}
                {PF('lmoProb', '% have an LMO tank', 'Share of facilities this size with an LMO tank. LMO refilling and AMC are multiplied by this.')}
                {EF('lmoAnnualKl', 'LMO annual volume (if they have one)', { suffix: 'KL', tip: 'Litres of liquid oxygen (in KL) a facility with an LMO tank consumes per year. Multiplied by the ₹/kg rate for the LMO refilling cost.' })}
                {PF('cylProb', '% use cylinders', 'Share of facilities this size that use cylinders. Cylinder costs are multiplied by this.')}
                {EF('cylDRefillsMo', 'D-type refills/mo', { dist: 'cylDRefillsMo', tip: 'D-type (jumbo) cylinder refills per month. Multiplied by 12 and the D-type refill rate for the annual cost.' })}
                {EF('cylBRefillsMo', 'B-type refills/mo', { dist: 'cylBRefillsMo', tip: 'B-type cylinder refills per month, costed at the B-type refill rate.' })}
                {EF('cylARefillsMo', 'A-type refills/mo', { dist: 'cylARefillsMo', tip: 'A-type (small) cylinder refills per month, costed at the A-type refill rate.' })}
                {EF('cylDCount', 'Cylinders owned', { dist: 'cylDCount', tip: 'Total cylinders in stock. Used only to amortise the 5-yearly hydrostatic testing cost.' })}
                {PF('ocProb', '% have concentrators', 'Share of facilities this size that have concentrators. Concentrator costs are multiplied by this.')}
                {EF('ocDeployed', 'Concentrators deployed', { dist: 'ocDeployed', tip: 'Number of oxygen concentrators in active use. Drives concentrator electricity, AMC and filter costs.' })}
                {EF('ocHrsPerDay', 'Concentrator hrs/day', { suffix: 'h', max: 24, tip: 'Average hours per day each concentrator runs. Scales concentrator electricity cost.' })}
                {PF('mgpsProb', '% have MGPS', 'Share of facilities this size with an MGPS pipeline. MGPS costs are multiplied by this.')}
                {EF('mgpsBhu', 'MGPS bed-head units', { dist: 'mgpsBhu', tip: 'Number of functional bed-head oxygen outlets on the pipeline. Drives MGPS AMC and repair costs (per-BHU asset value).' })}
                {PF('techProb', '% have dedicated tech', 'Share of facilities this size with dedicated oxygen technicians. HR cost is multiplied by this.')}
                {EF('techs', 'Dedicated technicians', { dist: 'techs', min: 0, tip: 'Staff dedicated to oxygen/PSA operations, whose salaries make up the HR cost.' })}
                {EF('fingertip', 'Fingertip oximeters', { tip: 'Assumed fingertip pulse oximeters per facility (norm — not surveyed). Drives their annual consumable cost.' })}
                {EF('bedside', 'Bedside oximeters', { tip: 'Assumed bedside/tabletop oximeters per facility (norm). Drives their AMC and probe/battery costs.' })}
                {EF('doctors', 'Doctors (to train)', { tip: 'Assumed doctors to train on oxygen use per facility (norm). Drives clinical training cost.' })}
                {EF('nurses', 'Nurses (to train)', { tip: 'Assumed nurses to train per facility (norm). Drives clinical training cost.' })}
                {EF('paramedics', 'Paramedics (to train)', { tip: 'Assumed paramedics/ANMs to train per facility (norm). Drives clinical training cost.' })}
                {EF('fingertip', 'Fingertip oximeters', { tip: 'Assumed fingertip pulse oximeters per facility (norm — not surveyed). Drives their annual consumable cost.' })}
                {EF('bedside', 'Bedside oximeters', { tip: 'Assumed bedside/tabletop oximeters per facility (norm). Drives their AMC and probe/battery costs.' })}
                {EF('doctors', 'Doctors (to train)', { tip: 'Assumed doctors to train on oxygen use per facility (norm). Drives clinical training cost.' })}
                {EF('nurses', 'Nurses (to train)', { tip: 'Assumed nurses to train per facility (norm). Drives clinical training cost.' })}
                {EF('paramedics', 'Paramedics (to train)', { tip: 'Assumed paramedics/ANMs to train per facility (norm). Drives clinical training cost.' })}
              </div>
            </Collapsible>
            </div>
          )
        })}
      </Collapsible>
      </>
      )}

      {mode === 'direct' && <DirectPanel direct={direct} onDirect={onDirect} onReset={onReset} />}

      {/* ---- State unit rates (Form B) ---- */}
      <div data-field-scope="rates">
      <Collapsible className="subpanel" summary="State unit rates (Form B) — pre-filled, editable">
        <p className="small muted">
          Defaults from the workbook Assumptions sheet (refill prices &amp; technician
          salary use your selected state&apos;s median). Update to your state&apos;s DISCOM
          tariff, rate contracts and pay matrix.
        </p>
        <StateLegend amber="default rate (editable)" />
        <div className="panel-section-title">Electricity</div>
        <div className="grid-2">
          {RateField('electricityTariff', 'Electricity tariff', { prefix: '₹', suffix: '/kWh', step: 0.1, tip: 'Grid tariff for government health institutions (₹ per unit/kWh). Applied to all PSA and concentrator electricity.' })}
          {RateField('ocPowerKwh', 'Concentrator power', { suffix: 'kWh/hr', step: 0.05, tip: 'Average power draw of one oxygen concentrator, in kWh per hour of running.' })}
          {RateMap('psaPowerByCapacity', '500', 'PSA power — 500 LPM', { suffix: 'kWh/hr', tip: 'Power draw of a 500 LPM PSA plant, in kWh per hour of production.' })}
          {RateMap('psaPowerByCapacity', '1000', 'PSA power — 1000 LPM', { suffix: 'kWh/hr', tip: 'Power draw of a 1000 LPM PSA plant, in kWh per hour of production.' })}
          {RateMap('psaPowerByCapacity', '2000', 'PSA power — 2000 LPM', { suffix: 'kWh/hr', tip: 'Power draw of a 2000 LPM PSA plant, in kWh per hour of production.' })}
        </div>
        <div className="panel-section-title">Refilling</div>
        <div className="grid-2">
          {RateField('cylRefillD', 'D-type refill', { prefix: '₹', dist: 'cylRefillD', tip: 'Charge to refill one D-type (jumbo) cylinder. Defaults to your state’s survey median.' })}
          {RateField('cylRefillB', 'B-type refill', { prefix: '₹', dist: 'cylRefillB', tip: 'Charge to refill one B-type cylinder. Defaults to your state’s survey median.' })}
          {RateField('cylRefillA', 'A-type refill', { prefix: '₹', tip: 'Charge to refill one A-type (small) cylinder.' })}
          {RateField('lmoRatePerKg', 'LMO rate', { prefix: '₹', suffix: '/kg', tip: 'Liquid medical oxygen supply rate per kg, inclusive of delivery. Applied to the annual LMO volume.' })}
          {RateField('cylTransportPerTrip', 'Cylinder transport', { prefix: '₹', suffix: '/trip', tip: 'Cost of one round trip to the refilling vendor, split across the cylinders carried per trip.' })}
          {RateField('cylPerTrip', 'Cylinders / trip', { min: 1, tip: 'Average number of cylinders carried per transport trip — used to spread the per-trip transport cost.' })}
          {RateField('cylHydrotest', 'Hydrotest / cylinder', { prefix: '₹', tip: 'Mandatory hydrostatic pressure test cost per cylinder, done every 5 years (amortised annually).' })}
        </div>
        <div className="panel-section-title">Asset values &amp; AMC / repairs</div>
        <div className="grid-2">
          {RateMap('psaAssetByCapacity', '500', 'PSA asset — 500 LPM', { prefix: '₹', tip: 'Installed capital cost of a 500 LPM PSA plant. AMC and repair costs are a % of this.' })}
          {RateMap('psaAssetByCapacity', '1000', 'PSA asset — 1000 LPM', { prefix: '₹', tip: 'Installed capital cost of a 1000 LPM PSA plant. AMC and repair costs are a % of this.' })}
          {RateMap('psaAssetByCapacity', '2000', 'PSA asset — 2000 LPM', { prefix: '₹', tip: 'Installed capital cost of a 2000 LPM PSA plant. AMC and repair costs are a % of this.' })}
          {RatePct('psaCamcPct', 'PSA CAMC rate', 'Annual comprehensive AMC (parts + labour) as a % of the PSA plant’s asset value.')}
          {RatePct('psaRepairPct', 'PSA repairs rate', 'Annual ad-hoc repair spend beyond CAMC, as a % of the PSA plant’s asset value.')}
          {RateMap('lmoAssetByKl', '5', 'LMO tank asset — 5 KL', { prefix: '₹', tip: 'Installed cost of a 5 KL LMO tank + vaporiser. LMO AMC is a % of this.' })}
          {RateMap('lmoAssetByKl', '10', 'LMO tank asset — 10 KL', { prefix: '₹', tip: 'Installed cost of a 10 KL LMO tank + vaporiser. LMO AMC is a % of this.' })}
          {RateMap('lmoAssetByKl', '20', 'LMO tank asset — 20 KL', { prefix: '₹', tip: 'Installed cost of a 20 KL LMO tank + vaporiser. LMO AMC is a % of this.' })}
          {RatePct('lmoAmcPct', 'LMO AMC rate', 'Annual AMC for the LMO tank + vaporiser, as a % of its asset value.')}
          {RateField('mgpsAssetPerBhu', 'MGPS asset / BHU', { prefix: '₹', tip: 'Installed pipeline + manifold cost apportioned per bed-head unit. AMC and repairs are a % of (this × number of BHUs).' })}
          {RatePct('mgpsAmcPct', 'MGPS AMC rate', 'Annual AMC for the MGPS pipeline, as a % of its asset value.')}
          {RatePct('mgpsRepairPct', 'MGPS repairs rate', 'Annual ad-hoc MGPS repair spend, as a % of its asset value.')}
          {RateField('ocAsset', 'Concentrator asset', { prefix: '₹', tip: 'Purchase price of one oxygen concentrator. AMC is a % of this.' })}
          {RatePct('ocAmcPct', 'Concentrator AMC rate', 'Annual service contract for concentrators, as a % of unit value.')}
          {RateField('ocFilterPerYear', 'Concentrator filters', { prefix: '₹', suffix: '/yr', tip: 'Annual filter-replacement cost per concentrator (particle + bacterial filter set).' })}
          {RateField('oxiBedsideAsset', 'Bedside oximeter asset', { prefix: '₹', tip: 'Purchase price of one bedside/tabletop pulse oximeter. AMC is a % of this.' })}
          {RatePct('oxiBedsideAmcPct', 'Bedside oximeter AMC', 'Annual AMC for bedside oximeters, as a % of unit value.')}
          {RateField('oxiFingertipPerYear', 'Fingertip oximeter / yr', { prefix: '₹', tip: 'Annual consumables (battery, misc.) per fingertip pulse oximeter.' })}
          {RateField('oxiBedsideProbePerYear', 'Bedside probe / yr', { prefix: '₹', tip: 'Annual SpO₂ probe replacement cost per bedside oximeter.' })}
        </div>
        <div className="panel-section-title">Human resources</div>
        <div className="grid-2">
          {RateField('salaryGovtTech', 'Govt technician salary', { prefix: '₹', suffix: '/mo', tip: 'All-in monthly salary of a government-payroll oxygen/PSA technician (basic + DA + HRA).' })}
          {RateField('salaryContractTech', 'Contractual technician salary', { prefix: '₹', suffix: '/mo', dist: 'salaryContractTech', tip: 'Monthly consolidated salary of an NHM contractual oxygen technician. Defaults to your state’s survey median.' })}
          {RatePct('govtTechShare', 'Share on govt payroll', 'Share of dedicated oxygen technicians on regular government payroll; the rest are treated as NHM contractual.')}
        </div>
        <div className="panel-section-title">Training</div>
        <div className="grid-2">
          {RateField('trainDoctor', 'Training — doctor', { prefix: '₹', tip: 'Per-person cost to train one doctor on oxygen use (trainer + venue + materials).' })}
          {RateField('trainNurse', 'Training — nurse', { prefix: '₹', tip: 'Per-person cost to train one nurse on oxygen use.' })}
          {RateField('trainParamedic', 'Training — paramedic', { prefix: '₹', tip: 'Per-person cost to train one paramedic / ANM on oxygen use.' })}
          {RateField('trainPsaTech', 'Training — PSA technician', { prefix: '₹', tip: 'Per-person cost of technical PSA-operations training for a technician.' })}
          {RateField('refresherEveryYears', 'Refresher every', { suffix: 'yrs', min: 1, tip: 'How often clinical staff get refresher training. The refresher cost is annualised over this interval.' })}
          {RatePct('refresherPct', 'Refresher cost (of initial)', 'A refresher costs this % of the initial training cost.')}
        </div>
        <div className="panel-section-title">IEC &amp; contingency</div>
        <div className="grid-2">
          {RateMap('iec', 'large', 'IEC — large (MC / DH)', { prefix: '₹', suffix: '/yr', tip: 'Annual IEC & printing budget (SOPs, job aids, posters) for a large facility — Medical College / District Hospital.' })}
          {RateMap('iec', 'mid', 'IEC — mid (DH / SDH)', { prefix: '₹', suffix: '/yr', tip: 'Annual IEC & printing budget for a mid-size facility — DH / Sub-District Hospital.' })}
          {RateMap('iec', 'small', 'IEC — small (CHC / PHC)', { prefix: '₹', suffix: '/yr', tip: 'Annual IEC & printing budget for a small facility — CHC / PHC.' })}
          {RatePct('contingencyPct', 'Contingency buffer', 'A buffer added on top of the total direct cost to absorb estimation error and unforeseen spend.')}
        </div>
      </Collapsible>
      </div>
    </div>
  )
}

/** Mode B: enter the district's actual equipment totals directly. */
function DirectPanel({
  direct,
  onDirect,
  onReset,
}: {
  direct: DirectInputs
  onDirect: (patch: Partial<DirectInputs>) => void
  onReset: () => void
}) {
  const DF = (
    k: keyof DirectInputs & string,
    label: string,
    opts: { prefix?: string; suffix?: string; step?: number; min?: number; tip?: string } = {},
  ) => (
    <Field
      label={label}
      field={k}
      value={direct[k] as number}
      onChange={(v) => onDirect({ [k]: v } as Partial<DirectInputs>)}
      prefix={opts.prefix}
      suffix={opts.suffix}
      step={opts.step}
      min={opts.min}
      tip={opts.tip}
    />
  )
  return (
    <div className="panel src-shared" data-field-scope="direct" style={{ padding: '14px 15px' }}>
      <div className="panel-section-title" style={{ marginTop: 0 }}>
        Your district&apos;s equipment — totals
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Enter the actual totals across all your facilities. We cost them directly at the rates
        below — no modelling. Leave a row at 0 if you don&apos;t have it.{' '}
        <button className="btn-reset" onClick={onReset}>↺ Reset all inputs</button>
      </p>

      <div className="field" data-field="facilities">
        <label className="field-label"># facilities (for IEC / printing)</label>
        <div className="field-row">
          <NumberInput value={direct.facilities} onChange={(v) => onDirect({ facilities: Math.max(0, Math.round(v)) })} min={0} tone="req" ariaLabel="Number of facilities" />
          <select
            className="control"
            style={{ flex: '0 0 42%' }}
            value={direct.iecTier}
            onChange={(e) => onDirect({ iecTier: e.target.value as DirectInputs['iecTier'] })}
            aria-label="IEC facility tier"
          >
            <option value="small">IEC: small (CHC/PHC)</option>
            <option value="mid">IEC: mid (DH/SDH)</option>
            <option value="large">IEC: large (MC/DH)</option>
          </select>
        </div>
      </div>

      <div className="panel-section-title">PSA plants</div>
      <div className="grid-2">
        {DF('psaPlants', 'PSA plants (total)', { tip: 'Total number of PSA plants across your district.' })}
        {DF('psaCapacityLpm', 'Typical PSA capacity', { suffix: 'LPM', tip: 'Representative plant size, used to look up power draw and asset value.' })}
        {DF('psaProdHrsPerDay', 'PSA production hrs/day', { suffix: 'h', tip: 'Average hours per day the plants produce oxygen.' })}
      </div>

      <div className="panel-section-title">LMO</div>
      <div className="grid-2">
        {DF('lmoTanks', 'LMO tanks (total)', { tip: 'Total number of LMO tanks.' })}
        {DF('lmoCapacityKl', 'Typical tank size', { suffix: 'KL', tip: 'Representative tank size, used to look up asset value.' })}
        {DF('lmoAnnualKl', 'LMO volume (total)', { suffix: 'KL/yr', tip: 'Total liquid oxygen consumed across the district per year.' })}
      </div>

      <div className="panel-section-title">Cylinders</div>
      <div className="grid-2">
        {DF('cylDRefillsMo', 'D-type refills / month', { tip: 'Total D-type cylinder refills per month across the district.' })}
        {DF('cylBRefillsMo', 'B-type refills / month', { tip: 'Total B-type cylinder refills per month.' })}
        {DF('cylARefillsMo', 'A-type refills / month', { tip: 'Total A-type cylinder refills per month.' })}
        {DF('cylCount', 'Cylinders owned (total)', { tip: 'Total cylinders in stock — for the 5-yearly hydrostatic testing cost.' })}
      </div>

      <div className="panel-section-title">Concentrators &amp; pipeline</div>
      <div className="grid-2">
        {DF('ocDeployed', 'Concentrators (total)', { tip: 'Total oxygen concentrators in active use.' })}
        {DF('ocHrsPerDay', 'Concentrator hrs/day', { suffix: 'h', tip: 'Average hours per day each concentrator runs.' })}
        {DF('mgpsBhu', 'MGPS bed-head units (total)', { tip: 'Total functional bed-head oxygen outlets on pipelines.' })}
      </div>

      <div className="panel-section-title">Staff, oximeters &amp; training</div>
      <div className="grid-2">
        {DF('techs', 'Dedicated technicians (total)', { tip: 'Total staff dedicated to oxygen/PSA operations.' })}
        {DF('fingertip', 'Fingertip oximeters (total)', { tip: 'Total fingertip pulse oximeters.' })}
        {DF('bedside', 'Bedside oximeters (total)', { tip: 'Total bedside/tabletop pulse oximeters.' })}
        {DF('doctors', 'Doctors to train (total)', { tip: 'Total doctors to train on oxygen use.' })}
        {DF('nurses', 'Nurses to train (total)', { tip: 'Total nurses to train.' })}
        {DF('paramedics', 'Paramedics to train (total)', { tip: 'Total paramedics/ANMs to train.' })}
      </div>
    </div>
  )
}
