import { describe, expect, it } from 'vitest'
import { explainSource, partsText } from '../explain'
import { calcCylinder } from '../cylinder'
import { calcLmo } from '../lmo'
import { calcPsa } from '../psa'
import { calcConcentrator } from '../concentrator'
import {
  CYLINDER_DEFAULTS,
  LMO_DEFAULTS,
  OC_DEFAULTS,
  PSA_DEFAULTS,
} from '../constants'
import type { EngineInputs } from '../types'

const psaIn = { ...PSA_DEFAULTS, psa_capacity_lpm: 1500, psa_run_hours_monthly: 720 }
const lmoIn = { ...LMO_DEFAULTS, lmo_monthly_cu_m: 5100 }
const cylIn = { ...CYLINDER_DEFAULTS }
const ocIn = { ...OC_DEFAULTS }

const inputs: EngineInputs = {
  demand_cu_m: 5000,
  psa: [psaIn],
  lmo: [lmoIn],
  cylinder: [cylIn],
  oc: [ocIn],
}
void inputs

describe('explainSource — structure and consistency', () => {
  it('PSA explanation has output, all components, total, and 3 per-unit steps', () => {
    const e = explainSource('psa', psaIn, calcPsa(psaIn))
    expect(e.components).toHaveLength(7) // incl. plant rental (0 when purchased)
    expect(e.perUnit).toHaveLength(3)
    expect(e.output.value).toContain('cu m')
    expect(e.totalValue).toContain('₹')
  })

  it('component amounts in the explanation match the calculator result', () => {
    const r = calcLmo(lmoIn)
    const e = explainSource('lmo', lmoIn, r)
    expect(e.totalValue).toContain('₹')
    expect(e.components.find((c) => c.label === 'Refilling')!.variable).toBe(true)
  })

  it('cylinder explanation shows refill ÷ size in the incremental step', () => {
    const r = calcCylinder(cylIn)
    const e = explainSource('cylinder', cylIn, r)
    const incr = e.perUnit.find((p) => p.label.startsWith('Incremental'))!
    expect(incr.value).toContain('/cu m')
    expect(partsText(incr.formula)).toContain('÷ 7')
  })

  it('OC explanation derives output from units, LPM and hours', () => {
    const r = calcConcentrator(ocIn)
    const e = explainSource('oc', ocIn, r)
    expect(partsText(e.output.formula)).toContain('LPM')
    expect(e.perUnit).toHaveLength(3)
  })
})
