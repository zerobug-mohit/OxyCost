// Step 2: configure each source by VARIANT (capacity / type / output) and a
// count per variant. Each unit becomes its own panel in Step 3, pre-typed with
// the chosen variant. Replaces the old plain count steppers.
import { useState } from 'react'
import type { SourceType } from '../../engine'
import type { Fleet } from '../../state'
import {
  isPreset,
  SOURCE_VARIANTS,
  variantLabel,
  variantValueOf,
  type VariantValue,
} from '../../variants'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  fleet: Fleet
  onSet: (source: SourceType, value: VariantValue, count: number) => void
}

const SOURCES: { key: SourceType; title: string; desc: string; tip: string }[] = [
  {
    key: 'psa',
    title: 'PSA plants',
    desc: 'On-site generation from ambient air',
    tip: 'Pick each plant capacity and how many you have (use Custom for non-standard sizes). Each plant gets its own panel in Step 3 for power, run hours and costs.',
  },
  {
    key: 'lmo',
    title: 'LMO tanks',
    desc: 'Bulk cryogenic, tanker-delivered',
    tip: 'Pick tank capacity (KL) and how many. Capacity is descriptive — LMO cost depends on monthly consumption, not tank size, which you enter in Step 3.',
  },
  // Ordered for the 2-column grid: concentrators sit under PSA (col 1) and
  // cylinders under LMO (col 2).
  {
    key: 'oc',
    title: 'Concentrator groups',
    desc: 'Bedside, low-purity supplement',
    tip: 'Tick the per-unit flow(s) you use (5 / 10 LPM, or add a custom LPM). You enter deployed unit counts and run hours per flow in Step 3.',
  },
  {
    key: 'cylinder',
    title: 'Cylinder lines',
    desc: 'Portable, supplier-refilled',
    tip: 'Pick the cylinder type(s) you use. You enter the monthly cylinder count and refill cost in Step 3.',
  },
]

const MAX = 12

export function SourceConfigurator({ fleet, onSet }: Props) {
  return (
    <div className="src-config">
      {SOURCES.map((s) => (
        <SourceBlock key={s.key} meta={s} fleet={fleet} onSet={onSet} />
      ))}
    </div>
  )
}

function SourceBlock({
  meta,
  fleet,
  onSet,
}: {
  meta: { key: SourceType; title: string; desc: string; tip: string }
  fleet: Fleet
  onSet: Props['onSet']
}) {
  const { key, title, desc, tip } = meta
  const cfg = SOURCE_VARIANTS[key]
  const instances = fleet[key]
  const total = instances.length
  const [customVal, setCustomVal] = useState('')
  // Cylinders and concentrators are selected by ticking the type(s)/flow(s) in
  // use — one unit per selection; counts and details come in Step 3. PSA and LMO
  // keep the count stepper (you can have several of the same capacity).
  const checkboxMode = key === 'cylinder' || key === 'oc'

  const countOf = (value: VariantValue) =>
    instances.filter((i) => variantValueOf(key, i) === value).length

  // Distinct custom (non-preset) values already present, so they stay editable.
  const customPresent: VariantValue[] = []
  for (const inst of instances) {
    const v = variantValueOf(key, inst)
    if (!isPreset(key, v) && !customPresent.includes(v)) customPresent.push(v)
  }

  const addCustom = () => {
    const v = Number(customVal)
    if (!Number.isFinite(v) || v <= 0) return
    onSet(key, v, checkboxMode ? 1 : countOf(v) + 1)
    setCustomVal('')
  }

  return (
    <div className={`src-block src-${key} ${total > 0 ? 'on' : ''}`}>
      <div className="src-block-head">
        <span className="sc-title">
          {title} <Tooltip text={tip} />
        </span>
        <span className="src-block-count">
          {total} unit{total === 1 ? '' : 's'}
        </span>
      </div>
      <div className="sc-desc">{desc}</div>

      {checkboxMode ? (
        // Cylinders & concentrators: tick the type(s)/flow(s) in use (or add a
        // custom flow). One unit per selection; counts/details come in Step 3.
        <div className="variant-rows">
          {cfg.options.map((o) => (
            <CheckRow
              key={String(o.value)}
              label={o.label}
              checked={countOf(o.value) > 0}
              onChange={(on) => onSet(key, o.value, on ? 1 : 0)}
            />
          ))}
          {customPresent.map((v) => (
            <CheckRow
              key={String(v)}
              label={`${variantLabel(key, v)} (custom)`}
              checked={countOf(v) > 0}
              onChange={(on) => onSet(key, v, on ? 1 : 0)}
            />
          ))}
          {cfg.custom && (
            <div className="variant-row custom-add">
              <span className="num-input" style={{ maxWidth: 150 }}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  placeholder={`Custom ${cfg.unit}`}
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  aria-label={`Custom ${title} ${cfg.unit}`}
                />
                <span className="suffix">{cfg.unit}</span>
              </span>
              <button
                type="button"
                className="btn-reset"
                disabled={!(Number(customVal) > 0)}
                onClick={addCustom}
              >
                + Add
              </button>
            </div>
          )}
        </div>
      ) : (
      <div className="variant-rows">
        {cfg.options.map((o) => (
          <VariantRow
            key={String(o.value)}
            label={o.label}
            count={countOf(o.value)}
            onChange={(n) => onSet(key, o.value, n)}
          />
        ))}
        {customPresent.map((v) => (
          <VariantRow
            key={String(v)}
            label={`${variantLabel(key, v)} (custom)`}
            count={countOf(v)}
            onChange={(n) => onSet(key, v, n)}
          />
        ))}
        {cfg.custom && (
          <div className="variant-row custom-add">
            <span className="num-input" style={{ maxWidth: 150 }}>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                placeholder={`Custom ${cfg.unit}`}
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                aria-label={`Custom ${title} ${cfg.unit}`}
              />
              <span className="suffix">{cfg.unit}</span>
            </span>
            <button
              type="button"
              className="btn-reset"
              disabled={!(Number(customVal) > 0)}
              onClick={addCustom}
            >
              + Add
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <label className={`variant-row check ${checked ? 'active' : ''}`}>
      <span className="variant-label">{label}</span>
      <input
        type="checkbox"
        className="variant-check"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
    </label>
  )
}

function VariantRow({
  label,
  count,
  onChange,
}: {
  label: string
  count: number
  onChange: (n: number) => void
}) {
  return (
    <div className={`variant-row ${count > 0 ? 'active' : ''}`}>
      <span className="variant-label">{label}</span>
      <div className="stepper" role="group" aria-label={label}>
        <button
          type="button"
          aria-label={`Remove one ${label}`}
          disabled={count === 0}
          onClick={() => onChange(Math.max(0, count - 1))}
        >
          −
        </button>
        <span className="stepper-val">{count}</span>
        <button
          type="button"
          aria-label={`Add one ${label}`}
          disabled={count >= MAX}
          onClick={() => onChange(Math.min(MAX, count + 1))}
        >
          +
        </button>
      </div>
    </div>
  )
}
