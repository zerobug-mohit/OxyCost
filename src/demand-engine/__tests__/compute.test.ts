import { describe, it, expect } from 'vitest'
import {
  computeFacilityDemand,
  computeDistrictDemand,
  demandFromAdmissions,
  defaultAssumptions,
  defaultFactors,
  matchTranche,
  MT_TO_CUM,
} from '../index'
import type { FacilityDemandInput } from '../index'

describe('demand engine — facility case-mix', () => {
  it('computes a single ward from the case-mix formula', () => {
    const a = defaultAssumptions()
    // Isolate one ward with a known profile: HDU flow [3,3,8], duration [2,3,3], mix ~1/3 each.
    a.wards.hdu.flow = [3, 3, 8]
    a.wards.hdu.duration = [2, 3, 3]
    a.wards.hdu.mix = [1 / 3, 1 / 3, 1 / 3]
    const input: FacilityDemandInput = { wardPatients: { hdu: 30 } }
    // month 0 = Nov (autumn factor 1.25). Entered patients ARE Nov's load.
    const r = computeFacilityDemand(input, a, 'normal', 0)
    // (30 × 1/3 × (3·2 + 3·3 + 8·3) × 1440) / 750000 = 561600/750000 = 0.7488 → that IS Nov.
    expect(r.byMonth[0].mt).toBeCloseTo(0.7488, 4) // Nov reads back exactly
    // annual = Nov × (Σ seasonality ÷ Nov's factor) = 0.7488 × (12.9 / 1.25)
    expect(r.annualMT).toBeCloseTo(0.7488 * (12.9 / 1.25), 3)
    // 12 months sum back to the annual.
    const sum = r.byMonth.reduce((s, m) => s + m.mt, 0)
    expect(sum).toBeCloseTo(r.annualMT, 6)
  })

  it('pandemic scenario applies the surge factor', () => {
    const a = defaultAssumptions()
    const input: FacilityDemandInput = { wardPatients: { icu: 20, hdu: 10 } }
    const normal = computeFacilityDemand(input, a, 'normal').annualMT
    const pandemic = computeFacilityDemand(input, a, 'pandemic').annualMT
    expect(pandemic).toBeCloseTo(normal * a.scalars.pandemicSurge, 6)
  })
})

describe('demand engine — district / state roll-up', () => {
  const a = defaultAssumptions()
  it('at default factors, a state total matches the baked Dashboard figure', () => {
    const r = computeDistrictDemand({ state: 'Punjab', district: null }, defaultFactors(), a.seasonality, 'normal', a.scalars.pandemicSurge)
    expect(r.annualMT).toBeCloseTo(1886.4, 0)
  })

  it('doubling a tranche factor increases that tranche contribution', () => {
    const base = computeDistrictDemand({ state: 'Punjab', district: 'Amritsar' }, defaultFactors(), a.seasonality, 'normal', a.scalars.pandemicSurge).annualMT
    const f = defaultFactors()
    f['G'] = f['G'] * 2 // Amritsar has a 'G' tranche (Punjab CHC 100 band)
    const bumped = computeDistrictDemand({ state: 'Punjab', district: 'Amritsar' }, f, a.seasonality, 'normal', a.scalars.pandemicSurge).annualMT
    expect(bumped).toBeGreaterThan(base)
  })
})

describe('demand engine — strata match & admissions', () => {
  it('matchTranche picks the smallest band that covers admissions', () => {
    expect(matchTranche('Punjab', 'DH', 1500)?.band).toBe('2000')
    expect(matchTranche('Punjab', 'DH', 500)?.band).toBe('1000')
    expect(matchTranche('Punjab', 'DH', 9999)?.band).toBe('2000+')
  })

  it('demandFromAdmissions returns cu m = MT × 750', () => {
    const a = defaultAssumptions()
    const res = demandFromAdmissions('Punjab', 'DH', 800, 0, a.seasonality, 'normal', a.scalars.pandemicSurge)
    expect(res.mt).toBeGreaterThan(0)
    expect(res.cuM).toBeCloseTo(res.mt * MT_TO_CUM, 6)
  })
})
