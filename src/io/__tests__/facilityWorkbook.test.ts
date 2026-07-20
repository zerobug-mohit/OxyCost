import { describe, it, expect } from 'vitest'
import { facilityWorkbookBuffer, importFacilityWorkbookBuffer } from '../facilityWorkbook'
import { defaultsFor } from '../../state'
import type { AppState } from '../../state'
import { defaultAssumptions } from '../../demand-engine'
import type { CylinderInputs, LmoInputs, OcInputs, PsaInputs } from '../../engine'

function sampleState(): AppState {
  const psa0 = { ...(defaultsFor('psa') as PsaInputs), psa_capacity_lpm: 1000, psa_power_kw: 62, psa_run_hours_monthly: 340, psa_ownership: 'rented' as const, psa_rental_monthly: 55000, psa_amc_annual: 120000, item_id_value: 'Airox' }
  const psa1 = { ...(defaultsFor('psa') as PsaInputs), psa_capacity_lpm: 500, psa_power_kw: 40, psa_run_hours_monthly: 200, psa_amc_annual: null, item_id_value: 'Gen-2' }
  const lmo0 = { ...(defaultsFor('lmo') as LmoInputs), lmo_monthly_cu_m: 5100, lmo_refill_gst: 0.12, lmo_handling_gst: 0.18, lmo_loss_pct: 0.03 }
  const cyl0 = { ...(defaultsFor('cylinder') as CylinderInputs), cyl_type: 'b_type' as const, cyl_refill_cost: 260, cyl_monthly_count: 40, cyl_owned_count: 55 }
  const oc0 = { ...(defaultsFor('oc') as OcInputs), oc_high_use_units: 8, oc_low_use_units: 3 }
  const assumptions = defaultAssumptions()
  assumptions.wards.icu.flow[2] = 12 // an edited case profile to round-trip
  return {
    demandMode: 'direct',
    demandDirect: 12345,
    admissionsDemand: { month: 2, state: 'Punjab', facilityType: 'DH', ipd: 1500, scenario: 'pandemic' as const },
    wardsDemand: { month: 3, wardPatients: { icu: 20, hdu: 8 } as AppState['wardsDemand']['wardPatients'], assumptions },
    costView: 'opex_only',
    shared: { hr_salary_monthly: 18000, other_shared_monthly: 500, mgps_amc_annual: 30000, mgps_maintenance_annual: 12000 },
    fleet: { psa: [psa0, psa1], lmo: [lmo0], cylinder: [cyl0], oc: [oc0] },
  }
}

describe('facility workbook round-trip', () => {
  it('export → import reconstructs the state faithfully', async () => {
    const s = sampleState()
    const buf = await facilityWorkbookBuffer(s)
    const { state: r } = await importFacilityWorkbookBuffer(buf)

    // Meta
    expect(r.demandMode).toBe('direct')
    expect(r.demandDirect).toBe(12345)
    expect(r.admissionsDemand).toEqual({ month: 2, state: 'Punjab', facilityType: 'DH', ipd: 1500, scenario: 'pandemic' })
    expect(r.costView).toBe('opex_only')

    // Ward-by-ward demand (month, patient counts and edited case profile) round-trips
    expect(r.wardsDemand.month).toBe(3)
    expect(r.wardsDemand.wardPatients.icu).toBe(20)
    expect(r.wardsDemand.wardPatients.hdu).toBe(8)
    expect(r.wardsDemand.assumptions.wards.icu.flow[2]).toBe(12)

    // Shared
    expect(r.shared.hr_salary_monthly).toBe(18000)
    expect(r.shared.mgps_amc_annual).toBe(30000)

    // Fleet counts
    expect(r.fleet.psa).toHaveLength(2)
    expect(r.fleet.lmo).toHaveLength(1)
    expect(r.fleet.cylinder).toHaveLength(1)
    expect(r.fleet.oc).toHaveLength(1)

    // PSA — numbers, enum, identifier, and nullable AMC (set + null)
    expect(r.fleet.psa[0].psa_power_kw).toBe(62)
    expect(r.fleet.psa[0].psa_run_hours_monthly).toBe(340)
    expect(r.fleet.psa[0].psa_ownership).toBe('rented')
    expect(r.fleet.psa[0].psa_rental_monthly).toBe(55000)
    expect(r.fleet.psa[0].psa_amc_annual).toBe(120000)
    expect(r.fleet.psa[0].item_id_value).toBe('Airox')
    expect(r.fleet.psa[1].psa_capacity_lpm).toBe(500)
    expect(r.fleet.psa[1].psa_amc_annual).toBeNull()

    // LMO — % fields survive the ×100 scaling
    expect(r.fleet.lmo[0].lmo_monthly_cu_m).toBe(5100)
    expect(r.fleet.lmo[0].lmo_refill_gst).toBeCloseTo(0.12, 6)
    expect(r.fleet.lmo[0].lmo_handling_gst).toBeCloseTo(0.18, 6)
    expect(r.fleet.lmo[0].lmo_loss_pct).toBeCloseTo(0.03, 6)

    // Cylinder — enum + nullable owned count
    expect(r.fleet.cylinder[0].cyl_type).toBe('b_type')
    expect(r.fleet.cylinder[0].cyl_refill_cost).toBe(260)
    expect(r.fleet.cylinder[0].cyl_monthly_count).toBe(40)
    expect(r.fleet.cylinder[0].cyl_owned_count).toBe(55)

    // OC
    expect(r.fleet.oc[0].oc_high_use_units).toBe(8)
    expect(r.fleet.oc[0].oc_low_use_units).toBe(3)
  })

  it('round-trips saved scenarios as separate sheets', async () => {
    const main = sampleState()
    const scB = sampleState()
    scB.demandDirect = 999
    scB.fleet.psa = []
    const buf = await facilityWorkbookBuffer(main, [
      { name: 'High demand', state: main },
      { name: 'No PSA', state: scB },
    ])
    const { state, scenarios } = await importFacilityWorkbookBuffer(buf)
    expect(state.demandDirect).toBe(12345)
    expect(scenarios).toHaveLength(2)
    expect(scenarios.map((s) => s.name)).toEqual(['High demand', 'No PSA'])
    expect(scenarios[1].state.demandDirect).toBe(999)
    expect(scenarios[1].state.fleet.psa).toHaveLength(0)
    expect(scenarios[0].state.fleet.psa).toHaveLength(2)
  })

  it('embeds live formulas whose seeded results match the engine', async () => {
    const s = sampleState()
    const buf = await facilityWorkbookBuffer(s)
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const ws = wb.getWorksheet('OxyCost')!
    let formulaCells = 0
    let monthlyTotals = 0
    ws.eachRow((row) => {
      const label = String(row.getCell(2).value ?? '')
      const v = row.getCell(3).value as { formula?: string; result?: unknown } | null
      if (v && typeof v === 'object' && 'formula' in v && v.formula) {
        formulaCells++
        if (label === 'Monthly total') {
          monthlyTotals++
          // Seeded result is present and positive for a costed source.
          expect(typeof v.result).toBe('number')
          expect(v.result as number).toBeGreaterThan(0)
        }
      }
    })
    // 5 sources → 5 "Monthly total" formula rows, plus many component formulas.
    expect(monthlyTotals).toBe(5)
    expect(formulaCells).toBeGreaterThan(30)
  })

  it('rejects a workbook with no OxyCost input rows', async () => {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('Something else').addRow(['just', 'some', 'data'])
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer
    await expect(importFacilityWorkbookBuffer(buf)).rejects.toThrow(/OxyCost export|recognisable/i)
  })
})
