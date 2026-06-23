import { describe, expect, it } from 'vitest'
import { calcConcentrator } from '../concentrator'
import type { OcInputs } from '../types'

function base(overrides: Partial<OcInputs> = {}): OcInputs {
  return {
    oc_high_use_units: 10,
    oc_high_use_hours: 12,
    oc_low_use_units: 0,
    oc_low_use_hours: 4,
    oc_output_lpm: 5,
    oc_price_per_unit: 50000,
    oc_life_years: 5,
    oc_power_watts: 350,
    oc_electricity_rate: 7.52,
    oc_days_per_month: 30,
    oc_maintenance_per_unit: 5000,
    ...overrides,
  }
}

describe('calcConcentrator — high/low-use output', () => {
  it('10 high-use units @ 12h × 30d = 1080 cu m', () => {
    // 10×12 = 120 unit-hrs/day × 30 = 3600; × 5 LPM × 60 / 1000 = 1080
    expect(calcConcentrator(base()).monthly_output_cu_m).toBeCloseTo(1080, 6)
  })
  it('mixes high and low groups by unit-hours', () => {
    const r = calcConcentrator(base({ oc_high_use_units: 6, oc_high_use_hours: 10, oc_low_use_units: 4, oc_low_use_hours: 4 }))
    const dailyUnitHours = 6 * 10 + 4 * 4 // 76
    expect(r.monthly_output_cu_m).toBeCloseTo((dailyUnitHours * 30 * 5 * 60) / 1000, 6)
  })
})

describe('calcConcentrator — costs over deployed units', () => {
  const r = calcConcentrator(base())
  it('electricity scales with unit-hours', () => {
    const elec = r.components.find((c) => c.key === 'electricity')!
    expect(elec.amount).toBeCloseTo(3600 * 0.35 * 7.52, 4)
  })
  it('depreciation & maintenance use deployed unit count', () => {
    expect(r.components.find((c) => c.key === 'depreciation')!.amount).toBeCloseTo((10 * 50000) / (5 * 12), 4)
    expect(r.components.find((c) => c.key === 'maintenance')!.amount).toBeCloseTo((10 * 5000) / 12, 4)
  })
})

describe('calcConcentrator — always carries limitations', () => {
  it('hasLimitations and clinical caveats present', () => {
    const r = calcConcentrator(base())
    expect(r.hasLimitations).toBe(true)
    expect(r.notes.join(' ')).toMatch(/low-purity/i)
  })
})
