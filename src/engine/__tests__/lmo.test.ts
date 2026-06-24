import { describe, expect, it } from 'vitest'
import { calcLmo } from '../lmo'
import type { LmoInputs } from '../types'

function base(overrides: Partial<LmoInputs> = {}): LmoInputs {
  return {
    lmo_capacity_kl: 0,
    lmo_ownership: 'rented',
    lmo_monthly_cu_m: 5100,
    lmo_rental_monthly: 67260,
    lmo_refill_base_per_litre: 15.22,
    lmo_refill_gst: 0.12,
    lmo_handling_base_per_litre: 16.78,
    lmo_handling_gst: 0.18,
    lmo_tank_cost: 5_000_000,
    lmo_tank_life_years: 10,
    lmo_loss_pct: 0,
    ...overrides,
  }
}

describe('calcLmo — per-unit rates (reference-validated)', () => {
  it('refilling per cu m = 19.798 (15.22×1.12÷0.861)', () => {
    const r = calcLmo(base())
    expect(r.components.find((c) => c.key === 'refilling')!.amount / 5100).toBeCloseTo(
      19.79837398373984,
      6,
    )
  })
  it('handling per cu m = 22.997 (16.78×1.18÷0.861)', () => {
    const r = calcLmo(base())
    expect(r.components.find((c) => c.key === 'handling')!.amount / 5100).toBeCloseTo(
      22.996980255516842,
      6,
    )
  })
  it('opex-only without depreciation = rental/vol + refill + handling = 55.98', () => {
    // (was 58.92 incl. operator salary; salary is now a shared facility cost)
    const r = calcLmo(base({ lmo_tank_cost: 0 }))
    expect(r.per_cu_m_opex_only).toBeCloseTo(55.9836, 3)
  })
  it('no operator salary component (now shared)', () => {
    expect(calcLmo(base()).components.find((c) => c.key === 'salary')).toBeUndefined()
  })
})

describe('calcLmo — boil-off loss', () => {
  it('loss inflates variable cost per delivered cu m by 1/(1−loss)', () => {
    const noLoss = calcLmo(base())
    const loss = calcLmo(base({ lmo_loss_pct: 0.1 }))
    const factor = 1 / (1 - 0.1)
    expect(loss.incremental_cost_per_cu_m).toBeCloseTo(
      noLoss.incremental_cost_per_cu_m * factor,
      4,
    )
    const refNo = noLoss.components.find((c) => c.key === 'refilling')!.amount
    const refLoss = loss.components.find((c) => c.key === 'refilling')!.amount
    expect(refLoss).toBeCloseTo(refNo * factor, 2)
  })
  it('rental and depreciation are unaffected by loss', () => {
    const loss = calcLmo(base({ lmo_loss_pct: 0.2 }))
    expect(loss.components.find((c) => c.key === 'rental')!.amount).toBeCloseTo(67260, 4)
  })
})

describe('calcLmo — ownership (rented vs purchased)', () => {
  it('rented: rental charged, no depreciation (purchase cost ignored)', () => {
    const r = calcLmo(base({ lmo_ownership: 'rented', lmo_rental_monthly: 67260, lmo_tank_cost: 5_000_000 }))
    expect(r.components.find((c) => c.key === 'rental')!.amount).toBeCloseTo(67260, 4)
    expect(r.components.find((c) => c.key === 'depreciation')!.amount).toBe(0)
  })
  it('purchased: depreciation charged, no rental (rental ignored)', () => {
    const r = calcLmo(base({ lmo_ownership: 'purchased', lmo_rental_monthly: 67260, lmo_tank_cost: 6_000_000, lmo_tank_life_years: 10 }))
    expect(r.components.find((c) => c.key === 'rental')!.amount).toBe(0)
    expect(r.components.find((c) => c.key === 'depreciation')!.amount).toBeCloseTo(6_000_000 / 10 / 12, 4)
  })
  it('incremental (refilling + handling) is unaffected by ownership', () => {
    const rented = calcLmo(base({ lmo_ownership: 'rented' }))
    const owned = calcLmo(base({ lmo_ownership: 'purchased' }))
    expect(rented.incremental_cost_per_cu_m).toBeCloseTo(owned.incremental_cost_per_cu_m, 6)
  })
})

describe('calcLmo — volume dilution & edge', () => {
  it('per cu m falls as volume rises', () => {
    expect(calcLmo(base({ lmo_monthly_cu_m: 14000 })).per_cu_m_capex_opex).toBeLessThan(
      calcLmo(base({ lmo_monthly_cu_m: 5100 })).per_cu_m_capex_opex,
    )
  })
  it('zero volume returns Infinity per-unit', () => {
    expect(calcLmo(base({ lmo_monthly_cu_m: 0 })).per_cu_m_capex_opex).toBe(Infinity)
  })
})
