import { describe, it, expect } from 'vitest'
import { stateWorkbookBuffer, importStateWorkbookBuffer } from '../stateWorkbook'
import type { StateScenarioIO } from '../stateWorkbook'
import { initialStateInputs } from '../../state-engine'

describe('state workbook round-trip', () => {
  it('direct mode → export → import restores totals, rates and PSA capacities', async () => {
    const s = initialStateInputs()
    s.mode = 'direct'
    // A couple of PSA capacities, some totals and an edited rate.
    const caps = Object.keys(s.direct.psaByCapacity)
    s.direct.psaByCapacity[caps[0]] = { total: 4, functional: 3, hrs: 12 }
    s.direct.psaByCapacity[caps[1]] = { total: 2, functional: 2, hrs: 8 }
    s.direct.lmoAnnualKl = 240
    s.direct.cylDRefillsMo = 30
    s.direct.techs = 6
    s.direct.facilitiesByTier = { small: 20, mid: 10, large: 3 }
    s.rates.electricityTariff = 8.1
    s.rates.psaCamcPct = 0.05

    const { inputs: r, demand } = await importStateWorkbookBuffer(await stateWorkbookBuffer(s))
    expect(r.mode).toBe('direct')
    expect(r.direct.psaByCapacity[caps[0]]).toEqual({ total: 4, functional: 3, hrs: 12 })
    expect(r.direct.psaByCapacity[caps[1]].total).toBe(2)
    expect(r.direct.lmoAnnualKl).toBe(240)
    expect(r.direct.cylDRefillsMo).toBe(30)
    expect(r.direct.techs).toBe(6)
    expect(r.direct.facilitiesByTier).toEqual({ small: 20, mid: 10, large: 3 })
    expect(r.rates.electricityTariff).toBeCloseTo(8.1, 6)
    expect(r.rates.psaCamcPct).toBeCloseTo(0.05, 6) // % round-trips through ×100 scaling
    expect(demand).toBeNull() // no demand passed → none restored
  })

  it('estimate mode → export → import restores counts, beds and overrides', async () => {
    const s = initialStateInputs()
    s.mode = 'estimate'
    const bands = Object.keys(s.counts) as (keyof typeof s.counts)[]
    s.counts[bands[1]] = 12
    s.counts[bands[3]] = 4
    s.beds[bands[3]] = 80
    s.overrides[bands[3]] = { psaPlants: 2 }

    const { inputs: r } = await importStateWorkbookBuffer(await stateWorkbookBuffer(s))
    expect(r.mode).toBe('estimate')
    expect(r.counts[bands[1]]).toBe(12)
    expect(r.counts[bands[3]]).toBe(4)
    expect(r.beds[bands[3]]).toBe(80)
    expect(r.overrides[bands[3]].psaPlants).toBe(2)
  })

  it('carries the Step-1 demand selection + overrides', async () => {
    const s = initialStateInputs()
    const demand = { state: 'Punjab', district: 'Amritsar', scenario: 'pandemic' as const }
    const overrides = { Amritsar: 123.45, 'Amritsar:G': 6.7 }
    const r = await importStateWorkbookBuffer(await stateWorkbookBuffer(s, demand, overrides))
    expect(r.demand).toEqual({ state: 'Punjab', district: 'Amritsar', scenario: 'pandemic' })
    expect(r.demandOverrides.Amritsar).toBeCloseTo(123.45, 4)
    expect(r.demandOverrides['Amritsar:G']).toBeCloseTo(6.7, 4)
  })

  it('whole-state demand (no district) round-trips as null district', async () => {
    const s = initialStateInputs()
    const r = await importStateWorkbookBuffer(
      await stateWorkbookBuffer(s, { state: 'Chhattisgarh', district: null, scenario: 'normal' }, {}),
    )
    expect(r.demand).toEqual({ state: 'Chhattisgarh', district: null, scenario: 'normal' })
    expect(r.demandOverrides).toEqual({})
  })

  it('round-trips saved scenarios as separate sheets', async () => {
    const main = initialStateInputs()
    const scA = initialStateInputs()
    scA.mode = 'direct'
    scA.direct.lmoAnnualKl = 500
    const io: StateScenarioIO[] = [
      { name: 'Baseline', inputs: main, demand: { state: 'Punjab', district: null, scenario: 'normal' }, demandOverrides: {} },
      { name: 'Direct plan', inputs: scA, demand: { state: 'Chhattisgarh', district: 'Durg', scenario: 'pandemic' }, demandOverrides: { Durg: 42 } },
    ]
    const r = await importStateWorkbookBuffer(
      await stateWorkbookBuffer(main, { state: 'Punjab', district: null, scenario: 'normal' }, {}, io),
    )
    expect(r.scenarios).toHaveLength(2)
    expect(r.scenarios.map((s) => s.name)).toEqual(['Baseline', 'Direct plan'])
    expect(r.scenarios[1].inputs.mode).toBe('direct')
    expect(r.scenarios[1].inputs.direct.lmoAnnualKl).toBe(500)
    expect(r.scenarios[1].demand).toEqual({ state: 'Chhattisgarh', district: 'Durg', scenario: 'pandemic' })
    expect(r.scenarios[1].demandOverrides.Durg).toBeCloseTo(42, 4)
  })

  it('rejects a non-OxyCost workbook', async () => {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('x').addRow(['a', 'b', 'c'])
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer
    await expect(importStateWorkbookBuffer(buf)).rejects.toThrow(/OxyCost|recognisable/i)
  })
})
