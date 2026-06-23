import { describe, expect, it } from 'vitest'
import { calcCylinder } from '../cylinder'
import { CYL_PURCHASE_PRICE } from '../constants'
import type { CylinderInputs } from '../types'

function base(overrides: Partial<CylinderInputs> = {}): CylinderInputs {
  return {
    cyl_type: 'd_type',
    cyl_refill_cost: 395,
    cyl_monthly_count: 30,
    cyl_purchase_price: CYL_PURCHASE_PRICE.d_type,
    cyl_lifetime_years: 15,
    cyl_owned_count: null,
    cyl_hydrotest_cost: 0,
    cyl_hydrotest_interval_years: 5,
    cyl_transport_per_trip: 0,
    cyl_cylinders_per_trip: 10,
    ...overrides,
  }
}

describe('calcCylinder — transport', () => {
  it('adds per-trip transport spread over cylinders/trip to opex & incremental', () => {
    const r = calcCylinder(base({ cyl_transport_per_trip: 700, cyl_cylinders_per_trip: 7 }))
    // ₹700/trip ÷ 7 per trip = ₹100/cylinder; ÷ 7 cu m = ₹14.286/cu m on top of 395/7.
    expect(r.incremental_cost_per_cu_m).toBeCloseTo(395 / 7 + 100 / 7, 4)
    const t = r.components.find((c) => c.key === 'transport')!
    expect(t.amount).toBeCloseTo(100 * 30, 4) // ₹100/cyl × 30 cylinders
  })
  it('zero transport leaves incremental = refill/volume', () => {
    expect(calcCylinder(base()).incremental_cost_per_cu_m).toBeCloseTo(395 / 7, 6)
  })
})

describe('calcCylinder — spec verification checklist', () => {
  it('D-type @ 395 refill gives 56.43/cu m opex', () => {
    const r = calcCylinder(base())
    expect(r.incremental_cost_per_cu_m).toBeCloseTo(395 / 7, 4)
    expect(395 / 7).toBeCloseTo(56.4286, 3)
  })

  it('B-type @ 150 refill gives 100/cu m opex', () => {
    const r = calcCylinder(
      base({ cyl_type: 'b_type', cyl_refill_cost: 150, cyl_purchase_price: 5100 }),
    )
    expect(r.incremental_cost_per_cu_m).toBeCloseTo(150 / 1.5, 6)
    expect(150 / 1.5).toBe(100)
  })
})

describe('calcCylinder — volume and totals', () => {
  it('30 D-type cylinders deliver 210 cu m/month', () => {
    expect(calcCylinder(base()).monthly_output_cu_m).toBe(210)
  })

  it('total monthly cost includes refills + capex amortization', () => {
    const r = calcCylinder(base())
    const refills = 395 * 30
    const capex = (30 * CYL_PURCHASE_PRICE.d_type) / (15 * 12)
    expect(r.total_monthly_cost).toBeCloseTo(refills + capex, 4)
  })
})

describe('calcCylinder — capex amortization via rotations', () => {
  it('opex_only excludes purchase amortization, capex_opex includes it', () => {
    const r = calcCylinder(base())
    expect(r.per_cu_m_capex_opex).toBeGreaterThan(r.per_cu_m_opex_only)
  })

  it('per_cu_m_capex_opex equals total/output (CALC-CYL-10 consistency)', () => {
    const r = calcCylinder(base())
    expect(r.per_cu_m_capex_opex).toBeCloseTo(
      r.total_monthly_cost / r.monthly_output_cu_m,
      6,
    )
  })
})

describe('calcCylinder — hydrostatic testing', () => {
  it('amortizes hydrotest cost monthly over the interval', () => {
    const r = calcCylinder(
      base({ cyl_owned_count: 60, cyl_hydrotest_cost: 300, cyl_hydrotest_interval_years: 5 }),
    )
    const hydro = r.components.find((c) => c.key === 'hydrotest')!
    expect(hydro.amount).toBeCloseTo((60 * 300) / (5 * 12), 6)
  })
})

describe('calcCylinder — zero count edge case', () => {
  it('returns Infinity per-unit when no cylinders', () => {
    const r = calcCylinder(base({ cyl_monthly_count: 0 }))
    expect(r.per_cu_m_capex_opex).toBe(Infinity)
  })
})
