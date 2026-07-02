// Similarity + mixture model for the district/state planner.
//
// Two ideas work together:
//  1) DISTANCE-WEIGHTED k-NN (kernel / local regression): every survey facility
//     contributes with a weight that decays with how different its oxygen-bed
//     size is (log scale), so nearby facilities dominate and outliers fade.
//     Same-state facilities are weighted up.
//  2) SUB-BANDS (a mixture): within a size band, facilities are not identical —
//     the biggest cost split is their infrastructure signature (PSA / LMO). We
//     model each band as a MIX of up to four archetypes and predict each one by
//     restricting the k-NN to facilities of that signature. The share of each
//     archetype is data-derived and user-tunable — the main accuracy lever.
//
// Why k-NN + mixture and not a heavier model: with ~81 usable facilities an
// instance-based estimator is robust, interpretable and avoids overfitting, and
// the mixture captures the real heterogeneity inside a band. Quantities the
// survey couldn't measure (PSA run-hours) or didn't capture (oximeters, staff,
// boosters) use documented size-scaled norms.
import type { BandKey, BandProfile, FacilityVector, Signature } from './types'

const BANDWIDTH = 0.5
const MIN_POOL = 5 // below this, a signature-filtered pool falls back to all
// Distance added (in log-bed units) to facilities in a different state, so the
// selected state's facilities dominate the estimate; other states only fill in
// when the selected state has no similar facility. exp(-(0.8/0.5)^2) ≈ 0.08.
const OTHER_STATE_PENALTY = 0.8

/** The four infrastructure archetypes, ordered most→least equipped. */
export const SIGNATURES: Signature[] = [
  { key: 'psa_lmo', label: 'PSA + LMO', psa: 1, lmo: 1 },
  { key: 'psa', label: 'PSA (no LMO)', psa: 1, lmo: 0 },
  { key: 'lmo', label: 'LMO (no PSA)', psa: 0, lmo: 1 },
  { key: 'none', label: 'Cylinders / concentrators', psa: 0, lmo: 0 },
]

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
function snapCap(cap: number): number {
  return [500, 1000, 2000].reduce((b, s) => (Math.abs(s - cap) < Math.abs(b - cap) ? s : b))
}

interface Weighted {
  f: FacilityVector
  w: number
}

function weights(beds: number, stateName: string, facilities: FacilityVector[]): Weighted[] {
  const realState = stateName && stateName !== 'All states'
  const lb = Math.log(Math.max(1, beds) + 1)
  return facilities.map((f) => {
    let d = Math.abs(Math.log(f.oxBeds + 1) - lb)
    if (realState && f.state !== stateName) d += OTHER_STATE_PENALTY // down-weight other states
    return { f, w: Math.exp(-((d / BANDWIDTH) ** 2)) }
  })
}

function wProb(ws: Weighted[], sel: (f: FacilityVector) => number): number {
  let num = 0
  let den = 0
  for (const { f, w } of ws) {
    num += w * sel(f)
    den += w
  }
  return den > 0 ? num / den : 0
}

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
 * Data-derived mix of the four archetypes for a facility of `beds` in `state` —
 * the kernel-weighted share of similar facilities in each signature.
 */
export function signatureShares(
  beds: number,
  stateName: string,
  facilities: FacilityVector[],
): number[] {
  const ws = weights(beds, stateName, facilities)
  const den = ws.reduce((s, x) => s + x.w, 0) || 1
  return SIGNATURES.map((sig) => {
    const num = ws.reduce((s, { f, w }) => s + (f.psa === sig.psa && f.lmo === sig.lmo ? w : 0), 0)
    return num / den
  })
}

/**
 * Predict a facility archetype at (`beds`, `stateName`). If a `signature` is
 * given, the estimate is restricted to facilities of that infrastructure type
 * (PSA/LMO presence is then definitional); otherwise it is the band average.
 */
export function predictProfile(
  band: BandKey,
  label: string,
  beds: number,
  stateName: string,
  facilities: FacilityVector[],
  bedRange: { min: number; max: number },
  signature?: Signature,
): BandProfile {
  // Signature-filtered pool (fall back to all facilities if too sparse).
  let pool = facilities
  let sparse = false
  if (signature) {
    const filtered = facilities.filter((f) => f.psa === signature.psa && f.lmo === signature.lmo)
    if (filtered.length >= MIN_POOL) pool = filtered
    else {
      sparse = true
      pool = filtered.length ? filtered : facilities
    }
  }
  const ws = weights(beds, stateName, pool)

  const psaProb = signature ? signature.psa : round2(wProb(ws, (f) => f.psa))
  const lmoProb = signature ? signature.lmo : round2(wProb(ws, (f) => f.lmo))
  const cylProb = round2(wProb(ws, (f) => f.cyl))
  const ocProb = round2(wProb(ws, (f) => f.oc))
  const mgpsProb = round2(wProb(ws, (f) => f.mgps))
  const techProb = round2(wProb(ws, (f) => (f.techs > 0 ? 1 : 0)))

  const funcBeds =
    Math.round(wMedian(ws, (f) => f.funcBeds, (f) => f.funcBeds, beds * 3)) || Math.round(beds)
  const psaCap = snapCap(wMedian(ws, (f) => f.psa, (f) => f.psaCapacityLpm, 500))
  const lmoKl = beds >= 60 ? 10 : 5
  const lmoTanks = Math.round(wMedian(ws, (f) => f.lmo, (f) => f.lmoTanks, 1)) || 1
  const prodHrs = Math.round(clamp(6 + (beds / 150) * 8, 6, 16))
  const bhu = Math.round(clamp(wMedian(ws, (f) => f.mgps, (f) => f.bhu, 0), 0, funcBeds * 1.5))
  const norm = (rate: number, floor: number) => Math.max(floor, Math.round(beds * rate))

  const profile: BandProfile = {
    band,
    label,
    n: pool.length,
    oxBeds: Math.round(beds),
    totalBeds: funcBeds,
    funcBeds,
    iecTier: beds >= 60 ? 'large' : beds >= 30 ? 'mid' : 'small',
    psaProb,
    psaPlants: Math.round(wMedian(ws, (f) => f.psa, (f) => f.psaPlants, 1)) || 1,
    psaCapacityLpm: psaCap,
    psaProdHrsPerDay: prodHrs,
    lmoProb,
    lmoTanks,
    lmoCapacityKl: lmoKl,
    lmoAnnualKl: lmoTanks * lmoKl * 12,
    cylProb,
    cylDCount: Math.round(wMedian(ws, (f) => f.cyl, (f) => f.cylCount, 0)),
    cylBCount: 0,
    cylACount: 0,
    cylDRefillsMo: Math.round(wMedian(ws, (f) => f.cyl, (f) => f.cylDRefillsMo, 0)),
    cylBRefillsMo: Math.round(wMedian(ws, (f) => f.cyl, (f) => f.cylBRefillsMo, 0)),
    cylARefillsMo: Math.round(wMedian(ws, (f) => f.cyl, (f) => f.cylARefillsMo, 0)),
    ocProb,
    ocDeployed: Math.round(wMedian(ws, (f) => f.oc, (f) => f.ocDeployed, 0)),
    ocHrsPerDay: 6,
    mgpsProb,
    mgpsBhu: bhu,
    techProb,
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

  // Confidence: SAME-STATE effective neighbours (so confidence honestly reflects
  // the selected state's own sample), presence decisiveness, extrapolation.
  const realState = stateName && stateName !== 'All states'
  const stateWs = realState ? ws.filter((x) => x.f.state === stateName) : ws
  const sumW = stateWs.reduce((s, x) => s + x.w, 0)
  const sumW2 = stateWs.reduce((s, x) => s + x.w * x.w, 0)
  const nEff = sumW2 > 0 ? (sumW * sumW) / sumW2 : 0
  let sampleFactor = nEff >= 12 ? 1 : nEff >= 6 ? 0.85 : nEff >= 3 ? 0.65 : 0.45
  if (sparse) sampleFactor *= 0.7 // signature had too few facilities of its own
  const decisive = avg([psaProb, lmoProb, ocProb, mgpsProb].map((p) => Math.abs(p - 0.5) * 2))
  const decisiveFactor = 0.7 + 0.3 * decisive
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
