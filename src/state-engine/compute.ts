// State / district oxygen cost engine (pure).
// Expands each bed-band count into its median archetype, computes the expected
// annual cost of every expense head for one such facility (weighting each
// source by the share of band facilities that have it), scales by the count,
// and rolls everything up to district/state totals.
import type {
  BandProfile,
  BandResult,
  CostGroup,
  CostHead,
  StateInputs,
  StateRates,
  StateResult,
  StateResultConfidence,
} from './types'
import { confidenceLevel } from './types'

const DAYS = 365
const MONTHS = 12

const GROUP_LABEL: Record<CostGroup, string> = {
  psa: 'PSA plants',
  lmo: 'LMO',
  cylinder: 'Cylinders',
  oc: 'Concentrators',
  mgps: 'MGPS / pipeline',
  oximeter: 'Pulse oximeters',
  hr: 'Human resources',
  training: 'Training',
  iec: 'IEC / printing',
}

/** Value from a {"500":x,"1000":y} map for the numerically-nearest key. */
function nearest(map: Record<string, number>, n: number): number {
  const keys = Object.keys(map)
  if (keys.length === 0) return 0
  let best = keys[0]
  for (const k of keys) {
    if (Math.abs(Number(k) - n) < Math.abs(Number(best) - n)) best = k
  }
  return map[best]
}

/** Expected annual cost of every expense head for ONE facility of this band. */
export function facilityHeads(p: BandProfile, r: StateRates): CostHead[] {
  const psaAsset = nearest(r.psaAssetByCapacity, p.psaCapacityLpm)
  const psaPower = nearest(r.psaPowerByCapacity, p.psaCapacityLpm) // kWh/hr per plant
  const lmoAsset = nearest(r.lmoAssetByKl, p.lmoCapacityKl)
  const annualRefills =
    (p.cylDRefillsMo + p.cylBRefillsMo + p.cylARefillsMo) * MONTHS
  const totalCyl = p.cylDCount + p.cylBCount + p.cylACount
  const trainInitial =
    p.doctors * r.trainDoctor + p.nurses * r.trainNurse + p.paramedics * r.trainParamedic

  const h: CostHead[] = [
    // Electricity
    {
      key: 'elec_psa',
      label: 'Electricity — PSA plants',
      group: 'psa',
      annual: p.psaProb * p.psaPlants * p.psaProdHrsPerDay * DAYS * psaPower * r.electricityTariff,
    },
    {
      key: 'elec_oc',
      label: 'Electricity — Oxygen concentrators',
      group: 'oc',
      annual: p.ocProb * p.ocDeployed * p.ocHrsPerDay * DAYS * r.ocPowerKwh * r.electricityTariff,
    },
    // Refilling
    {
      key: 'lmo_refill',
      label: 'LMO refilling charges',
      group: 'lmo',
      annual: p.lmoProb * p.lmoAnnualKl * 1000 * r.lmoRatePerKg,
    },
    {
      key: 'cyl_refill_d',
      label: 'Cylinder refilling — D-type',
      group: 'cylinder',
      annual: p.cylProb * p.cylDRefillsMo * MONTHS * r.cylRefillD,
    },
    {
      key: 'cyl_refill_b',
      label: 'Cylinder refilling — B-type',
      group: 'cylinder',
      annual: p.cylProb * p.cylBRefillsMo * MONTHS * r.cylRefillB,
    },
    {
      key: 'cyl_refill_a',
      label: 'Cylinder refilling — A-type',
      group: 'cylinder',
      annual: p.cylProb * p.cylARefillsMo * MONTHS * r.cylRefillA,
    },
    {
      key: 'cyl_transport',
      label: 'Cylinder transport',
      group: 'cylinder',
      annual:
        r.cylPerTrip > 0
          ? p.cylProb * (annualRefills / r.cylPerTrip) * r.cylTransportPerTrip
          : 0,
    },
    // AMC / CAMC
    {
      key: 'amc_psa',
      label: 'AMC/CAMC — PSA plants',
      group: 'psa',
      annual: p.psaProb * p.psaPlants * psaAsset * r.psaCamcPct,
    },
    {
      key: 'amc_lmo',
      label: 'AMC — LMO tanks',
      group: 'lmo',
      annual: p.lmoProb * p.lmoTanks * lmoAsset * r.lmoAmcPct,
    },
    {
      key: 'amc_mgps',
      label: 'AMC — MGPS / pipeline',
      group: 'mgps',
      annual: p.mgpsProb * p.mgpsBhu * r.mgpsAssetPerBhu * r.mgpsAmcPct,
    },
    {
      key: 'amc_oc',
      label: 'AMC — Oxygen concentrators',
      group: 'oc',
      annual: p.ocProb * p.ocDeployed * r.ocAsset * r.ocAmcPct,
    },
    {
      key: 'amc_oxi',
      label: 'AMC — Pulse oximeters (bedside)',
      group: 'oximeter',
      annual: p.bedside * r.oxiBedsideAsset * r.oxiBedsideAmcPct,
    },
    // Repairs
    {
      key: 'repairs_psa',
      label: 'Ad hoc repairs — PSA plants',
      group: 'psa',
      annual: p.psaProb * p.psaPlants * psaAsset * r.psaRepairPct,
    },
    {
      key: 'repairs_mgps',
      label: 'Ad hoc repairs — MGPS & other',
      group: 'mgps',
      annual: p.mgpsProb * p.mgpsBhu * r.mgpsAssetPerBhu * r.mgpsRepairPct,
    },
    // Consumables
    {
      key: 'consum_oc',
      label: 'Consumables — concentrator filters',
      group: 'oc',
      annual: p.ocProb * p.ocDeployed * r.ocFilterPerYear,
    },
    {
      key: 'consum_oxi',
      label: 'Consumables — oximeter probes/batteries',
      group: 'oximeter',
      annual: p.fingertip * r.oxiFingertipPerYear + p.bedside * r.oxiBedsideProbePerYear,
    },
    {
      key: 'hydrotest',
      label: 'Cylinder hydrostatic testing (amortised)',
      group: 'cylinder',
      annual: (p.cylProb * totalCyl * r.cylHydrotest) / 5,
    },
    // HR
    {
      key: 'hr_govt',
      label: 'HR — Government PSA/oxygen technicians',
      group: 'hr',
      annual: p.techProb * p.techs * r.govtTechShare * r.salaryGovtTech * MONTHS,
    },
    {
      key: 'hr_contract',
      label: 'HR — Contractual PSA/oxygen technicians',
      group: 'hr',
      annual: p.techProb * p.techs * (1 - r.govtTechShare) * r.salaryContractTech * MONTHS,
    },
    // Training
    {
      key: 'train_initial',
      label: 'Training — initial (clinical staff)',
      group: 'training',
      oneTime: true,
      annual: trainInitial,
    },
    {
      key: 'train_refresher',
      label: 'Training — refresher (clinical, annualised)',
      group: 'training',
      annual: r.refresherEveryYears > 0 ? (trainInitial * r.refresherPct) / r.refresherEveryYears : 0,
    },
    {
      key: 'train_psa_tech',
      label: 'Training — PSA technicians (technical, initial)',
      group: 'training',
      oneTime: true,
      annual: p.techProb * p.techs * r.trainPsaTech,
    },
    // IEC
    {
      key: 'iec',
      label: 'IEC and printing',
      group: 'iec',
      annual: r.iec[p.iecTier] ?? 0,
    },
  ]
  return h
}

export function computeStateCost(input: StateInputs): StateResult {
  const { counts, profiles, rates } = input

  // Accumulate head totals across all facilities.
  const acc = new Map<string, CostHead>()
  const byBand: BandResult[] = []
  let totalFuncBeds = 0
  let totalFacilities = 0

  for (const p of profiles) {
    const count = counts[p.band] ?? 0
    const heads = facilityHeads(p, rates)
    const perFacilityAnnual = heads.reduce((s, x) => s + x.annual, 0)

    if (count > 0) {
      for (const x of heads) {
        const cur = acc.get(x.key)
        if (cur) cur.annual += x.annual * count
        else acc.set(x.key, { ...x, annual: x.annual * count })
      }
      totalFuncBeds += count * p.funcBeds
      totalFacilities += count
    }

    byBand.push({
      band: p.band,
      label: p.label,
      count,
      perFacilityAnnual,
      bandAnnual: perFacilityAnnual * count,
      funcBeds: p.funcBeds,
    })
  }

  // Preserve the canonical head order from facilityHeads.
  const order = facilityHeads(profiles[0], rates).map((x) => x.key)
  const heads = order.map((k) => acc.get(k)).filter((x): x is CostHead => !!x)

  const subtotal = heads.reduce((s, x) => s + x.annual, 0)
  const contingency = subtotal * rates.contingencyPct
  const total = subtotal + contingency
  const scale = subtotal > 0 ? total / subtotal : 1
  const oneTimeSubtotal = heads.filter((x) => x.oneTime).reduce((s, x) => s + x.annual, 0)
  const oneTimeTotal = oneTimeSubtotal * scale
  const recurringTotal = total - oneTimeTotal

  // By-source-group rollup (only groups with cost).
  const groupMap = new Map<CostGroup, number>()
  for (const x of heads) groupMap.set(x.group, (groupMap.get(x.group) ?? 0) + x.annual)
  const byGroup = [...groupMap.entries()]
    .map(([group, annual]) => ({ group, label: GROUP_LABEL[group], annual }))
    .sort((a, b) => b.annual - a.annual)

  // Scale each band's total to include contingency so band shares sum to total.
  for (const b of byBand) b.bandAnnual *= scale

  // --- Overall model confidence ------------------------------------------
  // Cost-weight each entered band's prediction confidence, then damp by the
  // share of the budget that comes from norm-based (not survey-observed) heads.
  const NORM_GROUPS = new Set<CostGroup>(['oximeter', 'training', 'iec'])
  const normSubtotal = heads.filter((h) => NORM_GROUPS.has(h.group)).reduce((s, h) => s + h.annual, 0)
  const normShare = subtotal > 0 ? normSubtotal / subtotal : 0

  const profByBand = new Map(profiles.map((p) => [p.band, p]))
  let wConf = 0
  let wSum = 0
  for (const b of byBand) {
    if (b.count <= 0 || b.bandAnnual <= 0) continue
    const conf = profByBand.get(b.band)?.confidence ?? 0
    wConf += conf * b.bandAnnual
    wSum += b.bandAnnual
  }
  const predConf = wSum > 0 ? wConf / wSum : 0
  // Norm-based cost is a documented assumption, not a data prediction: it caps
  // how confident the whole estimate can be.
  const score = Math.round(predConf * (1 - 0.4 * normShare))
  const level = confidenceLevel(score)
  const confidence: StateResultConfidence = {
    score,
    level,
    normShare,
    note:
      wSum === 0
        ? 'Enter facility counts to estimate confidence.'
        : `${level} confidence: predictions lean on the most similar surveyed facilities; ${Math.round(
            normShare * 100,
          )}% of the budget is from norm-based heads (oximeters, training, IEC) not directly observed in the survey.`,
  }

  return {
    heads,
    byGroup,
    byBand,
    totalFacilities,
    totalFuncBeds,
    subtotal,
    contingency,
    total,
    recurringTotal,
    oneTimeTotal,
    costPerFuncBed: totalFuncBeds > 0 ? total / totalFuncBeds : 0,
    confidence,
  }
}
