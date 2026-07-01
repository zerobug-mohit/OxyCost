// Similarity-based model that predicts a facility's likely oxygen infrastructure
// from its oxygen-bed count and state, learned from the 92-facility survey.
//
// It is a DISTANCE-WEIGHTED k-nearest-neighbours estimator (kernel / local
// regression): every survey facility contributes with a weight that decays with
// how different its oxygen-bed size is (on a log scale), so nearby facilities
// dominate and distant ones fade out — which avoids a handful of large outliers
// skewing a small facility's estimate. Same-state facilities are weighted up.
//
// Why this and not a heavier model: with ~81 usable facilities, an instance-
// based estimator is robust and fully interpretable, and avoids overfitting.
// Quantities the survey could not measure reliably (PSA run-hours) or at all
// (oximeters, clinical staff, boosters) fall back to documented size-scaled
// norms. Every predicted value is user-editable.
import type { BandKey, BandProfile, FacilityVector } from './types'

/** Kernel bandwidth in log-bed units (~0.5 ≈ a factor of ~1.65 in beds). */
const BANDWIDTH = 0.5

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function snapCap(cap: number): number {
  return [500, 1000, 2000].reduce((b, s) => (Math.abs(s - cap) < Math.abs(b - cap) ? s : b))
}

interface Weighted {
  f: FacilityVector
  w: number
}

/** Gaussian kernel weight for every facility around a (beds, state) query. */
function weights(beds: number, stateName: string, facilities: FacilityVector[]): Weighted[] {
  const sameState = stateName && stateName !== 'All states'
  const lb = Math.log(Math.max(1, beds) + 1)
  return facilities.map((f) => {
    let d = Math.abs(Math.log(f.oxBeds + 1) - lb)
    if (sameState && f.state === stateName) d *= 0.6 // pull same-state closer
    return { f, w: Math.exp(-((d / BANDWIDTH) ** 2)) }
  })
}

/** Weighted share of facilities where `sel` is 1. */
function wProb(ws: Weighted[], sel: (f: FacilityVector) => number): number {
  let num = 0
  let den = 0
  for (const { f, w } of ws) {
    num += w * sel(f)
    den += w
  }
  return den > 0 ? num / den : 0
}

/** Weighted median of `val` over facilities where `has` and `val` are positive. */
function wMedian(
  ws: Weighted[],
  has: (f: FacilityVector) => number,
  val: (f: FacilityVector) => number,
  fallback: number,
): number {
  const pts = ws
    .filter(({ f }) => has(f) > 0 && val(f) > 0)
    .map(({ f, w }) => ({ v: val(f), w }))
    .sort((a, b) => a.v - b.v)
  const total = pts.reduce((s, p) => s + p.w, 0)
  if (total <= 0) return fallback
  let cum = 0
  for (const p of pts) {
    cum += p.w
    if (cum >= total / 2) return p.v
  }
  return pts[pts.length - 1].v
}

/**
 * Predict the archetype for a facility of `beds` oxygen beds in `stateName`.
 * `band`/`label` are carried for display; everything else is learnt from the
 * kernel-weighted survey (or size-scaled norms where noted).
 */
export function predictProfile(
  band: BandKey,
  label: string,
  beds: number,
  stateName: string,
  facilities: FacilityVector[],
  bedRange: { min: number; max: number },
): BandProfile {
  const ws = weights(beds, stateName, facilities)

  const psaProb = wProb(ws, (f) => f.psa)
  const lmoProb = wProb(ws, (f) => f.lmo)
  const cylProb = wProb(ws, (f) => f.cyl)
  const ocProb = wProb(ws, (f) => f.oc)
  const mgpsProb = wProb(ws, (f) => f.mgps)
  const techProb = wProb(ws, (f) => (f.techs > 0 ? 1 : 0))

  const funcBeds = Math.round(wMedian(ws, (f) => f.funcBeds, (f) => f.funcBeds, beds * 3)) || Math.round(beds)
  const psaCap = snapCap(wMedian(ws, (f) => f.psa, (f) => f.psaCapacityLpm, 500))
  const lmoKl = beds >= 60 ? 10 : 5
  const lmoTanks = Math.round(wMedian(ws, (f) => f.lmo, (f) => f.lmoTanks, 1)) || 1
  const prodHrs = Math.round(clamp(6 + (beds / 150) * 8, 6, 16)) // survey run-hrs unreliable

  // Bed-head units track total beds; clamp the estimate to a bed-plausible
  // ceiling so a sparse outlier can't inflate a small facility.
  const bhu = Math.round(clamp(wMedian(ws, (f) => f.mgps, (f) => f.bhu, 0), 0, funcBeds * 1.5))

  // Size-scaled norms (not surveyed): floors keep small facilities sensible.
  const norm = (rate: number, floor: number) => Math.max(floor, Math.round(beds * rate))

  const profile: BandProfile = {
    band,
    label,
    n: facilities.length,
    oxBeds: Math.round(beds),
    totalBeds: funcBeds,
    funcBeds,
    iecTier: beds >= 60 ? 'large' : beds >= 30 ? 'mid' : 'small',
    psaProb: round2(psaProb),
    psaPlants: Math.round(wMedian(ws, (f) => f.psa, (f) => f.psaPlants, 1)) || 1,
    psaCapacityLpm: psaCap,
    psaProdHrsPerDay: prodHrs,
    lmoProb: round2(lmoProb),
    lmoTanks,
    lmoCapacityKl: lmoKl,
    lmoAnnualKl: lmoTanks * lmoKl * 12,
    cylProb: round2(cylProb),
    cylDCount: Math.round(wMedian(ws, (f) => f.cyl, (f) => f.cylCount, 0)),
    cylBCount: 0,
    cylACount: 0,
    cylDRefillsMo: Math.round(wMedian(ws, (f) => f.cyl, (f) => f.cylDRefillsMo, 0)),
    cylBRefillsMo: Math.round(wMedian(ws, (f) => f.cyl, (f) => f.cylBRefillsMo, 0)),
    cylARefillsMo: Math.round(wMedian(ws, (f) => f.cyl, (f) => f.cylARefillsMo, 0)),
    ocProb: round2(ocProb),
    ocDeployed: Math.round(wMedian(ws, (f) => f.oc, (f) => f.ocDeployed, 0)),
    ocHrsPerDay: 6,
    mgpsProb: round2(mgpsProb),
    mgpsBhu: bhu,
    techProb: round2(techProb),
    techs: Math.round(wMedian(ws, (f) => (f.techs > 0 ? 1 : 0), (f) => f.techs, 1)) || 1,
    fingertip: norm(0.18, 3),
    bedside: norm(0.21, 2),
    doctors: norm(0.32, 4),
    nurses: norm(0.77, 8),
    paramedics: norm(0.45, 6),
    boosters: 0,
    confidence: 0,
    neighbors: 0,
  }

  // --- Confidence ---------------------------------------------------------
  // Effective sample size (Kish): how many facilities really informed this,
  // given the kernel weights — small/rare sizes see fewer effective neighbours.
  const sumW = ws.reduce((s, x) => s + x.w, 0)
  const sumW2 = ws.reduce((s, x) => s + x.w * x.w, 0)
  const nEff = sumW2 > 0 ? (sumW * sumW) / sumW2 : 0
  const sampleFactor = nEff >= 12 ? 1 : nEff >= 6 ? 0.85 : nEff >= 3 ? 0.65 : 0.45
  // Presence probabilities near 0/1 are decisive; ~0.5 is uncertain.
  const decisive = avg([psaProb, lmoProb, ocProb, mgpsProb].map((p) => Math.abs(p - 0.5) * 2))
  const decisiveFactor = 0.7 + 0.3 * decisive
  // Penalise sizes beyond the observed range.
  let extrapFactor = 1
  if (beds > bedRange.max) extrapFactor = clamp(bedRange.max / beds, 0.35, 1)
  else if (beds < bedRange.min) extrapFactor = 0.7
  profile.confidence = Math.round(100 * sampleFactor * decisiveFactor * extrapFactor)
  profile.neighbors = Math.round(nEff)

  return profile
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}
function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
