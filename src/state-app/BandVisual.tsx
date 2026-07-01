// Compact visual describing a band's predicted archetype: how likely each
// source is (bars) and the typical equipment it carries — so a user can grasp
// what "a facility of this size" looks like in the data without reading numbers.
import type { BandProfile } from '../state-engine'
import { formatNumber } from '../utils/format'

const SRC_COLOR: Record<string, string> = {
  PSA: '#0f7c8b',
  LMO: '#2b8a3e',
  Cylinders: '#b5852a',
  Concentrators: '#7048a8',
  MGPS: '#1597a8',
}

export function BandPresence({ profile: p }: { profile: BandProfile }) {
  const rows: { label: string; prob: number }[] = [
    { label: 'PSA', prob: p.psaProb },
    { label: 'LMO', prob: p.lmoProb },
    { label: 'Cylinders', prob: p.cylProb },
    { label: 'Concentrators', prob: p.ocProb },
    { label: 'MGPS', prob: p.mgpsProb },
  ]
  return (
    <div className="band-viz">
      <div className="band-viz-title">
        How often facilities this size have each source
        <span className="small muted"> (from the {p.neighbors} most similar surveyed)</span>
      </div>
      <div className="presence-bars">
        {rows.map((r) => (
          <div className="presence-row" key={r.label}>
            <span className="presence-label">{r.label}</span>
            <span className="presence-track">
              <span
                className="presence-fill"
                style={{ width: `${Math.round(r.prob * 100)}%`, background: SRC_COLOR[r.label] }}
              />
            </span>
            <span className="presence-pct">{Math.round(r.prob * 100)}%</span>
          </div>
        ))}
      </div>
      <p className="band-viz-summary small">
        Typical equipment:{' '}
        {p.psaProb >= 0.5 ? `${p.psaPlants}× ${p.psaCapacityLpm} LPM PSA · ` : ''}
        {p.lmoProb >= 0.5 ? `${p.lmoTanks}× ${p.lmoCapacityKl} KL LMO · ` : ''}
        {p.ocDeployed > 0 ? `${formatNumber(p.ocDeployed)} concentrators · ` : ''}
        {p.mgpsBhu > 0 ? `${formatNumber(p.mgpsBhu)} MGPS outlets · ` : ''}
        {formatNumber(p.techs)} technician{p.techs === 1 ? '' : 's'}.
      </p>
    </div>
  )
}
