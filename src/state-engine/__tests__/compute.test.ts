import { describe, expect, it } from 'vitest'
import { computeStateCost, initialStateInputs } from '../index'
import type { StateInputs } from '../types'

function withCounts(counts: Partial<StateInputs['counts']>): StateInputs {
  const s = initialStateInputs()
  s.counts = { ...s.counts, ...counts } as StateInputs['counts']
  return s
}

describe('computeStateCost — empty state', () => {
  it('no facilities → everything zero', () => {
    const r = computeStateCost(initialStateInputs())
    expect(r.total).toBe(0)
    expect(r.totalFacilities).toBe(0)
    expect(r.costPerFuncBed).toBe(0)
  })
})

describe('computeStateCost — a district of facilities', () => {
  const r = computeStateCost(withCounts({ '60+': 5, '30-59': 10, '10-29': 20 }))

  it('counts facilities and beds', () => {
    expect(r.totalFacilities).toBe(35)
    expect(r.totalFuncBeds).toBeGreaterThan(0)
  })

  it('produces a positive total and the 23 expense heads', () => {
    expect(r.total).toBeGreaterThan(0)
    expect(r.heads.length).toBe(23)
  })

  it('total = subtotal + contingency', () => {
    expect(r.total).toBeCloseTo(r.subtotal + r.contingency, 2)
  })

  it('recurring + one-time = total', () => {
    expect(r.recurringTotal + r.oneTimeTotal).toBeCloseTo(r.total, 2)
  })

  it('band totals sum to the grand total', () => {
    const sum = r.byBand.reduce((s, b) => s + b.bandAnnual, 0)
    expect(sum).toBeCloseTo(r.total, 1)
  })

  it('by-group rollup sums to the subtotal and is sorted descending', () => {
    const sum = r.byGroup.reduce((s, g) => s + g.annual, 0)
    expect(sum).toBeCloseTo(r.subtotal, 1)
    for (let i = 1; i < r.byGroup.length; i++) {
      expect(r.byGroup[i].annual).toBeLessThanOrEqual(r.byGroup[i - 1].annual)
    }
  })

  it('cost per functional bed = total ÷ functional beds', () => {
    expect(r.costPerFuncBed).toBeCloseTo(r.total / r.totalFuncBeds, 2)
  })
})

describe('computeStateCost — modelling behaviour', () => {
  it('scales linearly with facility counts', () => {
    const one = computeStateCost(withCounts({ '60+': 1 }))
    const three = computeStateCost(withCounts({ '60+': 3 }))
    expect(three.total).toBeCloseTo(one.total * 3, 1)
  })

  it('LMO refilling is zero for a band where no facility has LMO (prob 0)', () => {
    // <10 band has lmoProb 0 in the archetypes.
    const r = computeStateCost(withCounts({ '<10': 10 }))
    const lmo = r.heads.find((h) => h.key === 'lmo_refill')!
    expect(lmo.annual).toBe(0)
  })

  it('a larger band carries more cost per facility than a smaller one', () => {
    const big = computeStateCost(withCounts({ '60+': 1 }))
    const small = computeStateCost(withCounts({ '<10': 1 }))
    expect(big.total).toBeGreaterThan(small.total)
  })

  it('raising the electricity tariff raises PSA electricity cost', () => {
    const base = withCounts({ '60+': 5 })
    const hi = { ...base, rates: { ...base.rates, electricityTariff: base.rates.electricityTariff * 2 } }
    const e0 = computeStateCost(base).heads.find((h) => h.key === 'elec_psa')!.annual
    const e1 = computeStateCost(hi).heads.find((h) => h.key === 'elec_psa')!.annual
    expect(e1).toBeCloseTo(e0 * 2, 1)
  })
})
