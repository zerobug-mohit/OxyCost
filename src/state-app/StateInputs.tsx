// Input column for the District / State planner. Required input: how many
// facilities in each size band (+ their typical size). The infrastructure mix
// (sub-bands), state rates and model assumptions are pre-filled and editable.
import { useState, type ReactNode } from 'react'
import type { BandKey, BandProfile, DirectInputs, StateInputs, StateMode, StatePart, StateRates, StateResult } from '../state-engine'
import { BAND_KEYS, STATE_META, bandFieldEcon, bandLabel, confidenceLevel, defaultBandBeds, defaultRates, directFieldEcon, initialStateInputs } from '../state-engine'
import type { TabKey } from '../components/layout/Header'
import { NumberInput } from '../components/shared/NumberInput'
import { Tooltip } from '../components/shared/Tooltip'
import { Collapsible } from '../components/shared/Collapsible'
import { formatNumber } from '../utils/format'
import { focusInputField } from '../utils/focusField'
import { MiniDistribution } from './MiniDistribution'

interface Props {
  value: StateInputs
  result: StateResult
  onCount: (band: BandKey, n: number) => void
  onBeds: (band: BandKey, beds: number) => void
  onMode: (mode: StateMode) => void
  onDirect: (patch: Partial<DirectInputs>) => void
  onOverride: (band: BandKey, patch: Partial<BandProfile>) => void
  onResetOverride: (band: BandKey, key: keyof BandProfile) => void
  onRates: (patch: Partial<StateRates>) => void
  onReset: () => void
  onNavigate?: (tab: TabKey, anchor?: string) => void
}

/** Preset PSA capacities (LPM) in the state planner; others are user-added. */
const STATE_PSA_PRESET_CAPS = new Set(['200', '500', '1000', '1500'])

/**
 * Factory defaults for the direct-entry totals, so a scalar field can be shown
 * green only when the user has actually changed it from its default (some
 * defaults, e.g. concentrator run-hours, are non-zero — a bare "> 0" test would
 * paint them green on load).
 */
const DIRECT_DEFAULTS = initialStateInputs().direct

/**
 * Estimate a default rate for a custom PSA capacity by interpolating the
 * existing capacity→rate points (power or asset). Piecewise-linear inside the
 * known range; proportional to LPM outside it. Editable afterwards.
 */
function interpByCapacity(map: Record<string, number>, lpm: number): number {
  const pts = Object.keys(map)
    .map((k) => [Number(k), map[k]] as [number, number])
    .filter(([k, v]) => k > 0 && Number.isFinite(v))
    .sort((a, b) => a[0] - b[0])
  if (pts.length === 0) return 0
  const first = pts[0]
  const last = pts[pts.length - 1]
  if (lpm <= first[0]) return Math.round((first[1] * lpm) / first[0])
  if (lpm >= last[0]) return Math.round((last[1] * lpm) / last[0])
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    if (lpm >= x0 && lpm <= x1) return Math.round(y0 + ((y1 - y0) * (lpm - x0)) / (x1 - x0))
  }
  return Math.round(last[1])
}

/** Per-source accent colour for the archetype cards (matches the output charts). */
const SRC_COLOR: Record<string, string> = {
  psaProb: '#0f7c8b',
  lmoProb: '#2b8a3e',
  cylProb: '#b5852a',
  ocProb: '#7048a8',
  mgpsProb: '#1597a8',
  techProb: '#4c6ef5',
}

/** Minimal line icon per source, drawn in the source's accent colour. */
function SourceIcon({ k }: { k: string }) {
  const c = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (k) {
    case 'psaProb': // on-site plant / factory
      return (
        <svg {...c}>
          <path d="M3 20h18" />
          <path d="M5 20v-8l4 2.5V12l4 2.5V8l4 2.5V20" />
        </svg>
      )
    case 'lmoProb': // cryogenic tank
      return (
        <svg {...c}>
          <rect x="7" y="3.5" width="10" height="17" rx="5" />
          <path d="M9.5 12.5h5" />
        </svg>
      )
    case 'cylProb': // gas cylinder
      return (
        <svg {...c}>
          <path d="M11 5V3.5h2V5" />
          <rect x="8.5" y="5" width="7" height="15" rx="3.2" />
        </svg>
      )
    case 'ocProb': // concentrator device (air waves)
      return (
        <svg {...c}>
          <rect x="3.5" y="7" width="17" height="11" rx="2" />
          <path d="M7 12.6c1.3-2.2 2.4 2.2 3.7 0s2.4 2.2 3.7 0" />
        </svg>
      )
    case 'mgpsProb': // piped network
      return (
        <svg {...c}>
          <circle cx="6" cy="12" r="2.2" />
          <circle cx="18" cy="12" r="2.2" />
          <path d="M8.2 12h7.6M12 12V5.5" />
          <circle cx="12" cy="4" r="1.6" />
        </svg>
      )
    case 'techProb': // person / staff
      return (
        <svg {...c}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
      )
    default:
      return null
  }
}

/** Plain-English facility types that typically sit in each oxygen-bed band. */
const BAND_TYPE: Record<BandKey, string> = {
  '<10': 'PHC / sub-centre',
  '10-29': 'CHC',
  '30-59': 'Sub-district / small district hospital',
  '60+': 'District hospital / medical college',
}

/** Colour legend for the input fields (amber wording varies by section). */
function StateLegend({ amber }: { amber: string }) {
  return (
    <div className="field-legend">
      <span className="lg">
        <span className="legend-swatch entered" /> Green — your value
      </span>
      <span className="lg">
        <span className="legend-swatch opt" /> Yellow — {amber}
      </span>
    </div>
  )
}

/** Generic provenance — no per-state figures broadcast. */
const SAMPLE_SUMMARY = `${STATE_META.n} facilities across three states in India`

/**
 * Inline "unit economics" for an input field: the per-unit annual cost it
 * drives, with clickable pills that jump to the underlying rate below (mirrors
 * the output-side breakdown, in reverse).
 */
function EconLine({ parts }: { parts: StatePart[] }) {
  return (
    <p className="field-econ">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <button
            key={i}
            type="button"
            className="calc-ref"
            title="Go to this rate below"
            onClick={() => focusInputField(p.target === 'rate' ? 'rates' : p.target, p.field)}
          >
            {p.t}
          </button>
        ),
      )}
    </p>
  )
}

function Field({
  label, value, onChange, prefix, suffix, step, min = 0, max, tip, help, canReset, onReset, field, entered, required, econ,
}: {
  label: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; min?: number; max?: number; tip?: string; help?: string
  canReset?: boolean; onReset?: () => void; field?: string; entered?: boolean; required?: boolean
  econ?: StatePart[] | null
}) {
  const filled = Number.isFinite(value) && value > 0
  // Green = changed from default (or explicitly "entered"); yellow = default;
  // red = required and still empty.
  const isEntered = entered ?? canReset ?? false
  const tone: 'req' | 'opt' | 'entered' = required && !filled ? 'req' : isEntered ? 'entered' : 'opt'
  return (
    <div className="field" data-field={field}>
      <label className="field-label">
        {label}
        {tip && <Tooltip text={tip} />}
      </label>
      {help && <p className="field-help">{help}</p>}
      <div className="field-row">
        <NumberInput value={value} onChange={onChange} prefix={prefix} suffix={suffix} step={step} min={min} max={max} tone={tone} ariaLabel={label} />
        {canReset && onReset && (
          <button type="button" className="btn-reset" title="Reset to model / default value" onClick={onReset}>
            ↺
          </button>
        )}
      </div>
      {econ && econ.length > 0 && <EconLine parts={econ} />}
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
  label, value, onChange, dist, prefix, suffix, min = 0, max, step, tip, help, canReset, onReset, field, econ,
}: {
  label: string; value: number; onChange: (v: number) => void
  dist?: string; prefix?: string; suffix?: string; min?: number; max?: number; step?: number; tip?: string; help?: string
  canReset?: boolean; onReset?: () => void; field?: string; econ?: StatePart[] | null
}) {
  return (
    <div className="edit-field">
      <Field label={label} value={value} onChange={onChange} prefix={prefix} suffix={suffix} min={min} max={max} step={step} tip={tip} help={help} canReset={canReset} onReset={onReset} field={field} econ={econ} />
      {dist ? <MiniDistribution field={dist} current={value} /> : null}
    </div>
  )
}

export function StateInputsPanel({ value, result, onCount, onBeds, onMode, onDirect, onOverride, onResetOverride, onRates, onReset, onNavigate }: Props) {
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
    const hasDefault = def !== undefined
    const set = (v: number) =>
      onRates({ [mapKey]: { ...(rates[mapKey] as Record<string, number>), [sub]: v } } as Partial<StateRates>)
    return (
      <Field label={label} field={`${mapKey}.${sub}`} value={cur} onChange={set} prefix={opts.prefix} suffix={opts.suffix} tip={opts.tip} canReset={hasDefault && cur !== def} onReset={() => hasDefault && set(def)} />
    )
  }

  return (
    <div>
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
            effect="Size drives a data-based prediction of each facility's oxygen equipment and running cost; the count multiplies it. Refine how many of each size have each source under 'Refine each size' for more accuracy."
          />
        </div>
        <p className="small muted" style={{ marginTop: 0 }}>
          Facilities come in different sizes, so we group them into four bands (roughly PHC
          → Medical College). Enter <strong># facilities</strong> and their{' '}
          <strong>typical size</strong> (oxygen beds). Only the count is required.
        </p>
        <p className="small muted" style={{ marginTop: 0 }}>
          The <strong>typical size</strong> is pre-filled by the{' '}
          <strong>k-Nearest-Neighbour model</strong> from the survey facilities across the
          three states — edit it to match your facilities.{' '}
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
                  <span className="small muted">{BAND_TYPE[b]}</span>
                  <span className="small muted">Typically {b} oxygen beds</span>
                </div>
                <div className="state-band-fields">
                  <div className="mini-field">
                    <span className="mini-field-cap">beds / facility</span>
                    <div className="field-row">
                      <NumberInput value={beds[b]} onChange={(v) => onBeds(b, Math.max(1, Math.round(v)))} min={1} tone={beds[b] !== defaultBandBeds(b) ? 'entered' : 'opt'} ariaLabel={`Typical oxygen beds for ${level}`} />
                      {beds[b] !== defaultBandBeds(b) && (
                        <button type="button" className="btn-reset" title="Reset to model default" onClick={() => onBeds(b, defaultBandBeds(b))}>↺</button>
                      )}
                    </div>
                  </div>
                  <div className="mini-field">
                    <span className="mini-field-cap"># facilities</span>
                    <div className="field-row">
                      <NumberInput value={counts[b] || 0} onChange={(v) => onCount(b, Math.max(0, Math.round(v)))} min={0} tone={(counts[b] || 0) > 0 ? 'entered' : 'opt'} ariaLabel={`Number of ${level} facilities`} />
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

      {/* ---- Model assumptions: per-band infrastructure counts & sizes ---- */}
      <Collapsible className="subpanel" summary="Refine each size — how many have each source (editable)">
        <p className="small muted">
          Within each size band, facilities differ most in their infrastructure — some run
          a PSA plant, some an LMO tank, some only cylinders. For each size, set{' '}
          <strong>how many of your facilities have each source</strong> (pre-filled from the
          most similar surveyed facilities) plus the typical size of each. This is the main
          accuracy lever — pin it to what you know about your district.
        </p>
        <p className="small muted">
          Predictions are drawn from the WJCF assessment of <strong>{SAMPLE_SUMMARY}</strong>{' '}
          (11 of 92 excluded — no oxygen-bed count recorded); every surveyed facility is
          weighted by how similar it is to your size, regardless of state.{' '}
          {onNavigate && (
            <button className="link-btn" onClick={() => onNavigate('methodology', 'knn')}>
              How the k-nearest-neighbour model works →
            </button>
          )}
        </p>
        <StateLegend amber="k-NN model prediction (editable)" />
        {BAND_KEYS.filter((b) => (counts[b] || 0) > 0).length === 0 && (
          <p className="small muted">Enter facility counts above to configure each size.</p>
        )}
        {BAND_KEYS.map((b) => {
          const br = bandResultOf(b)
          if (!br) return null
          const N = counts[b] || 0
          if (N <= 0) return null
          const level = bandLabel(b).split(' (')[0]
          const p: BandProfile = br.profile
          const ov = (patch: Partial<BandProfile>) => onOverride(b, patch)
          const isOv = (k: keyof BandProfile) => overrides[b][k] !== undefined
          const rst = (k: keyof BandProfile) => () => onResetOverride(b, k)
          const EF = (k: keyof BandProfile, label: string, opts: { dist?: string; suffix?: string; min?: number; max?: number; tip?: string; help?: string } = {}) => (
            <EditField label={label} field={String(k)} value={p[k] as number} onChange={(v) => ov({ [k]: v } as Partial<BandProfile>)} dist={opts.dist} suffix={opts.suffix} min={opts.min} max={opts.max} tip={opts.tip} help={opts.help} canReset={isOv(k)} onReset={rst(k)} econ={bandFieldEcon(k, p, rates)} />
          )
          // One source = a card: "how many of N have it" (+ proportion bar) and,
          // when any do, its typical-size fields. Dimmed when none have it.
          const srcCard = (
            probKey: keyof BandProfile,
            name: string,
            tip: string,
            fields: ReactNode,
          ) => {
            const color = SRC_COLOR[probKey as string] ?? 'var(--c-primary)'
            const have = Math.round((p[probKey] as number) * N)
            const pct = N > 0 ? Math.round((have / N) * 100) : 0
            return (
              <div
                className={`src-card${have > 0 ? '' : ' off'}`}
                data-field={String(probKey)}
                style={{ borderLeftColor: color, ['--src' as string]: color }}
              >
                <div className="src-card-head">
                  <span className="src-card-icon" style={{ color, background: `${color}1f` }}>
                    <SourceIcon k={String(probKey)} />
                  </span>
                  <span className="src-card-main">
                    <span className="src-card-name">
                      {name}
                      <Tooltip text={tip} />
                    </span>
                    <span className="src-card-sub">
                      {have === 0
                        ? `none of your ${N} ${N === 1 ? 'facility has' : 'facilities have'} one`
                        : `at ${have} of your ${N} ${N === 1 ? 'facility' : 'facilities'} · ${pct}%`}
                    </span>
                  </span>
                  <label className="src-card-have">
                    <span className="src-card-havecap">how many have&nbsp;it</span>
                    <span className="src-card-havebox">
                      <NumberInput
                        value={have}
                        onChange={(v) => ov({ [probKey]: Math.max(0, Math.min(N, Math.round(v))) / N } as Partial<BandProfile>)}
                        min={0}
                        max={N}
                        tone={isOv(probKey) ? 'entered' : 'opt'}
                        ariaLabel={`How many of your ${N} facilities have ${name}`}
                      />
                      <span className="src-card-of">of {N}</span>
                      {isOv(probKey) && (
                        <button type="button" className="btn-reset" title="Reset to model default" onClick={rst(probKey)}>
                          ↺
                        </button>
                      )}
                    </span>
                  </label>
                </div>
                {N <= 12 ? (
                  <div className="src-card-pips">
                    {Array.from({ length: N }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`pip${i < have ? ' on' : ''}`}
                        title={`Set ${i + 1 === have ? i : i + 1} of ${N}`}
                        aria-label={`Set ${i + 1} of ${N} have ${name}`}
                        onClick={() => ov({ [probKey]: (i + 1 === have ? i : i + 1) / N } as Partial<BandProfile>)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="src-card-bar" aria-hidden>
                    <span style={{ width: `${pct}%`, background: color }} />
                  </div>
                )}
                {have > 0 && <div className="src-card-fields grid-2">{fields}</div>}
              </div>
            )
          }
          return (
            <div key={b} data-field-scope={`band-${b}`}>
            <Collapsible
              className="subpanel"
              summary={`${level} (${BAND_TYPE[b]}) · ${N} ${N === 1 ? 'facility' : 'facilities'} · ~${beds[b]} beds`}
            >
              <p className="small muted" style={{ marginTop: 2 }}>
                Each card is one oxygen source. Set <strong>how many of your {N}</strong>{' '}
                {BAND_TYPE[b].toLowerCase()} {N === 1 ? 'facility has' : 'facilities have'} it —
                type the number or click the squares (one square = one facility) — then its
                typical size. Counts are pre-filled from the most similar survey
                facilities; correct them to match your district.{' '}
                {onNavigate && (
                  <button className="link-btn" onClick={() => onNavigate('methodology', 'knn')}>
                    See the model &amp; diagram →
                  </button>
                )}
              </p>
              <div className="src-card-grid">
                {srcCard(
                  'psaProb',
                  'PSA plant',
                  'How many of your facilities this size run an on-site PSA oxygen plant.',
                  <>
                    {EF('psaPlants', 'Plants each', { dist: 'psaPlants', min: 1, help: 'Average plants at a facility that has PSA (usually 1).', tip: 'Number of PSA plants a facility that has PSA runs.' })}
                    {EF('psaCapacityLpm', 'Capacity', { dist: 'psaCapacityLpm', suffix: 'LPM', help: 'Typical rated output; sets power draw & plant cost.', tip: 'Rated output of the PSA plant in litres/minute. Larger plants draw more power and cost more to buy and maintain.' })}
                    {EF('psaProdHrsPerDay', 'Production hrs/day', { suffix: 'h', max: 24, help: 'Average hours/day the plant actually makes oxygen.', tip: 'Hours per day the plant actually produces oxygen. Directly scales PSA electricity cost.' })}
                  </>,
                )}
                {srcCard(
                  'lmoProb',
                  'LMO tank',
                  'How many have a bulk liquid-oxygen (cryogenic) tank.',
                  <>{EF('lmoAnnualKl', 'Volume each', { suffix: 'KL/yr', help: 'Average liquid O₂ used per year by a facility with a tank.', tip: 'Litres of liquid oxygen (in KL) a facility with an LMO tank consumes per year. Multiplied by the ₹/kg rate for the LMO refilling cost.' })}</>,
                )}
                {srcCard(
                  'cylProb',
                  'Cylinders',
                  'How many use oxygen cylinders.',
                  <>
                    {EF('cylDRefillsMo', 'D-type refills/mo', { dist: 'cylDRefillsMo', help: 'Average D-type (jumbo) refills/month at a cylinder facility.', tip: 'D-type (jumbo) cylinder refills per month at a facility that uses cylinders.' })}
                    {EF('cylBRefillsMo', 'B-type refills/mo', { dist: 'cylBRefillsMo', help: 'Average B-type refills/month at a cylinder facility.', tip: 'B-type cylinder refills per month, costed at the B-type refill rate.' })}
                    {EF('cylARefillsMo', 'A-type refills/mo', { dist: 'cylARefillsMo', help: 'Average A-type (small) refills/month at a cylinder facility.', tip: 'A-type (small) cylinder refills per month, costed at the A-type refill rate.' })}
                    {EF('cylDCount', 'Cylinders owned', { dist: 'cylDCount', help: 'Cylinders in stock (for 5-yearly hydro-testing only).', tip: 'Cylinders in stock at a facility that uses cylinders. Used to amortise the 5-yearly hydrostatic testing cost.' })}
                  </>,
                )}
                {srcCard(
                  'ocProb',
                  'Concentrators',
                  'How many use oxygen concentrators.',
                  <>
                    {EF('ocDeployed', 'Units each', { dist: 'ocDeployed', help: 'Average concentrators at a facility that has them.', tip: 'Number of oxygen concentrators in active use at a facility that has them.' })}
                    {EF('ocHrsPerDay', 'Hours/day', { suffix: 'h', max: 24, help: 'Average hours/day each concentrator runs.', tip: 'Average hours per day each concentrator runs. Scales concentrator electricity cost.' })}
                  </>,
                )}
                {srcCard(
                  'mgpsProb',
                  'Piped oxygen (MGPS)',
                  'How many have a medical gas pipeline.',
                  <>{EF('mgpsBhu', 'Bed-head units each', { dist: 'mgpsBhu', help: 'Average piped-oxygen outlets at an MGPS facility.', tip: 'Functional bed-head oxygen outlets on the pipeline at a facility that has MGPS.' })}</>,
                )}
                {srcCard(
                  'techProb',
                  'Dedicated technician',
                  'How many have staff dedicated to oxygen/PSA operations.',
                  <>{EF('techs', 'Technicians each', { dist: 'techs', min: 0, help: 'Average dedicated O₂ staff where they exist.', tip: 'Staff dedicated to oxygen/PSA operations at a facility that has them.' })}</>,
                )}
              </div>

              <div className="state-sub-title">Every facility (applies to all {N})</div>
              <div className="grid-2">
                <EditField label="Typical oxygen beds" value={beds[b]} onChange={(v) => onBeds(b, Math.max(1, Math.round(v)))} dist="oxBeds" suffix="beds" min={1} help="Typical oxygen beds at a facility this size — the model predicts everything else from this." tip="The typical number of oxygen-supported beds at a facility of this band. This is the size the model predicts everything else from." canReset={beds[b] !== defaultBandBeds(b)} onReset={() => onBeds(b, defaultBandBeds(b))} />
                {EF('fingertip', 'Fingertip oximeters', { help: 'Assumed per facility (not surveyed) — average count.', tip: 'Assumed fingertip pulse oximeters per facility (norm — not surveyed). Drives their annual consumable cost.' })}
                {EF('bedside', 'Bedside oximeters', { help: 'Assumed per facility (not surveyed) — average count.', tip: 'Assumed bedside/tabletop oximeters per facility (norm). Drives their AMC and probe/battery costs.' })}
                {EF('doctors', 'Doctors (to train)', { help: 'Average doctors to train per facility.', tip: 'Assumed doctors to train on oxygen use per facility (norm). Drives clinical training cost.' })}
                {EF('nurses', 'Nurses (to train)', { help: 'Average nurses to train per facility.', tip: 'Assumed nurses to train per facility (norm). Drives clinical training cost.' })}
                {EF('paramedics', 'Paramedics (to train)', { help: 'Average paramedics/ANMs to train per facility.', tip: 'Assumed paramedics/ANMs to train on oxygen use per facility (norm). Drives clinical training cost.' })}
              </div>
            </Collapsible>
            </div>
          )
        })}
      </Collapsible>
      </>
      )}

      {mode === 'direct' && <DirectPanel direct={direct} onDirect={onDirect} onRates={onRates} onReset={onReset} rates={rates} />}

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
          {Object.keys(rates.psaPowerByCapacity)
            .sort((a, b) => Number(a) - Number(b))
            .map((cap) => (
              <span key={`pwr-${cap}`}>
                {RateMap('psaPowerByCapacity', cap, `PSA power — ${cap} LPM`, { suffix: 'kWh/hr', tip: `Power draw of a ${cap} LPM PSA plant, in kWh per hour of production.` })}
              </span>
            ))}
        </div>
        <div className="panel-section-title">Refilling</div>
        <div className="grid-2">
          {RateField('cylRefillD', 'D-type refill', { prefix: '₹', tip: 'Charge to refill one D-type (jumbo) cylinder. Update to your contracted rate.' })}
          {RateField('cylRefillB', 'B-type refill', { prefix: '₹', tip: 'Charge to refill one B-type cylinder. Update to your contracted rate.' })}
          {RateField('cylRefillA', 'A-type refill', { prefix: '₹', tip: 'Charge to refill one A-type (small) cylinder.' })}
          {RateField('lmoRatePerKg', 'LMO rate', { prefix: '₹', suffix: '/kg', tip: 'Liquid medical oxygen supply rate per kg, inclusive of delivery. Applied to the annual LMO volume.' })}
          {RateField('cylTransportPerTrip', 'Cylinder transport', { prefix: '₹', suffix: '/trip', tip: 'Cost of one round trip to the refilling vendor, split across the cylinders carried per trip.' })}
          {RateField('cylPerTrip', 'Cylinders / trip', { min: 1, tip: 'Average number of cylinders carried per transport trip — used to spread the per-trip transport cost.' })}
          {RateField('cylHydrotest', 'Hydrotest / cylinder', { prefix: '₹', tip: 'Mandatory hydrostatic pressure test cost per cylinder, done every 5 years (amortised annually).' })}
        </div>
        <div className="panel-section-title">Asset values &amp; AMC / repairs</div>
        <div className="grid-2">
          {Object.keys(rates.psaAssetByCapacity)
            .sort((a, b) => Number(a) - Number(b))
            .map((cap) => (
              <span key={`ast-${cap}`}>
                {RateMap('psaAssetByCapacity', cap, `PSA asset — ${cap} LPM`, { prefix: '₹', tip: `Installed capital cost of a ${cap} LPM PSA plant. AMC and repair costs are a % of this.` })}
              </span>
            ))}
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
          {RateField('salaryContractTech', 'Contractual technician salary', { prefix: '₹', suffix: '/mo', tip: 'Monthly consolidated salary of an NHM contractual oxygen technician. Update to your pay matrix.' })}
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
  onRates,
  onReset,
  rates,
}: {
  direct: DirectInputs
  onDirect: (patch: Partial<DirectInputs>) => void
  onRates: (patch: Partial<StateRates>) => void
  onReset: () => void
  rates: StateRates
}) {
  const [customCap, setCustomCap] = useState('')
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
      entered={(direct[k] as number) !== (DIRECT_DEFAULTS[k] as number)}
      econ={directFieldEcon(k, direct, rates)}
    />
  )
  // A facility count for one IEC tier.
  const facSet = (tier: 'small' | 'mid' | 'large', label: string, tip: string) => (
    <Field
      label={label}
      field={`facilitiesByTier.${tier}`}
      value={direct.facilitiesByTier[tier]}
      onChange={(v) =>
        onDirect({ facilitiesByTier: { ...direct.facilitiesByTier, [tier]: Math.max(0, Math.round(v)) } })
      }
      min={0}
      tip={tip}
      entered={direct.facilitiesByTier[tier] > 0}
      econ={directFieldEcon(`facilitiesByTier.${tier}`, direct, rates)}
    />
  )
  // A tank count within the LMO "by size" record.
  const DB = (bucket: string, label: string, tip: string) => (
    <Field
      label={label}
      field={`lmoTanksByKl.${bucket}`}
      value={direct.lmoTanksByKl[bucket] ?? 0}
      onChange={(v) =>
        onDirect({ lmoTanksByKl: { ...direct.lmoTanksByKl, [bucket]: Math.max(0, Math.round(v)) } })
      }
      min={0}
      tip={tip}
      entered={(direct.lmoTanksByKl[bucket] ?? 0) > 0}
      econ={directFieldEcon(`lmoTanksByKl.${bucket}`, direct, rates)}
    />
  )
  // Set a PSA capacity row's total plants, functional plants, or hours/day.
  // Functional is clamped to the total; total raises functional if it would drop
  // below it, so "non-functional = total − functional" is never negative.
  const psaSet = (cap: string, prop: 'total' | 'functional' | 'hrs', v: number) => {
    const row = direct.psaByCapacity[cap] ?? { total: 0, functional: 0, hrs: 0 }
    const next = { ...row }
    if (prop === 'hrs') {
      next.hrs = Math.max(0, Math.min(24, v))
    } else if (prop === 'total') {
      next.total = Math.max(0, Math.round(v))
      next.functional = Math.min(next.functional, next.total)
    } else {
      next.functional = Math.max(0, Math.min(Math.round(v), row.total))
    }
    onDirect({ psaByCapacity: { ...direct.psaByCapacity, [cap]: next } })
  }
  const psaCaps = Object.keys(rates.psaPowerByCapacity).sort((a, b) => Number(a) - Number(b))
  const lmoSizes = Object.keys(rates.lmoAssetByKl).sort((a, b) => Number(a) - Number(b))

  // Add a user-defined PSA capacity: seed power & asset rates by interpolating
  // the existing curve (editable in State unit rates below), plus an empty row.
  const addCap = () => {
    const v = Math.round(Number(customCap))
    if (!(v > 0)) return
    const key = String(v)
    if (!direct.psaByCapacity[key]) {
      onRates({
        psaPowerByCapacity: { ...rates.psaPowerByCapacity, [key]: interpByCapacity(rates.psaPowerByCapacity, v) },
        psaAssetByCapacity: { ...rates.psaAssetByCapacity, [key]: interpByCapacity(rates.psaAssetByCapacity, v) },
      })
      onDirect({
        psaByCapacity: { ...direct.psaByCapacity, [key]: { total: 0, functional: 0, hrs: v >= 1000 ? 12 : 8 } },
      })
    }
    setCustomCap('')
  }
  // Remove a user-added capacity (presets stay).
  const removeCap = (cap: string) => {
    const pby = { ...direct.psaByCapacity }
    delete pby[cap]
    onDirect({ psaByCapacity: pby })
    const pw = { ...rates.psaPowerByCapacity }
    const as = { ...rates.psaAssetByCapacity }
    delete pw[cap]
    delete as[cap]
    onRates({ psaPowerByCapacity: pw, psaAssetByCapacity: as })
  }
  const capExists = !!direct.psaByCapacity[String(Math.round(Number(customCap)))]
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

      <div className="panel-section-title" style={{ marginTop: 0 }}>PSA plants — by capacity</div>
      <p className="small muted" style={{ marginTop: 0 }}>
        For each plant size, enter the total plants, how many are functional, and the hours a
        day the functional plants run. Only functional plants produce oxygen and draw
        electricity; non-functional plants still carry AMC &amp; repair costs.
      </p>
      <div className="direct-rows">
        {psaCaps.map((cap) => {
          const row = direct.psaByCapacity[cap] ?? { total: 0, functional: 0, hrs: 0 }
          const nonFunc = Math.max(0, row.total - row.functional)
          return (
            <div className="direct-row psa-row" key={cap}>
              <span className="direct-row-label">
                {cap} LPM
                {!STATE_PSA_PRESET_CAPS.has(cap) && (
                  <button
                    type="button"
                    className="scenario-x"
                    style={{ marginLeft: 6 }}
                    onClick={() => removeCap(cap)}
                    title={`Remove the ${cap} LPM capacity`}
                    aria-label={`Remove ${cap} LPM capacity`}
                  >
                    ✕
                  </button>
                )}
              </span>
              <span className="mini-field" data-field={`psaByCapacity.${cap}.total`}>
                <span className="mini-field-cap"># total plants</span>
                <NumberInput value={row.total} onChange={(v) => psaSet(cap, 'total', v)} min={0} tone={row.total > 0 ? 'entered' : 'opt'} ariaLabel={`${cap} LPM total plants`} />
              </span>
              <span className="mini-field" data-field={`psaByCapacity.${cap}.functional`}>
                <span className="mini-field-cap"># functional</span>
                <NumberInput value={row.functional} onChange={(v) => psaSet(cap, 'functional', v)} min={0} max={row.total} tone={row.total > 0 && row.functional > 0 ? 'entered' : 'opt'} ariaLabel={`${cap} LPM functional plants`} />
              </span>
              <span className="mini-field" data-field={`psaByCapacity.${cap}.hrs`}>
                <span className="mini-field-cap">hrs/day (functional)</span>
                <NumberInput value={row.hrs} onChange={(v) => psaSet(cap, 'hrs', v)} min={0} max={24} tone="opt" ariaLabel={`${cap} LPM production hours per day`} />
              </span>
              <span className="mini-field">
                <span className="mini-field-cap"># non-functional</span>
                <span className="mini-field-ro" aria-label={`${cap} LPM non-functional plants`}>{nonFunc}</span>
              </span>
              <div className="psa-row-econ">
                <EconLine
                  parts={[
                    ...(directFieldEcon(`psaByCapacity.${cap}.functional`, direct, rates) ?? []),
                    ' · ',
                    ...(directFieldEcon(`psaByCapacity.${cap}.total`, direct, rates) ?? []),
                  ]}
                />
              </div>
            </div>
          )
        })}
        <div className="variant-row custom-add">
          <span className="num-input" style={{ maxWidth: 150 }}>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              placeholder="Custom LPM"
              value={customCap}
              onChange={(e) => setCustomCap(e.target.value)}
              aria-label="Custom PSA capacity (LPM)"
            />
            <span className="suffix">LPM</span>
          </span>
          <button
            type="button"
            className="btn-reset"
            disabled={!(Number(customCap) > 0) || capExists}
            onClick={addCap}
            title={capExists ? 'That capacity is already listed' : 'Add a custom PSA capacity'}
          >
            + Add capacity
          </button>
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Added a custom size? Set its power draw and asset cost under{' '}
        <strong>State unit rates</strong> below — they start from an interpolated estimate.
      </p>

      <div className="panel-section-title">LMO tanks — by size</div>
      <div className="grid-2">
        {lmoSizes.map((kl) => (
          <span key={kl}>{DB(kl, `${kl} KL tanks`, `Number of ${kl} KL LMO tanks (drives their AMC).`)}</span>
        ))}
        {DF('lmoAnnualKl', 'LMO volume (total)', { suffix: 'KL/yr', tip: 'Total liquid oxygen consumed across the district per year — drives refilling cost.' })}
      </div>

      <div className="panel-section-title">Concentrators — by usage</div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Split units by how hard they run — high-use (wards) vs low-use (OPD / standby) — so
        electricity isn&apos;t averaged across very different run-hours.
      </p>
      <div className="grid-2">
        {DF('ocHighUnits', 'High-use units', { tip: 'Concentrators running long hours (e.g. inpatient wards).' })}
        {DF('ocHighHrs', 'High-use hrs/day', { suffix: 'h', tip: 'Average hours per day the high-use units run.' })}
        {DF('ocLowUnits', 'Low-use units', { tip: 'Concentrators running few hours (OPD / standby).' })}
        {DF('ocLowHrs', 'Low-use hrs/day', { suffix: 'h', tip: 'Average hours per day the low-use units run.' })}
      </div>

      <div className="panel-section-title">Cylinders</div>
      <div className="grid-2">
        {DF('cylDRefillsMo', 'D-type refills / month', { tip: 'Total D-type cylinder refills per month across the district.' })}
        {DF('cylBRefillsMo', 'B-type refills / month', { tip: 'Total B-type cylinder refills per month.' })}
        {DF('cylARefillsMo', 'A-type refills / month', { tip: 'Total A-type cylinder refills per month.' })}
        {DF('cylCount', 'Cylinders owned (total)', { tip: 'Total cylinders in stock — for the 5-yearly hydrostatic testing cost.' })}
      </div>

      <div className="panel-section-title">Piped oxygen (MGPS)</div>
      <div className="grid-2">
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

      <div className="panel-section-title">Facilities by type — for IEC / printing</div>
      <p className="small muted" style={{ marginTop: 0 }}>
        A relatively small cost, entered last. A district is usually a mix of facility types —
        enter how many of each you have; each is costed at its own per-facility IEC rate.
      </p>
      <div className="grid-2">
        {facSet('large', 'Large facilities (MC / DH)', 'Number of large facilities — Medical College / District Hospital.')}
        {facSet('mid', 'Mid facilities (DH / SDH)', 'Number of mid-size facilities — District / Sub-District Hospital.')}
        {facSet('small', 'Small facilities (CHC / PHC)', 'Number of small facilities — CHC / PHC.')}
      </div>
    </div>
  )
}
