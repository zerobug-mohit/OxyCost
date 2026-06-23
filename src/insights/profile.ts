// Build a benchmarking profile + the input metrics from the app state. Shared
// by the recommendation synthesis and the Benchmarks section so they never drift.
import type { AppState } from '../state'
import type { UserMetrics, UserProfile } from './benchmark'

export function buildProfile(state: AppState, demand: number): UserProfile {
  return {
    oxBeds: state.oxBeds > 0 ? state.oxBeds : null,
    demand,
    sources: {
      psa: state.fleet.psa.length > 0,
      lmo: state.fleet.lmo.length > 0,
      cylinder: state.fleet.cylinder.length > 0,
      oc: state.fleet.oc.length > 0,
    },
  }
}

export function buildMetrics(state: AppState): UserMetrics {
  return {
    cylRefillD: state.fleet.cylinder.find((c) => c.cyl_type === 'd_type')?.cyl_refill_cost,
    cylRefillB: state.fleet.cylinder.find((c) => c.cyl_type === 'b_type')?.cyl_refill_cost,
    psaPowerPerLpm: state.fleet.psa
      .map((p) => (p.psa_capacity_lpm > 0 ? p.psa_power_kw / p.psa_capacity_lpm : 0))
      .filter((x) => x > 0),
    hrSalary: state.shared.hr_salary_monthly,
    lmoRental: state.fleet.lmo.map((l) => l.lmo_rental_monthly).filter((x) => x > 0),
  }
}
