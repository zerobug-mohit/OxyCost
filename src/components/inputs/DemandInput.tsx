// Demand input for the facility cost calculator. Three ways to set the monthly
// oxygen demand everything is costed against:
//  • Enter directly    — type the monthly demand in any oxygen unit (cu m / D-type cyl / kg).
//  • Facility archetype — month + state + facility type + monthly avg IPD → matched
//    to the closest demand strata → admissions × factor → auto-derived demand.
//  • Ward-by-ward       — the full case-mix method (patients per ward), no pandemic.
// Demand is stored internally in cu m of gas.
import { useState } from 'react'
import type { AppState, DemandMode, WardsDemandInputs } from '../../state'
import { COST_UNITS, cuMToVolume, formatNumber, volumeToCuM, type CostUnit } from '../../utils/format'
import {
  MONTH_LABELS,
  STATES,
  demandFromAdmissions,
  defaultAssumptions,
  facilityTypesFor,
} from '../../demand-engine'
import { NumberInput } from '../shared/NumberInput'
import { Tooltip } from '../shared/Tooltip'
import { WardDemandFields } from './WardDemandFields'

interface Props {
  state: AppState
  onPatch: (patch: Partial<AppState>) => void
  resolvedDemand: number
  onDisplayUnit?: (u: CostUnit) => void
}

const MODES: { key: DemandMode; label: string }[] = [
  { key: 'direct', label: 'Enter directly' },
  { key: 'admissions', label: 'Facility archetype' },
  { key: 'wards', label: 'Ward-by-ward' },
]

function unitName(u: CostUnit): string {
  return u === 'kg' ? 'kg' : u === 'dcyl' ? 'D-type cyl' : 'cu m'
}

export function DemandInput({ state, onPatch, resolvedDemand, onDisplayUnit }: Props) {
  const [unit, setUnit] = useState<CostUnit>('cu_m')
  const changeUnit = (u: CostUnit) => { setUnit(u); onDisplayUnit?.(u) }
  const shown = cuMToVolume(state.demandDirect, unit)

  const ad = state.admissionsDemand
  const setAd = (patch: Partial<typeof ad>) => onPatch({ admissionsDemand: { ...ad, ...patch } })
  const setWards = (patch: Partial<WardsDemandInputs>) => onPatch({ wardsDemand: { ...state.wardsDemand, ...patch } })
  const { seasonality, scalars } = defaultAssumptions()
  const est = demandFromAdmissions(ad.state, ad.facilityType, ad.ipd, ad.month, seasonality, ad.scenario, scalars.pandemicSurge)
  const types = facilityTypesFor(ad.state)

  return (
    <div>
      <div className="view-toggle" data-tour="demand-methods" style={{ marginBottom: 12 }}>
        {MODES.map((m) => (
          <button key={m.key} className={state.demandMode === m.key ? 'active' : ''} onClick={() => onPatch({ demandMode: m.key })}>
            {m.label}
          </button>
        ))}
      </div>

      {state.demandMode === 'direct' && (
        <div className="field" data-field="demand">
          <label className="field-label">
            Monthly demand
            <Tooltip text="Total gaseous oxygen the facility consumes per month. Enter it in whatever unit you have — cu m, D-type cylinders (7 cu m each) or kg." />
          </label>
          <p className="field-help">
            How much oxygen the whole facility uses in a month. Enter it in any unit — we convert
            it. Don&apos;t have this number? Estimate it with <strong>Facility archetype</strong> or{' '}
            <strong>Ward-by-ward</strong> above.
          </p>
          <div className="field-row">
            <NumberInput value={shown} onChange={(v) => onPatch({ demandDirect: volumeToCuM(v, unit) })} min={0} tone={state.demandDirect > 0 ? 'entered' : 'req'} ariaLabel="Monthly demand" />
            <select className="control" style={{ flex: '0 0 34%' }} value={unit} onChange={(e) => changeUnit(e.target.value as CostUnit)} aria-label="Demand unit">
              {COST_UNITS.map((u) => <option key={u.key} value={u.key}>{unitName(u.key)}/mo</option>)}
            </select>
          </div>
          {unit !== 'cu_m' && <span className="preset-hint">= {formatNumber(state.demandDirect)} cu m gas (engine basis)</span>}
        </div>
      )}

      {state.demandMode === 'admissions' && (
        <div className="field">
          <label className="field-label">
            Estimate demand from admissions
            <Tooltip text="Matches your facility to the closest demand strata (State × facility type × admission band) and uses that band's O₂-per-admission factor to estimate monthly demand." />
          </label>
          <p className="field-help">
            Pick the month, state and facility type, and enter the average monthly IPD admissions —
            we estimate the oxygen demand.
          </p>
          <div className="field" style={{ marginBottom: 10 }}>
            <label className="field-label">
              Scenario
              <Tooltip text={`Pandemic multiplies the estimated demand by ${scalars.pandemicSurge}× to size for a surge.`} />
            </label>
            <div className="view-toggle">
              <button className={ad.scenario === 'normal' ? 'active' : ''} onClick={() => setAd({ scenario: 'normal' })}>Normal</button>
              <button className={ad.scenario === 'pandemic' ? 'active' : ''} onClick={() => setAd({ scenario: 'pandemic' })}>Pandemic</button>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="field-label">Month</label>
              <select className="control" value={ad.month} onChange={(e) => setAd({ month: Number(e.target.value) })} aria-label="Month">
                {MONTH_LABELS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">State</label>
              <select className="control" value={ad.state} onChange={(e) => { const st = e.target.value; setAd({ state: st, facilityType: facilityTypesFor(st)[0] ?? ad.facilityType }) }} aria-label="State">
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Facility type</label>
              <select className="control" value={ad.facilityType} onChange={(e) => setAd({ facilityType: e.target.value })} aria-label="Facility type">
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Avg monthly IPD</label>
              <NumberInput value={ad.ipd} onChange={(v) => setAd({ ipd: Math.max(0, Math.round(v)) })} min={0} tone={ad.ipd > 0 ? 'entered' : 'req'} ariaLabel="Average monthly IPD admissions" />
            </div>
          </div>
          <span className="preset-hint">
            {ad.ipd > 0 && est.tranche
              ? `= ${formatNumber(Math.round(est.cuM))} cu m/mo (${formatNumber(Math.round(est.mt * 100) / 100)} MT · matched: ${est.tranche.type} · ≤ ${est.tranche.band} band)`
              : 'Enter monthly IPD admissions to estimate demand.'}
          </span>
          {ad.scenario === 'pandemic' && (
            <p className="field-help" style={{ marginTop: 6 }}>
              <strong>Pandemic:</strong> the normal estimate is multiplied by{' '}
              <strong>{scalars.pandemicSurge}×</strong> to size for a COVID-scale surge, when a far
              larger share of admissions need oxygen and at higher flows. Switch back to{' '}
              <strong>Normal</strong> for routine planning.
            </p>
          )}
        </div>
      )}

      {state.demandMode === 'wards' && (
        <div className="field">
          <label className="field-label">
            Estimate demand ward-by-ward
            <Tooltip text="The workbook case-mix method: for each ward, oxygen patients are split by severity, each with a flow rate, duration and case-mix share. See the full calculation on the output side." />
          </label>
          <WardDemandFields value={state.wardsDemand} onChange={setWards} />
        </div>
      )}

      <div className="small muted" style={{ marginTop: 6 }}>
        Active demand:{' '}
        <strong>{formatNumber(cuMToVolume(resolvedDemand, unit))} {unitName(unit)}/month</strong>
        {unit !== 'cu_m' && <> ({formatNumber(resolvedDemand)} cu m)</>}
      </div>
    </div>
  )
}
