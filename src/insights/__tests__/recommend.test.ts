import { describe, expect, it } from 'vitest'
import { buildBenchmarkInsights } from '../recommend'
import { compareAllSources } from '../../engine'
import {
  CYLINDER_DEFAULTS,
  LMO_DEFAULTS,
  PSA_DEFAULTS,
  SHARED_DEFAULTS,
} from '../../engine'
import type { EngineInputs } from '../../engine'
import type { UserMetrics, UserProfile } from '../benchmark'

const inputs: EngineInputs = {
  demand_cu_m: 22000,
  shared: SHARED_DEFAULTS,
  psa: [{ ...PSA_DEFAULTS, psa_capacity_lpm: 1000, psa_run_hours_monthly: 300 }],
  lmo: [{ ...LMO_DEFAULTS }],
  cylinder: [{ ...CYLINDER_DEFAULTS }],
}
const result = compareAllSources(inputs)
const profile: UserProfile = {
  oxBeds: 60,
  demand: 22000,
  sources: { psa: true, lmo: true, cylinder: true, oc: false },
}

describe('buildBenchmarkInsights', () => {
  it('returns benchmark points and a synthesis', () => {
    const r = buildBenchmarkInsights(profile, {}, result)
    expect(Array.isArray(r.points)).toBe(true)
    expect(r.points.length).toBeGreaterThan(0)
    expect(r.synthesis.length).toBeGreaterThan(10)
  })

  it('synthesis names the most cost-effective source', () => {
    const r = buildBenchmarkInsights(profile, {}, result)
    // PSA is cheapest in this scenario.
    expect(r.synthesis).toMatch(/PSA/)
    expect(r.synthesis).toMatch(/cost-effective|all-in/i)
  })

  it('surfaces an input outlier flag as a benchmark point', () => {
    const metrics: UserMetrics = { cylRefillD: 900 }
    const r = buildBenchmarkInsights(profile, metrics, result)
    expect(r.points.some((p) => /refill/i.test(p))).toBe(true)
  })

  it('mentions PSA reliability when PSA is present', () => {
    const r = buildBenchmarkInsights(profile, {}, result)
    expect(r.points.some((p) => /non-functional/i.test(p))).toBe(true)
  })
})
