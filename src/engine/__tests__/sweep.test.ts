import { describe, expect, it } from 'vitest'
import { costCurves, priorityOrder, psaMaxVolume, resultAtVolume } from '../sweep'
import { computeSources } from '../comparison'
import {
  CYLINDER_DEFAULTS,
  LMO_DEFAULTS,
  OC_DEFAULTS,
  PSA_DEFAULTS,
} from '../constants'
import type { EngineInputs } from '../types'

const inputs: EngineInputs = {
  demand_cu_m: 5000,
  psa: [{ ...PSA_DEFAULTS, psa_capacity_lpm: 1000 }],
  lmo: [{ ...LMO_DEFAULTS }],
  cylinder: [{ ...CYLINDER_DEFAULTS }],
  oc: [{ ...OC_DEFAULTS, oc_high_use_units: 20, oc_low_use_units: 0, oc_high_use_hours: 12 }],
}

describe('resultAtVolume — produces the requested volume', () => {
  it('PSA result output equals the requested volume', () => {
    const r = resultAtVolume('psa', inputs.psa![0], 5000)!
    expect(r.monthly_output_cu_m).toBeCloseTo(5000, 4)
  })
  it('LMO result output equals the requested volume', () => {
    const r = resultAtVolume('lmo', inputs.lmo![0], 5000)!
    expect(r.monthly_output_cu_m).toBeCloseTo(5000, 4)
  })
  it('Cylinder result output equals the requested volume', () => {
    const r = resultAtVolume('cylinder', inputs.cylinder![0], 5000)!
    expect(r.monthly_output_cu_m).toBeCloseTo(5000, 4)
  })
  it('OC result output equals the requested volume (within fleet capacity)', () => {
    // 20 units @ 5 LPM max ~4,320 cu m/mo; 3,000 is feasible.
    const r = resultAtVolume('oc', inputs.oc![0], 3000)!
    expect(r.monthly_output_cu_m).toBeCloseTo(3000, 4)
  })
})

describe('resultAtVolume — capacity limits', () => {
  it('PSA returns null beyond its 720h max volume', () => {
    const max = psaMaxVolume(inputs.psa![0])
    expect(resultAtVolume('psa', inputs.psa![0], max * 1.5)).toBeNull()
    expect(resultAtVolume('psa', inputs.psa![0], max * 0.5)).not.toBeNull()
  })
})

describe('costCurves — per-unit cost falls as volume rises (fixed-cost dilution)', () => {
  it('LMO per cu m decreases with volume', () => {
    const series = costCurves(inputs, 'capex_opex', [1000, 5000, 14000])
    const lmo = series.find((s) => s.source === 'lmo')!
    const vals = lmo.points.map((p) => p.value!)
    expect(vals[0]).toBeGreaterThan(vals[1])
    expect(vals[1]).toBeGreaterThan(vals[2])
  })

  it('returns one series per enabled source', () => {
    const series = costCurves(inputs, 'opex_only', [1000, 2000])
    expect(series.map((s) => s.source).sort()).toEqual(['cylinder', 'lmo', 'oc', 'psa'])
  })

  it('cylinder incremental cost is flat with volume', () => {
    const series = costCurves(inputs, 'incremental', [1000, 5000, 10000])
    const cyl = series.find((s) => s.source === 'cylinder')!
    const vals = cyl.points.map((p) => p.value!)
    expect(vals[0]).toBeCloseTo(vals[2], 6)
  })
})

describe('priorityOrder — capacity-aware fallback ranking', () => {
  const sources = computeSources(inputs)

  it('ranks 1..n with no gaps, meets-demand sources first', () => {
    const order = priorityOrder(inputs, sources, 'capex_opex', 5000)
    expect(order.map((o) => o.rank)).toEqual(order.map((_, i) => i + 1))
    const firstCapped = order.findIndex((o) => !o.meetsDemand)
    if (firstCapped >= 0) {
      expect(order.slice(0, firstCapped).every((o) => o.meetsDemand)).toBe(true)
      expect(order.slice(firstCapped).every((o) => !o.meetsDemand)).toBe(true)
    }
  })

  it('OC cannot meet 5,000 cu m alone (capped ~4,320) and is flagged as backup', () => {
    const order = priorityOrder(inputs, sources, 'capex_opex', 5000)
    const oc = order.find((o) => o.source === 'oc')!
    expect(oc.meetsDemand).toBe(false)
    expect(oc.capacity).toBeLessThan(5000)
  })

  it('within the meets-demand group, cost is ascending', () => {
    const full = priorityOrder(inputs, sources, 'capex_opex', 5000).filter((o) => o.meetsDemand)
    for (let i = 1; i < full.length; i++) {
      expect(full[i].cost).toBeGreaterThanOrEqual(full[i - 1].cost)
    }
  })

  it('LMO and cylinders can meet any demand (unbounded capacity)', () => {
    const order = priorityOrder(inputs, sources, 'capex_opex', 50000)
    expect(order.find((o) => o.source === 'lmo')!.meetsDemand).toBe(true)
    expect(order.find((o) => o.source === 'cylinder')!.meetsDemand).toBe(true)
    // PSA (1000 LPM) tops out below 50,000 → capacity-limited here.
    expect(order.find((o) => o.source === 'psa')!.meetsDemand).toBe(false)
  })

  it('returns an empty order for non-positive demand', () => {
    expect(priorityOrder(inputs, sources, 'capex_opex', 0)).toEqual([])
  })
})
