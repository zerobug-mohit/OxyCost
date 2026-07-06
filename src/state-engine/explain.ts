// Transparent, numbers-substituted formulas for every per-facility expense head
// in the state/district model — the analog of the facility calculator's
// explain.ts. Each formula is a token array; a token is either literal text or a
// FieldRef that links the substituted value back to the input it came from
// (a state rate, or a per-band model override), so the UI can jump to it.
import { facilityHeads } from './compute'
import type { BandProfile, CostHead, StateRates } from './types'

/** A run of formula text sourced from an editable input. */
export interface StateFieldRef {
  t: string
  field: string
  /** Where the field lives: a global state rate, or a per-band model value. */
  target: 'rate' | 'band'
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
/** Nearest key in a "by capacity/size" rate map (mirrors compute.ts `nearest`). */
function nearestKey(map: Record<string, number>, v: number): string {
  const keys = Object.keys(map)
  if (keys.length === 0) return ''
  let best = keys[0]
  for (const k of keys) if (Math.abs(Number(k) - v) < Math.abs(Number(best) - v)) best = k
  return best
}

/** Token formula for one expense head, with inputs substituted in. */
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
        `${n(p.psaProb, 2)} PSA-present × `,
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
        band(`${n(p.ocProb * 100, 0)}% have OC`, 'ocProb'),
        ' × ',
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
        `${n(p.lmoProb, 2)} LMO-present × `,
        band(`${n(p.lmoAnnualKl, 1)} KL/yr`, 'lmoAnnualKl'),
        ' × 1000 kg/KL × ',
        rate(`₹${n(r.lmoRatePerKg, 2)}/kg`, 'lmoRatePerKg'),
      ]
    case 'cyl_refill_d':
      return [
        band(`${n(p.cylProb * 100, 0)}% have cyl`, 'cylProb'),
        ' × ',
        band(`${n(p.cylDRefillsMo, 1)} D-refills/mo`, 'cylDRefillsMo'),
        ` × ${MONTHS} mo × `,
        rate(`₹${n(r.cylRefillD, 0)}`, 'cylRefillD'),
      ]
    case 'cyl_refill_b':
      return [
        band(`${n(p.cylProb * 100, 0)}% have cyl`, 'cylProb'),
        ' × ',
        band(`${n(p.cylBRefillsMo, 1)} B-refills/mo`, 'cylBRefillsMo'),
        ` × ${MONTHS} mo × `,
        rate(`₹${n(r.cylRefillB, 0)}`, 'cylRefillB'),
      ]
    case 'cyl_refill_a':
      return [
        band(`${n(p.cylProb * 100, 0)}% have cyl`, 'cylProb'),
        ' × ',
        band(`${n(p.cylARefillsMo, 1)} A-refills/mo`, 'cylARefillsMo'),
        ` × ${MONTHS} mo × `,
        rate(`₹${n(r.cylRefillA, 0)}`, 'cylRefillA'),
      ]
    case 'cyl_transport':
      return [
        band(`${n(p.cylProb * 100, 0)}% have cyl`, 'cylProb'),
        ` × (${n(annualRefills, 0)} refills/yr ÷ `,
        rate(`${n(r.cylPerTrip, 0)}/trip`, 'cylPerTrip'),
        ') × ',
        rate(`₹${n(r.cylTransportPerTrip, 0)}/trip`, 'cylTransportPerTrip'),
      ]
    case 'amc_psa':
      return [
        `${n(p.psaProb, 2)} PSA-present × `,
        band(`${n(p.psaPlants, 0)} plants`, 'psaPlants'),
        ' × ',
        rate(`${inr(psaAsset)} asset`, `psaAssetByCapacity.${psaAssetKey}`),
        ' × ',
        rate(`${n(r.psaCamcPct * 100, 1)}% CAMC`, 'psaCamcPct'),
      ]
    case 'amc_lmo':
      return [
        `${n(p.lmoProb, 2)} LMO-present × ${n(p.lmoTanks, 0)} tanks × `,
        rate(`${inr(lmoAsset)} asset`, `lmoAssetByKl.${lmoAssetKey}`),
        ' × ',
        rate(`${n(r.lmoAmcPct * 100, 1)}% AMC`, 'lmoAmcPct'),
      ]
    case 'amc_mgps':
      return [
        band(`${n(p.mgpsProb * 100, 0)}% have MGPS`, 'mgpsProb'),
        ' × ',
        band(`${n(p.mgpsBhu, 0)} BHUs`, 'mgpsBhu'),
        ' × ',
        rate(`${inr(r.mgpsAssetPerBhu)}/BHU`, 'mgpsAssetPerBhu'),
        ' × ',
        rate(`${n(r.mgpsAmcPct * 100, 1)}% AMC`, 'mgpsAmcPct'),
      ]
    case 'amc_oc':
      return [
        band(`${n(p.ocProb * 100, 0)}% have OC`, 'ocProb'),
        ' × ',
        band(`${n(p.ocDeployed, 0)} units`, 'ocDeployed'),
        ' × ',
        rate(`${inr(r.ocAsset)} asset`, 'ocAsset'),
        ' × ',
        rate(`${n(r.ocAmcPct * 100, 1)}% AMC`, 'ocAmcPct'),
      ]
    case 'amc_oxi':
      return [
        band(`${n(p.bedside, 0)} bedside oximeters`, 'bedside'),
        ' × ',
        rate(`${inr(r.oxiBedsideAsset)} asset`, 'oxiBedsideAsset'),
        ' × ',
        rate(`${n(r.oxiBedsideAmcPct * 100, 1)}% AMC`, 'oxiBedsideAmcPct'),
      ]
    case 'repairs_psa':
      return [
        `${n(p.psaProb, 2)} PSA-present × `,
        band(`${n(p.psaPlants, 0)} plants`, 'psaPlants'),
        ' × ',
        rate(`${inr(psaAsset)} asset`, `psaAssetByCapacity.${psaAssetKey}`),
        ' × ',
        rate(`${n(r.psaRepairPct * 100, 1)}% repairs`, 'psaRepairPct'),
      ]
    case 'repairs_mgps':
      return [
        band(`${n(p.mgpsProb * 100, 0)}% have MGPS`, 'mgpsProb'),
        ' × ',
        band(`${n(p.mgpsBhu, 0)} BHUs`, 'mgpsBhu'),
        ' × ',
        rate(`${inr(r.mgpsAssetPerBhu)}/BHU`, 'mgpsAssetPerBhu'),
        ' × ',
        rate(`${n(r.mgpsRepairPct * 100, 1)}% repairs`, 'mgpsRepairPct'),
      ]
    case 'consum_oc':
      return [
        band(`${n(p.ocProb * 100, 0)}% have OC`, 'ocProb'),
        ' × ',
        band(`${n(p.ocDeployed, 0)} units`, 'ocDeployed'),
        ' × ',
        rate(`${inr(r.ocFilterPerYear)}/yr filters`, 'ocFilterPerYear'),
      ]
    case 'consum_oxi':
      return [
        band(`${n(p.fingertip, 0)} fingertip`, 'fingertip'),
        ' × ',
        rate(`${inr(r.oxiFingertipPerYear)}/yr`, 'oxiFingertipPerYear'),
        ' + ',
        band(`${n(p.bedside, 0)} bedside`, 'bedside'),
        ' × ',
        rate(`${inr(r.oxiBedsideProbePerYear)}/yr probe`, 'oxiBedsideProbePerYear'),
      ]
    case 'hydrotest':
      return [
        band(`${n(p.cylProb * 100, 0)}% have cyl`, 'cylProb'),
        ` × ${n(totalCyl, 0)} cylinders × `,
        rate(`${inr(r.cylHydrotest)}`, 'cylHydrotest'),
        ' ÷ 5 yrs',
      ]
    case 'hr_govt':
      return [
        band(`${n(p.techProb * 100, 0)}% have tech`, 'techProb'),
        ' × ',
        band(`${n(p.techs, 1)} techs`, 'techs'),
        ' × ',
        rate(`${n(r.govtTechShare * 100, 0)}% govt`, 'govtTechShare'),
        ' × ',
        rate(`${inr(r.salaryGovtTech)}/mo`, 'salaryGovtTech'),
        ` × ${MONTHS} mo`,
      ]
    case 'hr_contract':
      return [
        band(`${n(p.techProb * 100, 0)}% have tech`, 'techProb'),
        ' × ',
        band(`${n(p.techs, 1)} techs`, 'techs'),
        ' × ',
        rate(`${n((1 - r.govtTechShare) * 100, 0)}% contract`, 'govtTechShare'),
        ' × ',
        rate(`${inr(r.salaryContractTech)}/mo`, 'salaryContractTech'),
        ` × ${MONTHS} mo`,
      ]
    case 'train_initial':
      return [
        band(`${n(p.doctors, 0)} doctors`, 'doctors'),
        ' × ',
        rate(`${inr(r.trainDoctor)}`, 'trainDoctor'),
        ' + ',
        band(`${n(p.nurses, 0)} nurses`, 'nurses'),
        ' × ',
        rate(`${inr(r.trainNurse)}`, 'trainNurse'),
        ' + ',
        band(`${n(p.paramedics, 0)} paramedics`, 'paramedics'),
        ' × ',
        rate(`${inr(r.trainParamedic)}`, 'trainParamedic'),
      ]
    case 'train_refresher':
      return [
        `initial training × `,
        rate(`${n(r.refresherPct * 100, 0)}% refresher`, 'refresherPct'),
        ' ÷ ',
        rate(`${n(r.refresherEveryYears, 0)} yrs`, 'refresherEveryYears'),
      ]
    case 'train_psa_tech':
      return [
        band(`${n(p.techProb * 100, 0)}% have tech`, 'techProb'),
        ' × ',
        band(`${n(p.techs, 1)} techs`, 'techs'),
        ' × ',
        rate(`${inr(r.trainPsaTech)}`, 'trainPsaTech'),
      ]
    case 'iec':
      return [
        rate(`${inr(r.iec[p.iecTier] ?? 0)}/yr`, `iec.${p.iecTier}`),
        ` (${p.iecTier} facility)`,
      ]
    default:
      return ['—']
  }
}

/** Every per-facility expense head for a profile, with a linkable formula. */
export function explainFacilityHeads(p: BandProfile, r: StateRates): StateHeadExplain[] {
  return facilityHeads(p, r).map((h) => ({ ...h, formula: formulaFor(h.key, p, r) }))
}
