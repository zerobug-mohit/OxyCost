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
          <p className="field-help">
            How much oxygen the whole facility uses in a month, in cubic metres (cu m).
            Don&apos;t have this number? Switch to <strong>From beds</strong> above and
            we&apos;ll estimate it.
          </p>
          <NumberInput
            value={state.demandDirect}
            onChange={(v) => onPatch({ demandDirect: v })}
            suffix="cu m/mo"
            min={0}
            tone={state.demandDirect > 0 ? 'entered' : 'req'}
            ariaLabel="Monthly demand in cu m"
          />
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
              onChange={(v) =>
                onPatch({ bedDemand: { ...state.bedDemand, lpmPerBed: v } })
              }
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
              onChange={(v) =>
                onPatch({ bedDemand: { ...state.bedDemand, hoursPerDay: v } })
              }
              suffix="hrs"
              min={0}
              max={24}
              tone="opt"
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
        </>
      )}

      <div className="small muted" style={{ marginTop: 6 }}>
        Active demand: <strong>{formatNumber(resolvedDemand)} cu m/month</strong>
      </div>
    </div>
  )
}
