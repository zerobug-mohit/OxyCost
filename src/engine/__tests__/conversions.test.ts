import { describe, expect, it } from 'vitest'
import {
  cuMToLmoLitres,
  cylindersToCuM,
  demandFromBeds,
  demandFromPsaUtilization,
  litresToCuM,
  lmoLitresToCuM,
  lpmToCuMPerHour,
} from '../conversions'

describe('volume conversions (spec 3a)', () => {
  it('litres -> cu m', () => {
    expect(litresToCuM(63450000)).toBe(63450)
  })
  it('LMO litres <-> cu m (0.861 expansion)', () => {
    expect(lmoLitresToCuM(1)).toBeCloseTo(0.861, 6)
    expect(cuMToLmoLitres(5100)).toBeCloseTo(5100 / 0.861, 6)
  })
  it('cylinders -> cu m by type', () => {
    expect(cylindersToCuM(30, 'd_type')).toBe(210)
    expect(cylindersToCuM(30, 'b_type')).toBe(45)
  })
})

describe('flow conversions (spec 3b)', () => {
  it('LPM -> cu m/hr', () => {
    expect(lpmToCuMPerHour(1000)).toBeCloseTo(60, 6)
  })
})

describe('demand modes (spec 5c)', () => {
  it('from bed count', () => {
    // 20 beds * 5 LPM * 60 * 12h * 30d = 2,160,000 L = 2160 cu m
    expect(demandFromBeds(20, 5, 12, 30)).toBeCloseTo(2160, 4)
  })
  it('from PSA utilization', () => {
    // 1000 LPM * 0.5 * 24 * 30 * 60 / 1000 = 21,600 cu m
    expect(demandFromPsaUtilization(1000, 0.5, 30)).toBeCloseTo(21600, 4)
  })
})
