// Transparent, numbers-substituted formulas for every per-facility expense head
// in the state/district model — the analog of the facility calculator's
// explain.ts. Each formula is a token array; a token is either literal text or a
// FieldRef that links the substituted value back to the input it came from
// (a state rate, or a per-band model override), so the UI can jump to it.
import { directHeads, facilityHeads } from './compute'
import type { BandProfile, CostHead, DirectInputs, StateRates } from './types'

/** A run of formula text sourced from an editable input. */
export interface StateFieldRef {
  t: string
  field: string
  /** Where the field lives: a state rate, a per-band model value, or a direct total. */
  target: 'rate' | 'band' | 'direct'
}
export type StatePart = string | StateFieldRef
export interface StateHeadExplain extends CostHead {
  formula: StatePart[]
}

const DAYS = 365
const MONTHS = 12

function n(v: number, dp = 0): string {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}
function inr(v: number): string {
  return `₹${n(v)}`
}
function band(t: string, field: string): StateFieldRef {
  return { t, field, target: 'band' }
}
function rate(t: string, field: string): StateFieldRef {
  return { t, field, target: 'rate' }
}
function direct(t: string, field: string): StateFieldRef {
  return { t, field, target: 'direct' }
}
/** Nearest key in a "by capacity/size" rate map (mirrors compute.ts `nearest`). */
function nearestKey(map: Record<string, number>, v: number): string {
  const keys = Object.keys(map)
  if (keys.length === 0) return ''
  let best = keys[0]
  for (const k of keys) if (Math.abs(Number(k) - v) < Math.abs(Number(best) - v)) best = k
  return best
}

/**
 * Which source's presence gates a head (for estimate mode). The head cost is
 * (number of facilities with that source) × the per-facility formula below, so
 * the formula itself carries NO "% have" factor — the count is applied outside.
 * `null` = the head applies to every facility (multiply by the facility count).
 */
export const HEAD_GATE: Record<string, { probKey: keyof BandProfile; source: string } | null> = {
  elec_psa: { probKey: 'psaProb', source: 'a PSA plant' },
  amc_psa: { probKey: 'psaProb', source: 'a PSA plant' },
  repairs_psa: { probKey: 'psaProb', source: 'a PSA plant' },
  elec_oc: { probKey: 'ocProb', source: 'oxygen concentrators' },
  amc_oc: { probKey: 'ocProb', source: 'oxygen concentrators' },
  consum_oc: { probKey: 'ocProb', source: 'oxygen concentrators' },
  lmo_refill: { probKey: 'lmoProb', source: 'an LMO tank' },
  amc_lmo: { probKey: 'lmoProb', source: 'an LMO tank' },
  cyl_refill_d: { probKey: 'cylProb', source: 'cylinders' },
  cyl_refill_b: { probKey: 'cylProb', source: 'cylinders' },
  cyl_refill_a: { probKey: 'cylProb', source: 'cylinders' },
  cyl_transport: { probKey: 'cylProb', source: 'cylinders' },
  hydrotest: { probKey: 'cylProb', source: 'cylinders' },
  amc_mgps: { probKey: 'mgpsProb', source: 'an MGPS pipeline' },
  repairs_mgps: { probKey: 'mgpsProb', source: 'an MGPS pipeline' },
  hr_govt: { probKey: 'techProb', source: 'a dedicated technician' },
  hr_contract: { probKey: 'techProb', source: 'a dedicated technician' },
  train_psa_tech: { probKey: 'techProb', source: 'a dedicated technician' },
  amc_oxi: null,
  consum_oxi: null,
  train_initial: null,
  train_refresher: null,
  iec: null,
}

/**
 * Per-facility formula for one head, for a facility that HAS the relevant source
 * (no "% have" factor — the number of such facilities is applied outside). For
 * this to read as one such facility's cost, pass a profile with presence = 1.
 */
function formulaFor(key: string, p: BandProfile, r: StateRates): StatePart[] {
  const powKey = nearestKey(r.psaPowerByCapacity, p.psaCapacityLpm)
  const psaAssetKey = nearestKey(r.psaAssetByCapacity, p.psaCapacityLpm)
  const lmoAssetKey = nearestKey(r.lmoAssetByKl, p.lmoCapacityKl)
  const psaPower = r.psaPowerByCapacity[powKey] ?? 0
  const psaAsset = r.psaAssetByCapacity[psaAssetKey] ?? 0
  const lmoAsset = r.lmoAssetByKl[lmoAssetKey] ?? 0
  const annualRefills = (p.cylDRefillsMo + p.cylBRefillsMo + p.cylARefillsMo) * MONTHS
  const totalCyl = p.cylDCount + p.cylBCount + p.cylACount

  switch (key) {
    case 'elec_psa':
      return [
        band(`${n(p.psaPlants, 0)} plants`, 'psaPlants'),
        ' × ',
        band(`${n(p.psaProdHrsPerDay, 1)} prod h/day`, 'psaProdHrsPerDay'),
        ` × ${DAYS} days × `,
        rate(`${n(psaPower, 2)} kWh/h`, `psaPowerByCapacity.${powKey}`),
        ' × ',
        rate(`₹${n(r.electricityTariff, 2)}/kWh`, 'electricityTariff'),
      ]
    case 'elec_oc':
      return [
        band(`${n(p.ocDeployed, 0)} units`, 'ocDeployed'),
        ' × ',
        band(`${n(p.ocHrsPerDay, 1)} h/day`, 'ocHrsPerDay'),
        ` × ${DAYS} days × `,
        rate(`${n(r.ocPowerKwh, 2)} kWh/h`, 'ocPowerKwh'),
        ' × ',
        rate(`₹${n(r.electricityTariff, 2)}/kWh`, 'electricityTariff'),
      ]
    case 'lmo_refill':
      return [
        band(`${n(p.lmoAnnualKl, 1)} KL/yr`, 'lmoAnnualKl'),
        ' × 1000 kg/KL × ',
        rate(`₹${n(r.lmoRatePerKg, 2)}/kg`, 'lmoRatePerKg'),
      ]
    case 'cyl_refill_d':
      return [band(`${n(p.cylDRefillsMo, 1)} D-refills/mo`, 'cylDRefillsMo'), ` × ${MONTHS} mo × `, rate(`₹${n(r.cylRefillD, 0)}`, 'cylRefillD')]
    case 'cyl_refill_b':
      return [band(`${n(p.cylBRefillsMo, 1)} B-refills/mo`, 'cylBRefillsMo'), ` × ${MONTHS} mo × `, rate(`₹${n(r.cylRefillB, 0)}`, 'cylRefillB')]
    case 'cyl_refill_a':
      return [band(`${n(p.cylARefillsMo, 1)} A-refills/mo`, 'cylARefillsMo'), ` × ${MONTHS} mo × `, rate(`₹${n(r.cylRefillA, 0)}`, 'cylRefillA')]
    case 'cyl_transport':
      return [
        `${n(annualRefills, 0)} refills/yr ÷ `,
        rate(`${n(r.cylPerTrip, 0)}/trip`, 'cylPerTrip'),
        ' × ',
        rate(`₹${n(r.cylTransportPerTrip, 0)}/trip`, 'cylTransportPerTrip'),
      ]
    case 'amc_psa':
      return [band(`${n(p.psaPlants, 0)} plants`, 'psaPlants'), ' × ', rate(`${inr(psaAsset)} asset`, `psaAssetByCapacity.${psaAssetKey}`), ' × ', rate(`${n(r.psaCamcPct * 100, 1)}% CAMC`, 'psaCamcPct')]
    case 'amc_lmo':
      return [band(`${n(p.lmoTanks, 0)} tanks`, 'lmoTanks'), ' × ', rate(`${inr(lmoAsset)} asset`, `lmoAssetByKl.${lmoAssetKey}`), ' × ', rate(`${n(r.lmoAmcPct * 100, 1)}% AMC`, 'lmoAmcPct')]
    case 'amc_mgps':
      return [band(`${n(p.mgpsBhu, 0)} BHUs`, 'mgpsBhu'), ' × ', rate(`${inr(r.mgpsAssetPerBhu)}/BHU`, 'mgpsAssetPerBhu'), ' × ', rate(`${n(r.mgpsAmcPct * 100, 1)}% AMC`, 'mgpsAmcPct')]
    case 'amc_oc':
      return [band(`${n(p.ocDeployed, 0)} units`, 'ocDeployed'), ' × ', rate(`${inr(r.ocAsset)} asset`, 'ocAsset'), ' × ', rate(`${n(r.ocAmcPct * 100, 1)}% AMC`, 'ocAmcPct')]
    case 'amc_oxi':
      return [band(`${n(p.bedside, 0)} bedside oximeters`, 'bedside'), ' × ', rate(`${inr(r.oxiBedsideAsset)} asset`, 'oxiBedsideAsset'), ' × ', rate(`${n(r.oxiBedsideAmcPct * 100, 1)}% AMC`, 'oxiBedsideAmcPct')]
    case 'repairs_psa':
      return [band(`${n(p.psaPlants, 0)} plants`, 'psaPlants'), ' × ', rate(`${inr(psaAsset)} asset`, `psaAssetByCapacity.${psaAssetKey}`), ' × ', rate(`${n(r.psaRepairPct * 100, 1)}% repairs`, 'psaRepairPct')]
    case 'repairs_mgps':
      return [band(`${n(p.mgpsBhu, 0)} BHUs`, 'mgpsBhu'), ' × ', rate(`${inr(r.mgpsAssetPerBhu)}/BHU`, 'mgpsAssetPerBhu'), ' × ', rate(`${n(r.mgpsRepairPct * 100, 1)}% repairs`, 'mgpsRepairPct')]
    case 'consum_oc':
      return [band(`${n(p.ocDeployed, 0)} units`, 'ocDeployed'), ' × ', rate(`${inr(r.ocFilterPerYear)}/yr filters`, 'ocFilterPerYear')]
    case 'consum_oxi':
      return [band(`${n(p.fingertip, 0)} fingertip`, 'fingertip'), ' × ', rate(`${inr(r.oxiFingertipPerYear)}/yr`, 'oxiFingertipPerYear'), ' + ', band(`${n(p.bedside, 0)} bedside`, 'bedside'), ' × ', rate(`${inr(r.oxiBedsideProbePerYear)}/yr probe`, 'oxiBedsideProbePerYear')]
    case 'hydrotest':
      return [band(`${n(totalCyl, 0)} cylinders owned`, 'cylDCount'), ' × ', rate(`${inr(r.cylHydrotest)}`, 'cylHydrotest'), ' ÷ 5 yrs']
    case 'hr_govt':
      return [band(`${n(p.techs, 1)} techs`, 'techs'), ' × ', rate(`${n(r.govtTechShare * 100, 0)}% govt`, 'govtTechShare'), ' × ', rate(`${inr(r.salaryGovtTech)}/mo`, 'salaryGovtTech'), ` × ${MONTHS} mo`]
    case 'hr_contract':
      return [band(`${n(p.techs, 1)} techs`, 'techs'), ' × ', rate(`${n((1 - r.govtTechShare) * 100, 0)}% contract`, 'govtTechShare'), ' × ', rate(`${inr(r.salaryContractTech)}/mo`, 'salaryContractTech'), ` × ${MONTHS} mo`]
    case 'train_initial':
      return [band(`${n(p.doctors, 0)} doctors`, 'doctors'), ' × ', rate(`${inr(r.trainDoctor)}`, 'trainDoctor'), ' + ', band(`${n(p.nurses, 0)} nurses`, 'nurses'), ' × ', rate(`${inr(r.trainNurse)}`, 'trainNurse'), ' + ', band(`${n(p.paramedics, 0)} paramedics`, 'paramedics'), ' × ', rate(`${inr(r.trainParamedic)}`, 'trainParamedic')]
    case 'train_refresher':
      return ['initial training × ', rate(`${n(r.refresherPct * 100, 0)}% refresher`, 'refresherPct'), ' ÷ ', rate(`${n(r.refresherEveryYears, 0)} yrs`, 'refresherEveryYears')]
    case 'train_psa_tech':
      return [band(`${n(p.techs, 1)} techs`, 'techs'), ' × ', rate(`${inr(r.trainPsaTech)}`, 'trainPsaTech')]
    case 'iec':
      return [rate(`${inr(r.iec[p.iecTier] ?? 0)}/yr`, `iec.${p.iecTier}`), ` (${p.iecTier} facility)`]
    default:
      return ['—']
  }
}

/** Every per-facility expense head for a profile, with a linkable formula. */
export function explainFacilityHeads(p: BandProfile, r: StateRates): StateHeadExplain[] {
  return facilityHeads(p, r).map((h) => ({ ...h, formula: formulaFor(h.key, p, r) }))
}

/** Capacities/sizes with a non-zero count, in ascending order. */
function activeBuckets(counts: Record<string, number>): string[] {
  return Object.keys(counts)
    .filter((k) => (counts[k] || 0) > 0)
    .sort((a, b) => Number(a) - Number(b))
}

/** Token formula for one head from district-wide totals (direct-entry mode). */
function directFormulaFor(key: string, d: DirectInputs, r: StateRates): StatePart[] {
  const annualRefills = (d.cylDRefillsMo + d.cylBRefillsMo + d.cylARefillsMo) * MONTHS
  const psaCaps = activeBuckets(d.psaByCapacity)
  const lmoSizes = activeBuckets(d.lmoTanksByKl)

  switch (key) {
    case 'elec_psa': {
      if (psaCaps.length === 0) return ['no PSA plants entered']
      const parts: StatePart[] = ['(']
      psaCaps.forEach((c, i) => {
        if (i > 0) parts.push(' + ')
        parts.push(direct(`${n(d.psaByCapacity[c], 0)}× ${c} LPM`, `psaByCapacity.${c}`))
        parts.push(' @ ')
        parts.push(rate(`${n(r.psaPowerByCapacity[c] ?? 0, 2)} kWh/h`, `psaPowerByCapacity.${c}`))
      })
      parts.push(') × ')
      parts.push(direct(`${n(d.psaProdHrsPerDay, 1)} h/day`, 'psaProdHrsPerDay'))
      parts.push(` × ${DAYS} days × `)
      parts.push(rate(`₹${n(r.electricityTariff, 2)}/kWh`, 'electricityTariff'))
      return parts
    }
    case 'elec_oc':
      return [
        direct(`${n(d.ocDeployed, 0)} units`, 'ocDeployed'),
        ' × ',
        direct(`${n(d.ocHrsPerDay, 1)} h/day`, 'ocHrsPerDay'),
        ` × ${DAYS} days × `,
        rate(`${n(r.ocPowerKwh, 2)} kWh/h`, 'ocPowerKwh'),
        ' × ',
        rate(`₹${n(r.electricityTariff, 2)}/kWh`, 'electricityTariff'),
      ]
    case 'lmo_refill':
      return [
        direct(`${n(d.lmoAnnualKl, 1)} KL/yr`, 'lmoAnnualKl'),
        ' × 1000 kg/KL × ',
        rate(`₹${n(r.lmoRatePerKg, 2)}/kg`, 'lmoRatePerKg'),
      ]
    case 'cyl_refill_d':
      return [direct(`${n(d.cylDRefillsMo, 0)} D-refills/mo`, 'cylDRefillsMo'), ` × ${MONTHS} mo × `, rate(`₹${n(r.cylRefillD, 0)}`, 'cylRefillD')]
    case 'cyl_refill_b':
      return [direct(`${n(d.cylBRefillsMo, 0)} B-refills/mo`, 'cylBRefillsMo'), ` × ${MONTHS} mo × `, rate(`₹${n(r.cylRefillB, 0)}`, 'cylRefillB')]
    case 'cyl_refill_a':
      return [direct(`${n(d.cylARefillsMo, 0)} A-refills/mo`, 'cylARefillsMo'), ` × ${MONTHS} mo × `, rate(`₹${n(r.cylRefillA, 0)}`, 'cylRefillA')]
    case 'cyl_transport':
      return [
        `${n(annualRefills, 0)} refills/yr ÷ `,
        rate(`${n(r.cylPerTrip, 0)}/trip`, 'cylPerTrip'),
        ' × ',
        rate(`₹${n(r.cylTransportPerTrip, 0)}/trip`, 'cylTransportPerTrip'),
      ]
    case 'amc_psa':
    case 'repairs_psa': {
      const isRepair = key === 'repairs_psa'
      if (psaCaps.length === 0) return ['no PSA plants entered']
      const parts: StatePart[] = ['(']
      psaCaps.forEach((c, i) => {
        if (i > 0) parts.push(' + ')
        parts.push(direct(`${n(d.psaByCapacity[c], 0)}× ${c} LPM`, `psaByCapacity.${c}`))
        parts.push(' @ ')
        parts.push(rate(`${inr(r.psaAssetByCapacity[c] ?? 0)}`, `psaAssetByCapacity.${c}`))
      })
      parts.push(') × ')
      parts.push(
        isRepair
          ? rate(`${n(r.psaRepairPct * 100, 1)}% repairs`, 'psaRepairPct')
          : rate(`${n(r.psaCamcPct * 100, 1)}% CAMC`, 'psaCamcPct'),
      )
      return parts
    }
    case 'amc_lmo': {
      if (lmoSizes.length === 0) return ['no LMO tanks entered']
      const parts: StatePart[] = ['(']
      lmoSizes.forEach((kl, i) => {
        if (i > 0) parts.push(' + ')
        parts.push(direct(`${n(d.lmoTanksByKl[kl], 0)}× ${kl} KL`, `lmoTanksByKl.${kl}`))
        parts.push(' @ ')
        parts.push(rate(`${inr(r.lmoAssetByKl[kl] ?? 0)}`, `lmoAssetByKl.${kl}`))
      })
      parts.push(') × ')
      parts.push(rate(`${n(r.lmoAmcPct * 100, 1)}% AMC`, 'lmoAmcPct'))
      return parts
    }
    case 'amc_mgps':
      return [direct(`${n(d.mgpsBhu, 0)} BHUs`, 'mgpsBhu'), ' × ', rate(`${inr(r.mgpsAssetPerBhu)}/BHU`, 'mgpsAssetPerBhu'), ' × ', rate(`${n(r.mgpsAmcPct * 100, 1)}% AMC`, 'mgpsAmcPct')]
    case 'amc_oc':
      return [direct(`${n(d.ocDeployed, 0)} units`, 'ocDeployed'), ' × ', rate(`${inr(r.ocAsset)} asset`, 'ocAsset'), ' × ', rate(`${n(r.ocAmcPct * 100, 1)}% AMC`, 'ocAmcPct')]
    case 'amc_oxi':
      return [direct(`${n(d.bedside, 0)} bedside oximeters`, 'bedside'), ' × ', rate(`${inr(r.oxiBedsideAsset)} asset`, 'oxiBedsideAsset'), ' × ', rate(`${n(r.oxiBedsideAmcPct * 100, 1)}% AMC`, 'oxiBedsideAmcPct')]
    case 'repairs_mgps':
      return [direct(`${n(d.mgpsBhu, 0)} BHUs`, 'mgpsBhu'), ' × ', rate(`${inr(r.mgpsAssetPerBhu)}/BHU`, 'mgpsAssetPerBhu'), ' × ', rate(`${n(r.mgpsRepairPct * 100, 1)}% repairs`, 'mgpsRepairPct')]
    case 'consum_oc':
      return [direct(`${n(d.ocDeployed, 0)} units`, 'ocDeployed'), ' × ', rate(`${inr(r.ocFilterPerYear)}/yr filters`, 'ocFilterPerYear')]
    case 'consum_oxi':
      return [direct(`${n(d.fingertip, 0)} fingertip`, 'fingertip'), ' × ', rate(`${inr(r.oxiFingertipPerYear)}/yr`, 'oxiFingertipPerYear'), ' + ', direct(`${n(d.bedside, 0)} bedside`, 'bedside'), ' × ', rate(`${inr(r.oxiBedsideProbePerYear)}/yr probe`, 'oxiBedsideProbePerYear')]
    case 'hydrotest':
      return [direct(`${n(d.cylCount, 0)} cylinders`, 'cylCount'), ' × ', rate(`${inr(r.cylHydrotest)}`, 'cylHydrotest'), ' ÷ 5 yrs']
    case 'hr_govt':
      return [direct(`${n(d.techs, 0)} techs`, 'techs'), ' × ', rate(`${n(r.govtTechShare * 100, 0)}% govt`, 'govtTechShare'), ' × ', rate(`${inr(r.salaryGovtTech)}/mo`, 'salaryGovtTech'), ` × ${MONTHS} mo`]
    case 'hr_contract':
      return [direct(`${n(d.techs, 0)} techs`, 'techs'), ' × ', rate(`${n((1 - r.govtTechShare) * 100, 0)}% contract`, 'govtTechShare'), ' × ', rate(`${inr(r.salaryContractTech)}/mo`, 'salaryContractTech'), ` × ${MONTHS} mo`]
    case 'train_initial':
      return [direct(`${n(d.doctors, 0)} doctors`, 'doctors'), ' × ', rate(`${inr(r.trainDoctor)}`, 'trainDoctor'), ' + ', direct(`${n(d.nurses, 0)} nurses`, 'nurses'), ' × ', rate(`${inr(r.trainNurse)}`, 'trainNurse'), ' + ', direct(`${n(d.paramedics, 0)} paramedics`, 'paramedics'), ' × ', rate(`${inr(r.trainParamedic)}`, 'trainParamedic')]
    case 'train_refresher':
      return ['initial training × ', rate(`${n(r.refresherPct * 100, 0)}% refresher`, 'refresherPct'), ' ÷ ', rate(`${n(r.refresherEveryYears, 0)} yrs`, 'refresherEveryYears')]
    case 'train_psa_tech':
      return [direct(`${n(d.techs, 0)} techs`, 'techs'), ' × ', rate(`${inr(r.trainPsaTech)}`, 'trainPsaTech')]
    case 'iec':
      return [rate(`${inr(r.iec[d.iecTier] ?? 0)}/yr`, `iec.${d.iecTier}`), ` (${d.iecTier}) × `, direct(`${n(d.facilities, 0)} facilities`, 'facilities')]
    default:
      return ['—']
  }
}

/** Every district-total expense head, with a linkable formula (direct mode). */
export function explainDirectHeads(d: DirectInputs, r: StateRates): StateHeadExplain[] {
  return directHeads(d, r).map((h) => ({ ...h, formula: directFormulaFor(h.key, d, r) }))
}
