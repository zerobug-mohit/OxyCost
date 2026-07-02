// State / district oxygen cost engine (pure over the shipped survey data).
// Each bed band is modelled as a MIXTURE of infrastructure sub-bands (archetypes
// by PSA/LMO signature). For each band we predict every present sub-band's
// profile (signature-filtered k-NN at the band's typical size), cost it, weight
// by the sub-band's share, scale by the facility count, and roll everything up.
import type {
  BandProfile,
  BandResult,
  CostGroup,
  CostHead,
  StateInputs,
  StateRates,
  StateResult,
  StateResultConfidence,
  SubBandResult,
} from './types'
import { BAND_KEYS, confidenceLevel } from './types'
import { predictProfile, signatureShares, SIGNATURES } from './model'
import { STATE_FACILITIES, BED_RANGE, bandLabel, defaultBandBeds } from './data'

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

function nearest(map: Record<string, number>, n: number): number {
  const keys = Object.keys(map)
  if (keys.length === 0) return 0
  let best = keys[0]
  for (const k of keys) {
    if (Math.abs(Number(k) - n) < Math.abs(Number(best) - n)) best = k
  }
  return map[best]
}

/** Expected annual cost of every expense head for ONE facility of a profile. */
export function facilityHeads(p: BandProfile, r: StateRates): CostHead[] {
  const psaAsset = nearest(r.psaAssetByCapacity, p.psaCapacityLpm)
  const psaPower = nearest(r.psaPowerByCapacity, p.psaCapacityLpm)
  const lmoAsset = nearest(r.lmoAssetByKl, p.lmoCapacityKl)
  const annualRefills = (p.cylDRefillsMo + p.cylBRefillsMo + p.cylARefillsMo) * MONTHS
  const totalCyl = p.cylDCount + p.cylBCount + p.cylACount
  const trainInitial =
    p.doctors * r.trainDoctor + p.nurses * r.trainNurse + p.paramedics * r.trainParamedic

  return [
    { key: 'elec_psa', label: 'Electricity — PSA plants', group: 'psa', annual: p.psaProb * p.psaPlants * p.psaProdHrsPerDay * DAYS * psaPower * r.electricityTariff },
    { key: 'elec_oc', label: 'Electricity — Oxygen concentrators', group: 'oc', annual: p.ocProb * p.ocDeployed * p.ocHrsPerDay * DAYS * r.ocPowerKwh * r.electricityTariff },
    { key: 'lmo_refill', label: 'LMO refilling charges', group: 'lmo', annual: p.lmoProb * p.lmoAnnualKl * 1000 * r.lmoRatePerKg },
    { key: 'cyl_refill_d', label: 'Cylinder refilling — D-type', group: 'cylinder', annual: p.cylProb * p.cylDRefillsMo * MONTHS * r.cylRefillD },
    { key: 'cyl_refill_b', label: 'Cylinder refilling — B-type', group: 'cylinder', annual: p.cylProb * p.cylBRefillsMo * MONTHS * r.cylRefillB },
    { key: 'cyl_refill_a', label: 'Cylinder refilling — A-type', group: 'cylinder', annual: p.cylProb * p.cylARefillsMo * MONTHS * r.cylRefillA },
    { key: 'cyl_transport', label: 'Cylinder transport', group: 'cylinder', annual: r.cylPerTrip > 0 ? p.cylProb * (annualRefills / r.cylPerTrip) * r.cylTransportPerTrip : 0 },
    { key: 'amc_psa', label: 'AMC/CAMC — PSA plants', group: 'psa', annual: p.psaProb * p.psaPlants * psaAsset * r.psaCamcPct },
    { key: 'amc_lmo', label: 'AMC — LMO tanks', group: 'lmo', annual: p.lmoProb * p.lmoTanks * lmoAsset * r.lmoAmcPct },
    { key: 'amc_mgps', label: 'AMC — MGPS / pipeline', group: 'mgps', annual: p.mgpsProb * p.mgpsBhu * r.mgpsAssetPerBhu * r.mgpsAmcPct },
    { key: 'amc_oc', label: 'AMC — Oxygen concentrators', group: 'oc', annual: p.ocProb * p.ocDeployed * r.ocAsset * r.ocAmcPct },
    { key: 'amc_oxi', label: 'AMC — Pulse oximeters (bedside)', group: 'oximeter', annual: p.bedside * r.oxiBedsideAsset * r.oxiBedsideAmcPct },
    { key: 'repairs_psa', label: 'Ad hoc repairs — PSA plants', group: 'psa', annual: p.psaProb * p.psaPlants * psaAsset * r.psaRepairPct },
    { key: 'repairs_mgps', label: 'Ad hoc repairs — MGPS & other', group: 'mgps', annual: p.mgpsProb * p.mgpsBhu * r.mgpsAssetPerBhu * r.mgpsRepairPct },
    { key: 'consum_oc', label: 'Consumables — concentrator filters', group: 'oc', annual: p.ocProb * p.ocDeployed * r.ocFilterPerYear },
    { key: 'consum_oxi', label: 'Consumables — oximeter probes/batteries', group: 'oximeter', annual: p.fingertip * r.oxiFingertipPerYear + p.bedside * r.oxiBedsideProbePerYear },
    { key: 'hydrotest', label: 'Cylinder hydrostatic testing (amortised)', group: 'cylinder', annual: (p.cylProb * totalCyl * r.cylHydrotest) / 5 },
    { key: 'hr_govt', label: 'HR — Government PSA/oxygen technicians', group: 'hr', annual: p.techProb * p.techs * r.govtTechShare * r.salaryGovtTech * MONTHS },
    { key: 'hr_contract', label: 'HR — Contractual PSA/oxygen technicians', group: 'hr', annual: p.techProb * p.techs * (1 - r.govtTechShare) * r.salaryContractTech * MONTHS },
    { key: 'train_initial', label: 'Training — initial (clinical staff)', group: 'training', oneTime: true, annual: trainInitial },
    { key: 'train_refresher', label: 'Training — refresher (clinical, annualised)', group: 'training', annual: r.refresherEveryYears > 0 ? (trainInitial * r.refresherPct) / r.refresherEveryYears : 0 },
    { key: 'train_psa_tech', label: 'Training — PSA technicians (technical, initial)', group: 'training', oneTime: true, annual: p.techProb * p.techs * r.trainPsaTech },
    { key: 'iec', label: 'IEC and printing', group: 'iec', annual: r.iec[p.iecTier] ?? 0 },
  ]
}

export function computeStateCost(input: StateInputs): StateResult {
  const { stateName, counts, beds, subShares, overrides, rates } = input

  const acc = new Map<string, CostHead>()
  let headOrder: string[] | null = null
  const byBand: BandResult[] = []
  let totalFuncBeds = 0
  let totalFacilities = 0

  for (const band of BAND_KEYS) {
    const count = counts[band] ?? 0
    const bd = beds[band] ?? defaultBandBeds(band)
    const raw = subShares[band] ?? signatureShares(bd, stateName, STATE_FACILITIES)
    const sum = raw.reduce((a, b) => a + b, 0) || 1
    const shares = raw.map((s) => Math.max(0, s) / sum)

    const subBands: SubBandResult[] = []
    let perFacilityAnnual = 0
    let bandFuncBeds = 0
    let confAcc = 0
    let confW = 0

    // User overrides apply to every sub-band, but never the PSA/LMO presence —
    // that is the sub-band's defining signature (governed by the mix above).
    const ov = { ...(overrides[band] ?? {}) }
    delete ov.psaProb
    delete ov.lmoProb

    SIGNATURES.forEach((sig, i) => {
      const share = shares[i]
      if (share < 0.005) return
      const base = predictProfile(band, bandLabel(band), bd, stateName, STATE_FACILITIES, BED_RANGE, sig)
      const prof = { ...base, ...ov }
      const heads = facilityHeads(prof, rates)
      if (!headOrder) headOrder = heads.map((h) => h.key)
      const facCost = heads.reduce((s, x) => s + x.annual, 0)
      perFacilityAnnual += share * facCost
      bandFuncBeds += share * prof.funcBeds
      confAcc += share * prof.confidence
      confW += share
      const subCount = count * share
      if (count > 0) {
        for (const x of heads) {
          const add = x.annual * subCount
          const cur = acc.get(x.key)
          if (cur) cur.annual += add
          else acc.set(x.key, { ...x, annual: add })
        }
      }
      subBands.push({ key: sig.key, label: sig.label, share, count: subCount, profile: prof })
    })

    if (count > 0) {
      totalFuncBeds += count * bandFuncBeds
      totalFacilities += count
    }
    byBand.push({
      band,
      label: bandLabel(band),
      count,
      perFacilityAnnual,
      bandAnnual: perFacilityAnnual * count,
      funcBeds: Math.round(bandFuncBeds),
      confidence: Math.round(confW > 0 ? confAcc / confW : 0),
      subBands,
    })
  }

  const order = headOrder ?? []
  const heads = order.map((k) => acc.get(k)).filter((x): x is CostHead => !!x)

  const subtotal = heads.reduce((s, x) => s + x.annual, 0)
  const contingency = subtotal * rates.contingencyPct
  const total = subtotal + contingency
  const scale = subtotal > 0 ? total / subtotal : 1
  const oneTimeSubtotal = heads.filter((x) => x.oneTime).reduce((s, x) => s + x.annual, 0)
  const oneTimeTotal = oneTimeSubtotal * scale
  const recurringTotal = total - oneTimeTotal

  const groupMap = new Map<CostGroup, number>()
  for (const x of heads) groupMap.set(x.group, (groupMap.get(x.group) ?? 0) + x.annual)
  const byGroup = [...groupMap.entries()]
    .map(([group, annual]) => ({ group, label: GROUP_LABEL[group], annual }))
    .sort((a, b) => b.annual - a.annual)

  for (const b of byBand) b.bandAnnual *= scale

  // Overall confidence: cost-weighted band confidence, damped by norm-based share.
  const NORM_GROUPS = new Set<CostGroup>(['oximeter', 'training', 'iec'])
  const normSubtotal = heads.filter((h) => NORM_GROUPS.has(h.group)).reduce((s, h) => s + h.annual, 0)
  const normShare = subtotal > 0 ? normSubtotal / subtotal : 0
  let wConf = 0
  let wSum = 0
  for (const b of byBand) {
    if (b.count <= 0 || b.bandAnnual <= 0) continue
    wConf += b.confidence * b.bandAnnual
    wSum += b.bandAnnual
  }
  const predConf = wSum > 0 ? wConf / wSum : 0
  const score = Math.round(predConf * (1 - 0.4 * normShare))
  const level = confidenceLevel(score)
  const confidence: StateResultConfidence = {
    score,
    level,
    normShare,
    note:
      wSum === 0
        ? 'Enter facility counts to estimate confidence.'
        : `${level} confidence: predictions lean on the most similar ${stateName} facilities (split by infrastructure type), so states with fewer surveyed facilities score lower; ${Math.round(
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
