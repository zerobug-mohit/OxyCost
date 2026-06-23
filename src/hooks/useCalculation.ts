// Bridges UI state -> engine. Recomputes on every input change via useMemo
// (architecture decision 7a.4: no Calculate button).
import { useMemo } from 'react'
import { compareAllSources, demandFromBeds } from '../engine'
import type { ComparisonResult, EngineInputs } from '../engine'
import type { AppState } from '../state'

/** Resolve the active demand (cu m/month) from the selected demand mode. */
export function resolveDemand(state: AppState): number {
  switch (state.demandMode) {
    case 'beds':
      return demandFromBeds(
        state.bedDemand.beds,
        state.bedDemand.lpmPerBed,
        state.bedDemand.hoursPerDay,
      )
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
