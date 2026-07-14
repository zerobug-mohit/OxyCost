// Facility-level shared costs, entered once (not per source): oxygen-technician
// HR and MGPS (pipeline) AMC/maintenance. These are incurred regardless of
// which source is used, so they are reported separately in the results and
// allocated across total delivered oxygen — they do not change source ranking.
import { SHARED_DEFAULTS } from '../../engine'
import type { SharedInputs } from '../../engine'
import { PresetToggle } from './PresetToggle'
import { Tooltip } from '../shared/Tooltip'
import { SourceNote } from '../shared/SourceNote'

interface Props {
  value: SharedInputs
  onChange: (patch: Partial<SharedInputs>) => void
  onReset: () => void
}

export function SharedCostsPanel({ value, onChange, onReset }: Props) {
  return (
    <details className="panel src-shared" open>
      <summary className="panel-head">
        <span className="panel-title">
          Shared facility costs
          <Tooltip
            text="Costs the facility pays regardless of which oxygen source is used — technician/HR salaries and MGPS pipeline upkeep. Entered once here, not inside each source."
            effect="Shown separately in the results and spread across all delivered oxygen as a flat ₹/cu m. Because every source carries the same amount, it does not change which source is cheapest — but it matters for the total budget."
          />
        </span>
        <span className="small muted">entered once</span>
      </summary>
      <div className="panel-body">
        <div className="panel-toolbar">
          <span className="small muted">
            These fields are pre-populated with default values. Verify and update them
            before proceeding.
          </span>
          <button
            type="button"
            className="btn-reset-all"
            onClick={onReset}
            title="Restore all shared-cost fields to their defaults"
          >
            ↺ Reset all
          </button>
        </div>
        <div className="grid-2">
          <PresetToggle
            label="Oxygen technician / HR salary"
            value={value.hr_salary_monthly}
            onChange={(v) => onChange({ hr_salary_monthly: v })}
            preset={SHARED_DEFAULTS.hr_salary_monthly}
            prefix="₹"
            suffix="/mo"
            tooltip="Total monthly salary for all staff dedicated to oxygen operations across the facility (not per source)."
          />
          <PresetToggle
            label="Other shared cost"
            value={value.other_shared_monthly}
            onChange={(v) => onChange({ other_shared_monthly: v })}
            preset={SHARED_DEFAULTS.other_shared_monthly}
            prefix="₹"
            suffix="/mo"
            tooltip="Any other facility-wide oxygen overhead not captured elsewhere (monthly)."
          />
          <PresetToggle
            label="MGPS AMC (annual, if applicable)"
            value={value.mgps_amc_annual}
            onChange={(v) => onChange({ mgps_amc_annual: v })}
            preset={SHARED_DEFAULTS.mgps_amc_annual}
            prefix="₹"
            tooltip="Annual AMC/CMC for the medical gas pipeline system (MGPS), if managed at facility level. Amortized monthly."
          />
          <PresetToggle
            label="MGPS ad hoc maintenance & repairs (annual)"
            value={value.mgps_maintenance_annual}
            onChange={(v) => onChange({ mgps_maintenance_annual: v })}
            preset={SHARED_DEFAULTS.mgps_maintenance_annual}
            prefix="₹"
            tooltip="Annual ad-hoc MGPS maintenance/repair spend beyond AMC. Amortized monthly."
          />
        </div>
        <SourceNote>
          HR salary defaults to ₹10,000/month as a planning figure — replace it
          with your facility&apos;s actual cost. MGPS costs default to zero —
          enter your facility&apos;s figures.
        </SourceNote>
      </div>
    </details>
  )
}
