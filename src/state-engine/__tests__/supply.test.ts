import { describe, expect, it } from 'vitest'
import { computeStateCost, estimateStateSupply, initialStateInputs } from '../index'
import { MT_TO_CUM } from '../../demand-engine'
import type { StateInputs } from '../types'

function withCounts(counts: Partial<StateInputs['counts']>): StateInputs {
  const s = initialStateInputs()
  s.counts = { ...s.counts, ...counts } as StateInputs['counts']
  return s
}

describe('estimateStateSupply — empty', () => {
  it('no equipment → zero supply, no segments', () => {
    const input = initialStateInputs()
    const s = estimateStateSupply(input, computeStateCost(input))
    expect(s.annualCuM).toBe(0)
    expect(s.annualMT).toBe(0)
    expect(s.segments).toHaveLength(0)
  })
})

describe('estimateStateSupply — estimate mode', () => {
  const input = withCounts({ '60+': 5, '30-59': 10 })
  const s = estimateStateSupply(input, computeStateCost(input))

  it('produces positive supply once there are facilities', () => {
    expect(s.annualCuM).toBeGreaterThan(0)
    expect(s.annualMT).toBeCloseTo(s.annualCuM / MT_TO_CUM, 6)
  })

  it('segments sum to the total and are sorted descending', () => {
    const sum = s.segments.reduce((a, x) => a + x.annualCuM, 0)
    expect(sum).toBeCloseTo(s.annualCuM, 3)
    for (let i = 1; i < s.segments.length; i++) {
      expect(s.segments[i].annualCuM).toBeLessThanOrEqual(s.segments[i - 1].annualCuM)
    }
  })

  it('scales up with more facilities', () => {
    const more = withCounts({ '60+': 10, '30-59': 20 })
    const s2 = estimateStateSupply(more, computeStateCost(more))
    expect(s2.annualCuM).toBeGreaterThan(s.annualCuM)
  })
})

describe('estimateStateSupply — direct mode', () => {
  it('sums PSA / LMO / cylinder / concentrator output from entered totals', () => {
    const input = initialStateInputs()
    input.mode = 'direct'
    input.direct = {
      ...input.direct,
      psaByCapacity: { '1000': { total: 2, functional: 2, hrs: 20 } },
      lmoAnnualKl: 10,
      cylDRefillsMo: 100,
      cylBRefillsMo: 0,
      cylARefillsMo: 0,
      ocHighUnits: 5,
      ocHighHrs: 10,
      ocLowUnits: 0,
      ocLowHrs: 0,
    }
    const s = estimateStateSupply(input, computeStateCost(input))

    // PSA: 2 plants × 1000 LPM × 60 × 20 hrs × 365 / 1000 = 876,000 cu m/yr.
    const psa = s.segments.find((x) => x.group === 'psa')!
    expect(psa.annualCuM).toBeCloseTo(2 * 1000 * 60 * 20 * 365 / 1000, 3)
    // Cylinders: 100 D-refills/mo × 7 cu m × 12 = 8,400 cu m/yr.
    const cyl = s.segments.find((x) => x.group === 'cylinder')!
    expect(cyl.annualCuM).toBeCloseTo(100 * 7 * 12, 3)
    // LMO: 10 KL × 1000 L × 0.861 = 8,610 cu m/yr.
    const lmo = s.segments.find((x) => x.group === 'lmo')!
    expect(lmo.annualCuM).toBeCloseTo(10 * 1000 * 0.861, 3)
  })

  it('counts only functional PSA plants for output', () => {
    const base = initialStateInputs()
    base.mode = 'direct'
    const mk = (functional: number): StateInputs => ({
      ...base,
      direct: { ...base.direct, psaByCapacity: { '1000': { total: 3, functional, hrs: 20 } } },
    })
    const s1 = estimateStateSupply(mk(1), computeStateCost(mk(1)))
    const s3 = estimateStateSupply(mk(3), computeStateCost(mk(3)))
    expect(s3.annualCuM).toBeCloseTo(3 * s1.annualCuM, 3)
  })
})
