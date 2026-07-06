import { describe, expect, it } from 'vitest'
import { explainFacilityHeads } from '../explain'
import { facilityHeads } from '../compute'
import { predictBand, defaultRates } from '../data'
import type { StateFieldRef } from '../explain'

const rates = defaultRates('Madhya Pradesh')
// A mid-size profile exercises PSA + cylinders + HR; a 60+ profile exercises the
// large PSA/LMO capacity buckets (2000 LPM / 20 KL) so their rate refs resolve.
const profiles = [
  predictBand('30-59', 40, 'Madhya Pradesh'),
  predictBand('60+', 120, 'Madhya Pradesh'),
]

const isRef = (p: unknown): p is StateFieldRef =>
  typeof p === 'object' && p !== null && 'field' in p

describe('state explainFacilityHeads', () => {
  it('mirrors facilityHeads: same keys and annual amounts', () => {
    for (const p of profiles) {
      const heads = facilityHeads(p, rates)
      const ex = explainFacilityHeads(p, rates)
      expect(ex.map((h) => h.key)).toEqual(heads.map((h) => h.key))
      ex.forEach((h, i) => expect(h.annual).toBe(heads[i].annual))
    }
  })

  it('every formula field-ref points to a real input', () => {
    const bandKeys = new Set(Object.keys(profiles[0]))
    const rateKeys = new Set(Object.keys(rates))
    for (const p of profiles) {
      for (const h of explainFacilityHeads(p, rates)) {
        for (const part of h.formula) {
          if (!isRef(part)) continue
          if (part.target === 'band') {
            expect(bandKeys, `band field ${part.field} in ${h.key}`).toContain(part.field)
          } else {
            // Either a flat rate key, or a "map.sub" key that exists in the map.
            if (part.field.includes('.')) {
              const [mapKey, sub] = part.field.split('.')
              const map = (rates as unknown as Record<string, Record<string, number>>)[mapKey]
              expect(map, `rate map ${mapKey} in ${h.key}`).toBeTruthy()
              expect(Object.keys(map), `rate ${part.field} in ${h.key}`).toContain(sub)
            } else {
              expect(rateKeys, `rate field ${part.field} in ${h.key}`).toContain(part.field)
            }
          }
        }
      }
    }
  })

  it('every head has a non-empty formula', () => {
    for (const h of explainFacilityHeads(profiles[0], rates)) {
      expect(h.formula.length).toBeGreaterThan(0)
    }
  })
})
