// Sub-band composition for one bed band: the mix of infrastructure archetypes
// (PSA+LMO / PSA / LMO / cylinder-based) that facilities of this size split
// into — shown as an editable stacked bar. Retuning the mix is the main
// accuracy lever ("in my district, 3 in 4 large facilities run LMO").
import type { BandProfile, BandResult } from '../state-engine'
import { SIGNATURES } from '../state-engine'
import { formatNumber } from '../utils/format'

const SIG_COLOR: Record<string, string> = {
  psa_lmo: '#0f7c8b',
  psa: '#1597a8',
  lmo: '#2b8a3e',
  none: '#b5852a',
}

function archetypeText(p: BandProfile): string {
  const bits: string[] = []
  if (p.psaProb >= 0.5) bits.push(`${p.psaPlants}× ${p.psaCapacityLpm} LPM PSA`)
  if (p.lmoProb >= 0.5) bits.push(`${p.lmoTanks}× ${p.lmoCapacityKl} KL LMO`)
  if (p.ocDeployed > 0) bits.push(`${formatNumber(p.ocDeployed)} concentrators`)
  if (p.mgpsBhu > 0) bits.push(`${formatNumber(p.mgpsBhu)} MGPS outlets`)
  bits.push(`${formatNumber(p.techs)} tech${p.techs === 1 ? '' : 's'}`)
  return bits.join(' · ')
}

export function BandComposition({
  bandResult,
  onShares,
}: {
  bandResult: BandResult
  onShares: (fractions: number[]) => void
}) {
  const shareByKey = new Map(bandResult.subBands.map((s) => [s.key, s.share]))
  const pct = SIGNATURES.map((s) => Math.round((shareByKey.get(s.key) ?? 0) * 100))
  const total = pct.reduce((a, b) => a + b, 0) || 1

  const setPct = (i: number, val: number) => {
    const next = pct.slice()
    next[i] = Math.max(0, Math.min(100, Math.round(val)))
    onShares(next.map((x) => x / 100))
  }

  return (
    <div className="band-viz">
      <div className="band-viz-title">
        Infrastructure mix — types of facility in this band
        <span className="small muted">
          {' '}
          (share of facilities; predicted from the data, edit to match your district)
        </span>
      </div>
      <div className="mix-bar" role="img" aria-label="Facility infrastructure mix">
        {SIGNATURES.map((s, i) =>
          pct[i] > 0 ? (
            <span
              key={s.key}
              className="mix-seg"
              style={{ width: `${(pct[i] / total) * 100}%`, background: SIG_COLOR[s.key] }}
              title={`${s.label}: ${Math.round((pct[i] / total) * 100)}%`}
            />
          ) : null,
        )}
      </div>
      <div className="mix-rows">
        {SIGNATURES.map((s, i) => (
          <label className="mix-row" key={s.key}>
            <span className="mix-dot" style={{ background: SIG_COLOR[s.key] }} />
            <span className="mix-label">{s.label}</span>
            <span className="mix-input">
              <input
                type="number"
                min={0}
                max={100}
                value={pct[i]}
                onChange={(e) => setPct(i, Number(e.target.value))}
                aria-label={`${s.label} share (%)`}
              />
              <span className="mix-pct-sign">%</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mix-summaries">
        {bandResult.subBands
          .filter((sb) => sb.share >= 0.005)
          .map((sb) => (
            <p className="mix-summary small" key={sb.key}>
              <span className="mix-dot" style={{ background: SIG_COLOR[sb.key] }} />
              <strong>{sb.label}</strong> — {archetypeText(sb.profile)}
            </p>
          ))}
      </div>
    </div>
  )
}
