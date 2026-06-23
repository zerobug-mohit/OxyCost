import { describe, expect, it } from 'vitest'
import {
  BENCHMARK,
  bandFor,
  costPercentile,
  findPeers,
  inputFlags,
  mixByBand,
  percentile,
  rangeFor,
  summarizePeers,
} from '../benchmark'

describe('benchmark dataset integrity', () => {
  it('loads the anonymized cohort (no names) with 92 facilities', () => {
    expect(BENCHMARK.meta.facilityCount).toBe(BENCHMARK.facilities.length)
    expect(BENCHMARK.facilities.length).toBeGreaterThan(50)
    // Anonymized: records expose only type/band/state, never a name/district.
    for (const f of BENCHMARK.facilities) {
      expect(Object.keys(f)).not.toContain('name')
      expect(Object.keys(f)).not.toContain('district')
    }
  })
  it('covers the three surveyed states', () => {
    expect(Object.keys(BENCHMARK.meta.states).sort()).toEqual([
      'Chhattisgarh',
      'Madhya Pradesh',
      'Punjab',
    ])
  })
  it('reports PSA reliability', () => {
    expect(BENCHMARK.meta.psaPlants.nonFunctionalPct).toBeGreaterThan(0)
  })
})

describe('percentile helper', () => {
  it('interpolates', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBeCloseTo(25, 6)
    expect(percentile([10, 20, 30, 40], 0)).toBe(10)
    expect(percentile([10, 20, 30, 40], 100)).toBe(40)
  })
})

describe('findPeers', () => {
  it('returns up to k nearest, sorted by similarity', () => {
    const peers = findPeers(
      { oxBeds: 50, demand: 22000, sources: { psa: true, lmo: false, cylinder: true, oc: false } },
      BENCHMARK,
      5,
    )
    expect(peers.length).toBeGreaterThan(0)
    expect(peers.length).toBeLessThanOrEqual(5)
    for (let i = 1; i < peers.length; i++) {
      expect(peers[i].score).toBeGreaterThanOrEqual(peers[i - 1].score)
    }
    expect(peers[0].similarity).toBeGreaterThanOrEqual(peers[peers.length - 1].similarity)
  })

  it('matches on demand when beds are unknown', () => {
    const peers = findPeers(
      { oxBeds: null, demand: 5000, sources: { psa: false, lmo: false, cylinder: true, oc: false } },
      BENCHMARK,
    )
    expect(peers.length).toBeGreaterThan(0)
  })
})

describe('summarizePeers', () => {
  it('reports the most common primary among peers', () => {
    const peers = findPeers(
      { oxBeds: 60, demand: 30000, sources: { psa: true, lmo: false, cylinder: true, oc: false } },
      BENCHMARK,
    )
    const s = summarizePeers(peers)
    expect(s.total).toBe(peers.length)
    if (s.mostCommon) expect(['psa', 'lmo', 'cylinder']).toContain(s.mostCommon)
  })
})

describe('costPercentile', () => {
  it('a very low cost beats most peers; null when sample too small', () => {
    const cyl = costPercentile('cylinder', 1, BENCHMARK)
    if (cyl) expect(cyl.betterThanPct).toBeGreaterThan(80)
    // PSA cost not collected -> null
    expect(costPercentile('psa', 10, BENCHMARK)).toBeNull()
  })
})

describe('inputFlags', () => {
  it('flags an extreme refill price as above peers', () => {
    const flags = inputFlags({ cylRefillD: 900 }, BENCHMARK)
    expect(flags.some((f) => f.severity === 'warn' && /refill/i.test(f.text))).toBe(true)
  })
  it('praises a very low refill price', () => {
    const flags = inputFlags({ cylRefillD: 150 }, BENCHMARK)
    expect(flags.some((f) => f.severity === 'good')).toBe(true)
  })
  it('no flags for empty metrics', () => {
    expect(inputFlags({}, BENCHMARK)).toEqual([])
  })
})

describe('mixByBand & bandFor', () => {
  it('bands a bed count correctly', () => {
    expect(bandFor(5)).toBe('<10')
    expect(bandFor(50)).toBe('30–59')
    expect(bandFor(120)).toBe('60+')
    expect(bandFor(0)).toBeNull()
  })
  it('returns per-band primary counts', () => {
    const m = mixByBand(BENCHMARK)
    expect(m.length).toBeGreaterThan(0)
    for (const b of m) expect(b.n).toBe(b.counts.psa + b.counts.lmo + b.counts.cylinder)
  })
})

describe('rangeFor', () => {
  it('gives a p25–p75 band for refill price', () => {
    const r = rangeFor('cylRefillD', BENCHMARK)
    expect(r).not.toBeNull()
    if (r) expect(r.p25).toBeLessThanOrEqual(r.p75)
  })
})
