// Demand input with three modes (spec section 5c, 9a step 1).
import { demandFromBeds } from '../../engine'
import type { AppState, DemandMode } from '../../state'
import { formatNumber } from '../../utils/format'
import { NumberInput } from '../shared/NumberInput'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  state: AppState
  onPatch: (patch: Partial<AppState>) => void
  resolvedDemand: number
}

const MODES: { key: DemandMode; label: string }[] = [
  { key: 'direct', label: 'Direct (cu m)' },
  { key: 'beds', label: 'From beds' },
]

export function DemandInput({ state, onPatch, resolvedDemand }: Props) {
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
        <div className="field">
          <label className="field-label">
            Monthly demand
            <Tooltip text="Total gaseous oxygen the facility consumes per month, in cubic metres." />
          </label>
          <NumberInput
            value={state.demandDirect}
            onChange={(v) => onPatch({ demandDirect: v })}
            suffix="cu m/mo"
            min={0}
            tone="req"
            ariaLabel="Monthly demand in cu m"
          />
        </div>
      )}

      {state.demandMode === 'beds' && (
        <div className="grid-2">
          <div className="field">
            <label className="field-label">O₂ beds</label>
            <NumberInput
              value={state.bedDemand.beds}
              onChange={(v) => onPatch({ bedDemand: { ...state.bedDemand, beds: v } })}
              min={0}
              tone="req"
              ariaLabel="Number of oxygen beds"
            />
          </div>
          <div className="field">
            <label className="field-label">Avg LPM / bed</label>
            <NumberInput
              value={state.bedDemand.lpmPerBed}
              onChange={(v) =>
                onPatch({ bedDemand: { ...state.bedDemand, lpmPerBed: v } })
              }
              suffix="LPM"
              min={0}
              tone="req"
              ariaLabel="Average LPM per bed"
            />
          </div>
          <div className="field">
            <label className="field-label">Avg hours / day</label>
            <NumberInput
              value={state.bedDemand.hoursPerDay}
              onChange={(v) =>
                onPatch({ bedDemand: { ...state.bedDemand, hoursPerDay: v } })
              }
              suffix="hrs"
              min={0}
              max={24}
              tone="req"
              ariaLabel="Average hours per day"
            />
          </div>
          <div className="field" style={{ alignSelf: 'end' }}>
            <span className="preset-hint">
              = {formatNumber(demandFromBeds(state.bedDemand.beds, state.bedDemand.lpmPerBed, state.bedDemand.hoursPerDay))}{' '}
              cu m/mo
            </span>
          </div>
        </div>
      )}

      <div className="small muted" style={{ marginTop: 6 }}>
        Active demand: <strong>{formatNumber(resolvedDemand)} cu m/month</strong>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label className="field-label">
          Oxygen beds <span className="muted small">(optional)</span>
          <Tooltip
            text="Number of oxygen-supported beds at the facility. Optional — it powers the peer benchmarking in the results (matching you to similar facilities)."
            effect="It does not change any cost; leave blank if unknown and matching falls back to your demand."
          />
        </label>
        <NumberInput
          value={state.oxBeds}
          onChange={(v) => onPatch({ oxBeds: v })}
          suffix="beds"
          min={0}
          tone="opt"
          ariaLabel="Oxygen beds (optional)"
        />
      </div>
    </div>
  )
}
