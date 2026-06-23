import { describe, expect, it } from 'vitest'
import { costCurves, psaMaxVolume, resultAtVolume } from '../sweep'
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
