// Demand input with two modes (direct / from beds). Demand is stored internally
// in cu m of gas, but the user may enter and read it in any oxygen unit
// (cu m / Nm³ / kg); picking a unit here also sets the output display unit.
import { useState } from 'react'
import { demandFromBeds } from '../../engine'
import type { AppState, DemandMode } from '../../state'
import { COST_UNITS, cuMToVolume, formatNumber, volumeToCuM, type CostUnit } from '../../utils/format'
import { NumberInput } from '../shared/NumberInput'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  state: AppState
  onPatch: (patch: Partial<AppState>) => void
  resolvedDemand: number
  /** Sync the output display unit when the user changes the demand unit. */
  onDisplayUnit?: (u: CostUnit) => void
}

const MODES: { key: DemandMode; label: string }[] = [
  { key: 'direct', label: 'Direct' },
  { key: 'beds', label: 'From beds' },
]

function unitName(u: CostUnit): string {
  return u === 'kg' ? 'kg' : u === 'nm3' ? 'Nm³' : 'cu m'
}

export function DemandInput({ state, onPatch, resolvedDemand, onDisplayUnit }: Props) {
  const [unit, setUnit] = useState<CostUnit>('cu_m')
  const changeUnit = (u: CostUnit) => {
    setUnit(u)
    onDisplayUnit?.(u)
  }
  const shown = cuMToVolume(state.demandDirect, unit)

  return (
    <div>
      <div className="view-toggle" style={{ marginBottom: 12 }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            className={state.demandMode === m.key ? 'active' : ''}
            onClick={() => onPatch({ demandMode: m.key })}
          >
            {m.label}
          </button>
        ))}
      </div>

      {state.demandMode === 'direct' && (
        <div className="field" data-field="demand">
          <label className="field-label">
            Monthly demand
            <Tooltip text="Total gaseous oxygen the facility consumes per month. Enter it in whatever unit you have — cu m, Nm³ or kg." />
          </label>
          <p className="field-help">
            How much oxygen the whole facility uses in a month. Enter it in any unit —
            we convert it. Don&apos;t have this number? Switch to <strong>From beds</strong>{' '}
            above and we&apos;ll estimate it.
          </p>
          <div className="field-row">
            <NumberInput
              value={shown}
              onChange={(v) => onPatch({ demandDirect: volumeToCuM(v, unit) })}
              min={0}
              tone={state.demandDirect > 0 ? 'entered' : 'req'}
              ariaLabel="Monthly demand"
            />
            <select
              className="control"
              style={{ flex: '0 0 34%' }}
              value={unit}
              onChange={(e) => changeUnit(e.target.value as CostUnit)}
              aria-label="Demand unit"
            >
              {COST_UNITS.map((u) => (
                <option key={u.key} value={u.key}>
                  {unitName(u.key)}/mo
                </option>
              ))}
            </select>
          </div>
          {unit !== 'cu_m' && (
            <span className="preset-hint">= {formatNumber(state.demandDirect)} cu m gas (engine basis)</span>
          )}
        </div>
      )}

      {state.demandMode === 'beds' && (
        <>
          <p className="field-help">
            Enter how many oxygen beds you have and how much each typically uses — we
            work out the monthly demand for you.
          </p>
          <div className="grid-2">
            <div className="field">
              <label className="field-label">O₂ beds</label>
              <NumberInput
                value={state.bedDemand.beds}
                onChange={(v) => onPatch({ bedDemand: { ...state.bedDemand, beds: v } })}
                min={0}
                tone={state.bedDemand.beds > 0 ? 'entered' : 'req'}
                ariaLabel="Number of oxygen beds"
              />
            </div>
            <div className="field">
              <label className="field-label">Avg LPM / bed</label>
              <NumberInput
                value={state.bedDemand.lpmPerBed}
                onChange={(v) => onPatch({ bedDemand: { ...state.bedDemand, lpmPerBed: v } })}
                suffix="LPM"
                min={0}
                tone="opt"
                ariaLabel="Average LPM per bed"
              />
            </div>
            <div className="field">
              <label className="field-label">Avg hours / day</label>
              <NumberInput
                value={state.bedDemand.hoursPerDay}
                onChange={(v) => onPatch({ bedDemand: { ...state.bedDemand, hoursPerDay: v } })}
                suffix="hrs"
                min={0}
                max={24}
                tone="opt"
                ariaLabel="Average hours per day"
              />
            </div>
            <div className="field" style={{ alignSelf: 'end' }}>
              <span className="preset-hint">
                = {formatNumber(demandFromBeds(state.bedDemand.beds, state.bedDemand.lpmPerBed, state.bedDemand.hoursPerDay))} cu m/mo
              </span>
            </div>
          </div>
        </>
      )}

      <div className="small muted" style={{ marginTop: 6 }}>
        Active demand:{' '}
        <strong>
          {formatNumber(cuMToVolume(resolvedDemand, unit))} {unitName(unit)}/month
        </strong>
        {unit !== 'cu_m' && <> ({formatNumber(resolvedDemand)} cu m)</>}
      </div>
    </div>
  )
}
