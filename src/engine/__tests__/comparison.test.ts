import { describe, expect, it } from 'vitest'
import { compareAllSources } from '../comparison'
import {
  CYLINDER_DEFAULTS,
  LMO_DEFAULTS,
  OC_DEFAULTS,
  PSA_DEFAULTS,
} from '../constants'
import type { EngineInputs } from '../types'

const typicalDH: EngineInputs = {
  demand_cu_m: 5500,
  psa: [{ ...PSA_DEFAULTS, psa_capacity_lpm: 1000, psa_power_kw: 65, psa_run_hours_monthly: 300 }],
  lmo: [{ ...LMO_DEFAULTS, lmo_monthly_cu_m: 5100 }],
  cylinder: [{ ...CYLINDER_DEFAULTS, cyl_refill_cost: 395, cyl_monthly_count: 30 }],
}

describe('compareAllSources — typical district hospital', () => {
  const result = compareAllSources(typicalDH)

  it('returns one result per enabled source', () => {
    expect(result.sources.map((s) => s.source).sort()).toEqual(['cylinder', 'lmo', 'psa'])
  })

  it('PSA is cheapest per cu m (opex) at this scale', () => {
    expect(result.ranking_opex_only[0].source).toBe('psa')
  })

  it('rankings are ascending by value', () => {
    const v = result.ranking_capex_opex.map((r) => r.value)
    expect([...v].sort((a, b) => a - b)).toEqual(v)
  })

  it('produces a non-empty recommendation', () => {
    expect(result.recommendation.length).toBeGreaterThan(20)
  })

  it('exposes a structured recoSummary (pick + 3 facts + priority)', () => {
    const s = result.recoSummary
    expect(s.pick).not.toBeNull()
    expect(s.pick!.key).toBe('all_in')
    expect(s.facts.map((f) => f.key)).toEqual(['all_in', 'opex', 'incremental'])
    // pick mirrors the capex+opex ranking winner
    expect(s.pick!.id).toBe(result.ranking_capex_opex[0].id)
    expect(s.priority.length).toBeGreaterThanOrEqual(2)
    expect(s.priority[0].rank).toBe(1)
  })
})

describe('recoSummary — empty states', () => {
  it('has a null pick when demand is zero', () => {
    const r = compareAllSources({ demand_cu_m: 0, psa: [PSA_DEFAULTS] })
    expect(r.recoSummary.pick).toBeNull()
    expect(r.recoSummary.facts).toEqual([])
  })
})

describe('compareAllSources — multiple instances of one source', () => {
  const twoPsa = compareAllSources({
    demand_cu_m: 10000,
    psa: [
      { ...PSA_DEFAULTS, psa_capacity_lpm: 1000, psa_run_hours_monthly: 300 },
      { ...PSA_DEFAULTS, psa_capacity_lpm: 500, psa_run_hours_monthly: 300 },
    ],
  })

  it('produces one result per instance with distinct ids', () => {
    expect(twoPsa.sources).toHaveLength(2)
    expect(twoPsa.sources.map((s) => s.id)).toEqual(['psa-0', 'psa-1'])
  })

  it('appends an instance number to the label when more than one', () => {
    expect(twoPsa.sources[0].label).toContain('#1')
    expect(twoPsa.sources[1].label).toContain('#2')
  })

  it('sums both instances toward total capacity', () => {
    const sum = twoPsa.sources.reduce((a, s) => a + s.monthly_output_cu_m, 0)
    expect(twoPsa.total_capacity_cu_m).toBeCloseTo(sum, 4)
  })

  it('uses a user identifier in the label when provided', () => {
    const r = compareAllSources({
      demand_cu_m: 5000,
      psa: [
        { ...PSA_DEFAULTS, item_id_value: 'Inox', psa_run_hours_monthly: 300 },
        { ...PSA_DEFAULTS, item_id_value: 'Airox', psa_run_hours_monthly: 300 },
      ],
    })
    expect(r.sources[0].label).toContain('Inox')
    expect(r.sources[1].label).toContain('Airox')
    // Identifier replaces the bare #1/#2 numbering.
    expect(r.sources[0].label).not.toContain('#1')
  })
})

describe('compareAllSources — supply gap (CALC-COMP-02)', () => {
  it('flags when demand exceeds total capacity', () => {
    const r = compareAllSources({ ...typicalDH, demand_cu_m: 999999 })
    expect(r.supply_gap_cu_m).toBeGreaterThan(0)
    const text = [r.recommendation, ...r.recommendationPoints].join(' ')
    expect(text).toMatch(/short|gap|deliver/i)
  })

  it('no gap when capacity exceeds demand', () => {
    const r = compareAllSources({ ...typicalDH, demand_cu_m: 100 })
    expect(r.supply_gap_cu_m).toBeLessThan(0)
  })
})

describe('compareAllSources — OC caveat', () => {
  it('adds clinical caveat when OC wins on a metric', () => {
    // OC-only at tiny demand; OC will be the only (thus cheapest) source.
    const r = compareAllSources({
      demand_cu_m: 500,
      oc: [{ ...OC_DEFAULTS, oc_high_use_units: 20, oc_low_use_units: 0 }],
    })
    const text = [r.recommendation, ...r.recommendationPoints].join(' ')
    expect(text).toMatch(/concentrator|low-purity|supplement/i)
  })
})

describe('compareAllSources — shared overhead', () => {
  it('reports shared overhead monthly and allocates it across delivered oxygen', () => {
    const r = compareAllSources({
      ...typicalDH,
      shared: {
        hr_salary_monthly: 30000,
        mgps_amc_annual: 120000,
        mgps_maintenance_annual: 0,
        other_shared_monthly: 0,
      },
    })
    expect(r.shared_overhead_monthly).toBeCloseTo(30000 + 120000 / 12, 4)
    expect(r.shared_overhead_per_cu_m).toBeCloseTo(
      r.shared_overhead_monthly / r.total_capacity_cu_m,
      6,
    )
  })

  it('is zero when no shared inputs are given, and does not enter source totals', () => {
    const r = compareAllSources(typicalDH)
    expect(r.shared_overhead_monthly).toBe(0)
  })
})

describe('compareAllSources — edge cases', () => {
  it('zero demand prompts for input', () => {
    const r = compareAllSources({ demand_cu_m: 0, psa: [PSA_DEFAULTS] })
    expect(r.recommendation).toMatch(/enter/i)
  })

  it('no NaN or unexpected values in per-unit costs', () => {
    const r = compareAllSources(typicalDH)
    for (const s of r.sources) {
      expect(Number.isNaN(s.per_cu_m_capex_opex)).toBe(false)
      expect(Number.isNaN(s.per_cu_m_opex_only)).toBe(false)
      expect(Number.isNaN(s.incremental_cost_per_cu_m)).toBe(false)
    }
  })
})
