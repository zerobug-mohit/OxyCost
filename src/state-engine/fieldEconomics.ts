// Per-input-field "unit economics" for the state planner. Given ONE unit of an
// input (one facility, one plant, one refill/month, …), this returns the annual
// cost that unit drives, expressed as clickable pills that jump to the rate
// field(s) behind it. It mirrors the output-side cost breakdown, in reverse:
// there each cost head links back to its inputs; here each input shows the rate
// it is multiplied by. Shown inline beside the field on the left.
import type { BandProfile, DirectInputs, StateRates } from './types'
import type { StatePart } from './explain'

const DAYS = 365
const MONTHS = 12

function n(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return Math.round(v).toLocaleString('en-IN')
}
const inr = (v: number) => `₹${n(v)}`
const rate = (t: string, field: string): StatePart => ({ t, field, target: 'rate' })

/**
 * Per-unit economics for a DIRECT-mode input field (district totals), or null
 * if the field has no rate dependency worth surfacing.
 */
export function directFieldEcon(
  field: string,
  direct: DirectInputs,
  r: StateRates,
): StatePart[] | null {
  // PSA capacity rows: psaByCapacity.<cap>.<total|functional|hrs>
  if (field.startsWith('psaByCapacity.')) {
    const [, cap, prop] = field.split('.')
    const power = r.psaPowerByCapacity[cap] ?? 0
    const asset = r.psaAssetByCapacity[cap] ?? 0
    const hrs = direct.psaByCapacity[cap]?.hrs ?? 0
    if (prop === 'total') {
      const amc = asset * (r.psaCamcPct + r.psaRepairPct)
      return ['each plant ≈ ', rate(`${inr(amc)}/yr`, `psaAssetByCapacity.${cap}`), ' (AMC + repairs)']
    }
    if (prop === 'functional') {
      const elec = power * hrs * DAYS * r.electricityTariff
      return ['each functional ≈ ', rate(`${inr(elec)}/yr`, `psaPowerByCapacity.${cap}`), ` (electricity at ${n(hrs)} h/day)`]
    }
    if (prop === 'hrs') {
      return ['each h/day ≈ ', rate(`${inr(power * DAYS * r.electricityTariff)}/yr`, `psaPowerByCapacity.${cap}`), ' per functional plant']
    }
    return null
  }
  // LMO tanks by size: lmoTanksByKl.<kl>
  if (field.startsWith('lmoTanksByKl.')) {
    const [, kl] = field.split('.')
    const asset = r.lmoAssetByKl[kl] ?? 0
    return ['each tank ≈ ', rate(`${inr(asset * r.lmoAmcPct)}/yr`, `lmoAssetByKl.${kl}`), ' (AMC)']
  }
  switch (field) {
    case 'facilitiesByTier.small':
      return ['each ≈ ', rate(`${inr(r.iec.small)}/yr`, 'iec.small'), ' (IEC & printing)']
    case 'facilitiesByTier.mid':
      return ['each ≈ ', rate(`${inr(r.iec.mid)}/yr`, 'iec.mid'), ' (IEC & printing)']
    case 'facilitiesByTier.large':
      return ['each ≈ ', rate(`${inr(r.iec.large)}/yr`, 'iec.large'), ' (IEC & printing)']
    case 'lmoAnnualKl':
      return ['each KL ≈ ', rate(`${inr(1000 * r.lmoRatePerKg)}/yr`, 'lmoRatePerKg'), ' (refilling)']
    case 'cylDRefillsMo':
      return ['each refill/mo ≈ ', rate(`${inr(MONTHS * r.cylRefillD)}/yr`, 'cylRefillD')]
    case 'cylBRefillsMo':
      return ['each refill/mo ≈ ', rate(`${inr(MONTHS * r.cylRefillB)}/yr`, 'cylRefillB')]
    case 'cylARefillsMo':
      return ['each refill/mo ≈ ', rate(`${inr(MONTHS * r.cylRefillA)}/yr`, 'cylRefillA')]
    case 'cylCount':
      return ['each cylinder ≈ ', rate(`${inr(r.cylHydrotest / 5)}/yr`, 'cylHydrotest'), ' (hydro-test, amortised)']
    case 'ocHighUnits':
    case 'ocLowUnits': {
      const hrs = field === 'ocHighUnits' ? direct.ocHighHrs : direct.ocLowHrs
      const elec = hrs * DAYS * r.ocPowerKwh * r.electricityTariff
      return [
        'each ≈ ', rate(`${inr(elec)}`, 'ocPowerKwh'), ' power + ',
        rate(`${inr(r.ocAsset * r.ocAmcPct)}`, 'ocAsset'), ' AMC + ',
        rate(`${inr(r.ocFilterPerYear)}`, 'ocFilterPerYear'), ' filters /yr',
      ]
    }
    case 'mgpsBhu':
      return ['each BHU ≈ ', rate(`${inr(r.mgpsAssetPerBhu * (r.mgpsAmcPct + r.mgpsRepairPct))}/yr`, 'mgpsAssetPerBhu'), ' (AMC + repairs)']
    case 'techs':
      return [
        'each ≈ ', rate(`${inr(r.govtTechShare * r.salaryGovtTech * MONTHS)}`, 'salaryGovtTech'), ' + ',
        rate(`${inr((1 - r.govtTechShare) * r.salaryContractTech * MONTHS)}`, 'salaryContractTech'), ' /yr (blended HR)',
      ]
    case 'fingertip':
      return ['each ≈ ', rate(`${inr(r.oxiFingertipPerYear)}/yr`, 'oxiFingertipPerYear'), ' (consumables)']
    case 'bedside':
      return [
        'each ≈ ', rate(`${inr(r.oxiBedsideAsset * r.oxiBedsideAmcPct)}`, 'oxiBedsideAsset'), ' AMC + ',
        rate(`${inr(r.oxiBedsideProbePerYear)}`, 'oxiBedsideProbePerYear'), ' probe /yr',
      ]
    case 'doctors':
      return ['each ≈ ', rate(`${inr(r.trainDoctor)}`, 'trainDoctor'), ' training (one-time)']
    case 'nurses':
      return ['each ≈ ', rate(`${inr(r.trainNurse)}`, 'trainNurse'), ' training (one-time)']
    case 'paramedics':
      return ['each ≈ ', rate(`${inr(r.trainParamedic)}`, 'trainParamedic'), ' training (one-time)']
    default:
      return null
  }
}

/**
 * Per-unit economics for an ESTIMATE-mode per-band profile field (one typical
 * facility of the band). Returns the annual cost the field drives for one
 * facility that has the relevant source, or null.
 */
export function bandFieldEcon(field: keyof BandProfile, p: BandProfile, r: StateRates): StatePart[] | null {
  switch (field) {
    case 'psaProdHrsPerDay': {
      const power = nearest(r.psaPowerByCapacity, p.psaCapacityLpm)
      return ['each h/day ≈ ', rate(`${inr(power * DAYS * r.electricityTariff)}/yr`, `psaPowerByCapacity.${nearestKey(r.psaPowerByCapacity, p.psaCapacityLpm)}`), ' electricity (per plant)']
    }
    case 'psaCapacityLpm': {
      const key = nearestKey(r.psaPowerByCapacity, p.psaCapacityLpm)
      const asset = r.psaAssetByCapacity[key] ?? 0
      return ['this size ≈ ', rate(`${inr(asset)}`, `psaAssetByCapacity.${key}`), ' asset → ', rate(`${n((r.psaCamcPct + r.psaRepairPct) * 100)}%`, 'psaCamcPct'), '/yr AMC + repairs']
    }
    case 'psaPlants':
      return ['each plant multiplies PSA electricity, AMC & repairs above']
    case 'cylDRefillsMo':
      return ['each refill/mo ≈ ', rate(`${inr(MONTHS * r.cylRefillD)}/yr`, 'cylRefillD')]
    case 'cylBRefillsMo':
      return ['each refill/mo ≈ ', rate(`${inr(MONTHS * r.cylRefillB)}/yr`, 'cylRefillB')]
    case 'cylARefillsMo':
      return ['each refill/mo ≈ ', rate(`${inr(MONTHS * r.cylRefillA)}/yr`, 'cylRefillA')]
    case 'cylDCount':
    case 'cylBCount':
      return ['each cylinder ≈ ', rate(`${inr(r.cylHydrotest / 5)}/yr`, 'cylHydrotest'), ' (hydro-test, amortised)']
    case 'lmoAnnualKl':
      return ['each KL ≈ ', rate(`${inr(1000 * r.lmoRatePerKg)}/yr`, 'lmoRatePerKg'), ' (refilling)']
    case 'ocDeployed':
      return [
        'each unit ≈ ', rate(`${inr(p.ocHrsPerDay * DAYS * r.ocPowerKwh * r.electricityTariff)}`, 'ocPowerKwh'), ' power + ',
        rate(`${inr(r.ocAsset * r.ocAmcPct)}`, 'ocAsset'), ' AMC + ',
        rate(`${inr(r.ocFilterPerYear)}`, 'ocFilterPerYear'), ' filters /yr',
      ]
    case 'ocHrsPerDay':
      return ['each h/day ≈ ', rate(`${inr(DAYS * r.ocPowerKwh * r.electricityTariff)}/yr`, 'ocPowerKwh'), ' per concentrator']
    case 'mgpsBhu':
      return ['each BHU ≈ ', rate(`${inr(r.mgpsAssetPerBhu * (r.mgpsAmcPct + r.mgpsRepairPct))}/yr`, 'mgpsAssetPerBhu'), ' (AMC + repairs)']
    case 'techs':
      return [
        'each ≈ ', rate(`${inr(r.govtTechShare * r.salaryGovtTech * MONTHS)}`, 'salaryGovtTech'), ' + ',
        rate(`${inr((1 - r.govtTechShare) * r.salaryContractTech * MONTHS)}`, 'salaryContractTech'), ' /yr (blended HR)',
      ]
    case 'fingertip':
      return ['each ≈ ', rate(`${inr(r.oxiFingertipPerYear)}/yr`, 'oxiFingertipPerYear'), ' (consumables)']
    case 'bedside':
      return [
        'each ≈ ', rate(`${inr(r.oxiBedsideAsset * r.oxiBedsideAmcPct)}`, 'oxiBedsideAsset'), ' AMC + ',
        rate(`${inr(r.oxiBedsideProbePerYear)}`, 'oxiBedsideProbePerYear'), ' probe /yr',
      ]
    default:
      return null
  }
}

function nearestKey(map: Record<string, number>, v: number): string {
  const keys = Object.keys(map)
  if (keys.length === 0) return ''
  let best = keys[0]
  for (const k of keys) if (Math.abs(Number(k) - v) < Math.abs(Number(best) - v)) best = k
  return best
}
function nearest(map: Record<string, number>, v: number): number {
  return map[nearestKey(map, v)] ?? 0
}
