// Shows where the user's entered band sizes land among the real survey
// facilities — a strip plot of oxygen-bed sizes with a marker per band. Dense
// clusters = well-supported (high confidence); a marker out in a sparse tail =
// an extrapolation the model is less sure about.
import {
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type { BandKey, BandProfile, FacilityVector } from '../state-engine'

export const BAND_COLOR: Record<BandKey, string> = {
  '<10': '#b5852a',
  '10-29': '#2b8a3e',
  '30-59': '#1597a8',
  '60+': '#7048a8',
}

interface Props {
  facilities: FacilityVector[]
  profiles: BandProfile[]
  counts: Record<BandKey, number>
  stateName: string
}

export function BedDistribution({ facilities, profiles, counts, stateName }: Props) {
  const inState =
    stateName && stateName !== 'All states'
      ? facilities.filter((f) => f.state === stateName)
      : facilities
  const pool = inState.length >= 8 ? inState : facilities

  const points = pool.map((f, i) => ({ beds: f.oxBeds, y: (i % 9) - 4, state: f.state }))
  const maxBeds = Math.max(...pool.map((f) => f.oxBeds), ...profiles.map((p) => p.oxBeds), 60)

  return (
    <div className="bed-dist">
      <div className="bed-dist-head">
        Where your sizes land in the data
        <span className="small muted">
          {' '}
          — each dot is a surveyed facility{stateName !== 'All states' ? ` in ${stateName}` : ''};
          lines mark your bands. Dots clustered around a line ⇒ the estimate is
          well-supported.
        </span>
      </div>
      <div style={{ width: '100%', height: 130 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
            <XAxis
              type="number"
              dataKey="beds"
              domain={[0, Math.ceil(maxBeds / 20) * 20]}
              tickFormatter={(v) => String(v)}
              fontSize={10}
              tickMargin={4}
            >
            </XAxis>
            <YAxis type="number" dataKey="y" hide domain={[-6, 6]} />
            <ZAxis range={[26, 26]} />
            <RTooltip
              cursor={false}
              formatter={(v: number, n: string) => (n === 'beds' ? [`${v} oxygen beds`, 'Facility'] : null)}
              labelFormatter={() => ''}
            />
            <Scatter data={points} fill="#9aa8ae" fillOpacity={0.55} />
            {profiles.map((p) =>
              (counts[p.band] || 0) > 0 ? (
                <ReferenceLine
                  key={p.band}
                  x={p.oxBeds}
                  stroke={BAND_COLOR[p.band]}
                  strokeWidth={2}
                  label={{
                    value: `${p.label.split(' (')[0]} (${p.oxBeds})`,
                    position: 'top',
                    fontSize: 9,
                    fill: BAND_COLOR[p.band],
                  }}
                />
              ) : null,
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="bed-dist-axis small muted">oxygen beds per facility →</div>
    </div>
  )
}
