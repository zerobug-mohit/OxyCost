import { describe, expect, it } from 'vitest'
import { calcPsa } from '../psa'
import type { PsaInputs } from '../types'

function base(overrides: Partial<PsaInputs> = {}): PsaInputs {
  return {
    psa_capacity_lpm: 1000,
    psa_power_kw: 65,
    psa_compressor_power_fraction: 0.9,
    psa_compressor_run_fraction: 0.9,
    psa_capacity_utilization: 1,
    electricity_rate_per_kwh: 7.52,
    electricity_fixed_monthly: 25000,
    psa_plant_cost: 7_500_000,
    psa_plant_life_years: 10,
    psa_amc_annual: 245250,
    psa_repair_annual: 75000,
    psa_consumables_annual: 0,
    psa_run_hours_monthly: 300,
    ...overrides,
  }
}

// Hand-computed reference for the base case:
//  production = 300 × 0.9 = 270 hrs; output = 1000 × 1 × 60 × 270 / 1000 = 16,200
//  electricity = (58.5 kW × 270) + (6.5 kW × 300) = 17,745 kWh × 7.52 = 133,442.4
//  maintenance 20,437.5 + repairs 6,250 + depreciation 62,500 + fixed 25,000
//  total = 247,629.9
describe('calcPsa — compressor-split model (base case)', () => {
  const r = calcPsa(base())

  it('output uses production hours = run × compressor-run fraction', () => {
    expect(r.monthly_output_cu_m).toBeCloseTo(16200, 4)
  })
  it('electricity splits compressor (production hrs) and balance-of-plant (run hrs)', () => {
    const elec = r.components.find((c) => c.key === 'electricity_usage')!
    expect(elec.amount).toBeCloseTo(17745 * 7.52, 2)
  })
  it('total monthly cost (no shared HR) = 247,629.9', () => {
    expect(r.total_monthly_cost).toBeCloseTo(247629.9, 1)
  })
  it('per cu m capex+opex ≈ 15.286', () => {
    expect(r.per_cu_m_capex_opex).toBeCloseTo(247629.9 / 16200, 3)
  })
  it('opex-only excludes depreciation', () => {
    expect(r.per_cu_m_opex_only).toBeCloseTo((247629.9 - 62500) / 16200, 3)
  })
  it('incremental = electricity usage / output', () => {
    expect(r.incremental_cost_per_cu_m).toBeCloseTo((17745 * 7.52) / 16200, 4)
  })
  it('no technician salary component (now shared)', () => {
    expect(r.components.find((c) => c.key === 'technician')).toBeUndefined()
  })
})

describe('calcPsa — full compressor run + full capacity reproduces simple output', () => {
  it('fraction 1 & util 1: output = capacity × 60 × run / 1000', () => {
    const r = calcPsa(base({ psa_compressor_run_fraction: 1, psa_capacity_utilization: 1, psa_run_hours_monthly: 720, psa_capacity_lpm: 1500 }))
    expect(r.monthly_output_cu_m).toBeCloseTo((1500 * 60 * 720) / 1000, 4)
  })
})

describe('calcPsa — capacity utilization', () => {
  it('output scales with utilization; electricity stays flat (per-unit rises)', () => {
    const full = calcPsa(base())
    const half = calcPsa(base({ psa_capacity_utilization: 0.5 }))
    expect(half.monthly_output_cu_m).toBeCloseTo(full.monthly_output_cu_m / 2, 4)
    const fullElec = full.components.find((c) => c.key === 'electricity_usage')!.amount
    const halfElec = half.components.find((c) => c.key === 'electricity_usage')!.amount
    expect(halfElec).toBeCloseTo(fullElec, 2) // unchanged
    expect(half.per_cu_m_capex_opex).toBeGreaterThan(full.per_cu_m_capex_opex)
  })
})

describe('calcPsa — AMC auto-derivation (3.27% of plant cost)', () => {
  it('uses 3.27% when amc is null', () => {
    const r = calcPsa(base({ psa_amc_annual: null, psa_plant_cost: 10_000_000 }))
    const maintenance = r.components.find((c) => c.key === 'maintenance')!
    expect(maintenance.amount).toBeCloseTo((0.0327 * 10_000_000) / 12, 4)
  })
})

describe('calcPsa — consumables', () => {
  it('adds annual consumables / 12 as a fixed component', () => {
    const r = calcPsa(base({ psa_consumables_annual: 120000 }))
    const c = r.components.find((x) => x.key === 'consumables')!
    expect(c.amount).toBeCloseTo(10000, 4)
  })
})

describe('calcPsa — edge cases', () => {
  it('0 run hours: no output, infinite per-unit cost', () => {
    const r = calcPsa(base({ psa_run_hours_monthly: 0 }))
    expect(r.monthly_output_cu_m).toBe(0)
    expect(r.per_cu_m_capex_opex).toBe(Infinity)
    expect(r.notes.join(' ')).toMatch(/not producing/i)
  })
  it('low utilization (< 60 hrs) is flagged', () => {
    const r = calcPsa(base({ psa_run_hours_monthly: 30 }))
    expect(r.notes.join(' ')).toMatch(/low utilization/i)
  })
})
