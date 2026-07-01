import { describe, expect, it } from 'vitest'
import {
  applyStateRates,
  computeStateCost,
  defaultRates,
  initialStateInputs,
  predictBand,
  STATE_LIST,
} from '../index'
import type { StateInputs } from '../types'

describe('predictBand — kNN archetype prediction', () => {
  it('predicts more PSA presence for larger facilities', () => {
    const small = predictBand('<10', 6, 'All states')
    const large = predictBand('60+', 150, 'All states')
    expect(large.psaProb).toBeGreaterThan(small.psaProb)
    expect(large.mgpsBhu).toBeGreaterThanOrEqual(small.mgpsBhu)
  })

  it('returns a confidence score in [0,100] and a neighbour count', () => {
    const p = predictBand('30-59', 45, 'All states')
    expect(p.confidence).toBeGreaterThanOrEqual(0)
    expect(p.confidence).toBeLessThanOrEqual(100)
    expect(p.neighbors).toBeGreaterThan(0)
  })

  it('extrapolating far beyond the observed range lowers confidence', () => {
    const inRange = predictBand('60+', 150, 'All states')
    const wayOut = predictBand('60+', 2000, 'All states')
    expect(wayOut.confidence).toBeLessThan(inRange.confidence)
  })

  it('scales norm-based staff/oximeter counts with bed size', () => {
    const small = predictBand('<10', 8, 'All states')
    const large = predictBand('60+', 200, 'All states')
    expect(large.nurses).toBeGreaterThan(small.nurses)
    expect(large.bedside).toBeGreaterThan(small.bedside)
  })
})

describe('state-specific rates', () => {
  it('lists All states plus the surveyed states', () => {
    expect(STATE_LIST[0]).toBe('All states')
    expect(STATE_LIST).toContain('Madhya Pradesh')
  })

  it('applying a state overrides the observed rates (refill / salary)', () => {
    const base = defaultRates('All states')
    const mp = applyStateRates(base, 'Madhya Pradesh')
    // At least one of the observed rates should differ from the pooled default.
    const changed =
      mp.cylRefillD !== base.cylRefillD ||
      mp.cylRefillB !== base.cylRefillB ||
      mp.salaryContractTech !== base.salaryContractTech
    expect(changed).toBe(true)
  })
})

describe('computeStateCost — confidence', () => {
  function withCounts(counts: Partial<StateInputs['counts']>): StateInputs {
    const s = initialStateInputs()
    s.counts = { ...s.counts, ...counts } as StateInputs['counts']
    return s
  }

  it('reports a confidence object once facilities are entered', () => {
    const r = computeStateCost(withCounts({ '60+': 5, '30-59': 5 }))
    expect(r.confidence.score).toBeGreaterThan(0)
    expect(r.confidence.score).toBeLessThanOrEqual(100)
    expect(['High', 'Moderate', 'Low']).toContain(r.confidence.level)
    expect(r.confidence.normShare).toBeGreaterThan(0)
    expect(r.confidence.normShare).toBeLessThan(1)
  })
})
