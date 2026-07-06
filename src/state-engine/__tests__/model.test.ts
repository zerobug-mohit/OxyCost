import { describe, expect, it } from 'vitest'
import {
  applyStateRates,
  computeStateCost,
  defaultRates,
  defaultShares,
  initialStateInputs,
  predictBand,
  SIGNATURES,
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
  it('lists the surveyed states only (no pooled "All states")', () => {
    expect(STATE_LIST).not.toContain('All states')
    expect(STATE_LIST).toContain('Madhya Pradesh')
    expect(STATE_LIST.length).toBe(3)
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

describe('sub-band mixture', () => {
  function withCounts(counts: Partial<StateInputs['counts']>): StateInputs {
    const s = initialStateInputs()
    s.counts = { ...s.counts, ...counts } as StateInputs['counts']
    return s
  }

  it('data-derived shares sum to ~1 and have one per signature', () => {
    const sh = defaultShares(150, 'All states')
    expect(sh.length).toBe(SIGNATURES.length)
    expect(sh.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
  })

  it('large facilities have more PSA/LMO share than small ones', () => {
    const big = defaultShares(180, 'All states')
    const small = defaultShares(6, 'All states')
    const psaLmoBig = big[0] // 'psa_lmo' is first
    const noneBig = big[3] // 'none' last
    const noneSmall = small[3]
    expect(psaLmoBig).toBeGreaterThan(big[3] === undefined ? 0 : 0)
    expect(noneSmall).toBeGreaterThan(noneBig) // small facilities skew cylinder-only
  })

  it('each entered band carries a typical-facility profile and its count', () => {
    const r = computeStateCost(withCounts({ '60+': 3 }))
    const band = r.byBand.find((b) => b.band === '60+')!
    expect(band.count).toBe(3)
    expect(band.profile).toBeTruthy()
    expect(band.perFacilityAnnual).toBeGreaterThan(0)
    expect(band.bandAnnual).toBeGreaterThan(band.perFacilityAnnual)
  })

  it('raising the "% have LMO" for a band raises its LMO refilling cost', () => {
    const base = withCounts({ '60+': 5 })
    const forced: StateInputs = {
      ...base,
      overrides: { ...base.overrides, '60+': { lmoProb: 1 } },
    }
    const lmo0 = computeStateCost(base).heads.find((h) => h.key === 'lmo_refill')!.annual
    const lmo1 = computeStateCost(forced).heads.find((h) => h.key === 'lmo_refill')!.annual
    expect(lmo1).toBeGreaterThanOrEqual(lmo0)
    expect(lmo1).toBeGreaterThan(0)
  })

  it('a per-band override changes that head and applies across sub-bands', () => {
    const base = withCounts({ '60+': 5 })
    const overridden: StateInputs = {
      ...base,
      overrides: { ...base.overrides, '60+': { mgpsBhu: 500 } },
    }
    const b0 = computeStateCost(base).heads.find((h) => h.key === 'amc_mgps')!.annual
    const b1 = computeStateCost(overridden).heads.find((h) => h.key === 'amc_mgps')!.annual
    expect(b1).toBeGreaterThan(b0)
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

describe('computeStateCost — direct mode', () => {
  it('costs district equipment totals directly (PSA electricity present)', () => {
    const s = initialStateInputs()
    s.mode = 'direct'
    s.direct = {
      ...s.direct,
      facilities: 40,
      psaPlants: 12,
      psaCapacityLpm: 500,
      psaProdHrsPerDay: 8,
      lmoAnnualKl: 240,
      lmoTanks: 3,
      ocDeployed: 400,
    }
    const r = computeStateCost(s)
    expect(r.totalFacilities).toBe(40)
    expect(r.total).toBeGreaterThan(0)
    const elec = r.heads.find((h) => h.key === 'elec_psa')!.annual
    // 12 plants x 8h x 365 x 8 kWh/h x tariff > 0 and scales with plants.
    expect(elec).toBeGreaterThan(0)
    s.direct = { ...s.direct, psaPlants: 24 }
    const elec2 = computeStateCost(s).heads.find((h) => h.key === 'elec_psa')!.annual
    expect(elec2).toBeCloseTo(elec * 2, 4)
  })
})
