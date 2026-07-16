// Bridges UI state -> engine. Recomputes on every input change via useMemo
// (architecture decision 7a.4: no Calculate button).
import { useMemo } from 'react'
import { compareAllSources } from '../engine'
import type { ComparisonResult, EngineInputs } from '../engine'
import { MT_TO_CUM, computeFacilityDemand, defaultAssumptions, demandFromAdmissions } from '../demand-engine'
import type { AppState } from '../state'

/** Resolve the active demand (cu m/month) from the selected demand mode. */
export function resolveDemand(state: AppState): number {
  switch (state.demandMode) {
    case 'admissions': {
      const a = state.admissionsDemand
      const { seasonality, scalars } = defaultAssumptions()
      return demandFromAdmissions(
        a.state,
        a.facilityType,
        a.ipd,
        a.month,
        seasonality,
        'normal',
        scalars.pandemicSurge,
      ).cuM
    }
    case 'wards': {
      // Full ward case mix. No pandemic scenario. Cost against the average
      // month (annual ÷ 12) — the representative monthly demand — which matches
      // the "Avg month" figure shown on the demand output.
      const w = state.wardsDemand
      const m = Math.max(0, Math.min(11, w.month))
      const res = computeFacilityDemand({ wardPatients: w.wardPatients }, w.assumptions, 'normal', m)
      return res.baseMonthlyMT * MT_TO_CUM
    }
    case 'direct':
    default:
      return state.demandDirect
  }
}

export function useCalculation(state: AppState): {
  demand: number
  result: ComparisonResult
  inputs: EngineInputs
} {
  return useMemo(() => {
    const demand = resolveDemand(state)
    const f = state.fleet
    const inputs: EngineInputs = {
      demand_cu_m: demand,
      shared: state.shared,
      ...(f.psa.length ? { psa: f.psa } : {}),
      ...(f.lmo.length ? { lmo: f.lmo } : {}),
      ...(f.cylinder.length ? { cylinder: f.cylinder } : {}),
      ...(f.oc.length ? { oc: f.oc } : {}),
    }
    return { demand, result: compareAllSources(inputs), inputs }
  }, [state])
}
