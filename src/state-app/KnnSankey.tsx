// A Sankey diagram of the district/state model flow: how the survey's per-state
// samples feed the k-NN, which resolves each facility into infrastructure
// sub-bands that roll up into the annual budget. Flow widths are real —
// state→model links carry each state's facility count; model→sub-band and
// sub-band→budget links carry each archetype's prevalence in the survey.
import { ResponsiveContainer, Sankey, Tooltip as RTooltip } from 'recharts'
import { STATE_FACILITIES, STATE_META, SIGNATURES } from '../state-engine'

const SIG_COLOR: Record<string, string> = {
  psa_lmo: '#0f7c8b',
  psa: '#1597a8',
  lmo: '#2b8a3e',
  none: '#b5852a',
}

function buildData() {
  const states = Object.entries(STATE_META.states).sort((a, b) => b[1].n - a[1].n)
  // Archetype (signature) counts across the survey.
  const sigCounts = SIGNATURES.map(
    (s) => STATE_FACILITIES.filter((f) => f.psa === s.psa && f.lmo === s.lmo).length,
  )

  const nodes: { name: string }[] = []
  const idx: Record<string, number> = {}
  const add = (name: string) => {
    idx[name] = nodes.length
    nodes.push({ name })
    return idx[name]
  }

  states.forEach(([s, v]) => add(`${s} (${v.n})`))
  const model = add('k-NN by size + state')
  SIGNATURES.forEach((s) => add(s.label))
  const budget = add('Annual budget')

  const links: { source: number; target: number; value: number }[] = []
  states.forEach(([, v], i) => links.push({ source: i, target: model, value: v.n }))
  SIGNATURES.forEach((s, i) => {
    const n = Math.max(1, sigCounts[i])
    links.push({ source: model, target: idx[s.label], value: n })
    links.push({ source: idx[s.label], target: budget, value: n })
  })
  return { nodes, links }
}

const DATA = buildData()

export function KnnSankey() {
  return (
    <div className="knn-sankey">
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <Sankey
            data={DATA}
            nodePadding={22}
            nodeWidth={12}
            margin={{ top: 10, right: 130, bottom: 10, left: 90 }}
            link={{ stroke: '#c9d6da', strokeOpacity: 0.5 }}
            node={<SankeyNode />}
          >
            <RTooltip />
          </Sankey>
        </ResponsiveContainer>
      </div>
      <p className="muted small">
        Survey facilities (by state) feed the k-NN model, which resolves each facility of a
        given size into its likely infrastructure type; those roll up into the annual
        budget. Link widths are the real state sample sizes and how common each type is.
      </p>
    </div>
  )
}

interface NodeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
  payload?: { name: string }
}

function SankeyNode({ x = 0, y = 0, width = 0, height = 0, index = 0, payload }: NodeProps) {
  const name = payload?.name ?? ''
  // Colour sub-band nodes by archetype; others neutral teal.
  const sig = SIGNATURES.find((s) => s.label === name)
  const fill = sig ? SIG_COLOR[sig.key] : name.startsWith('k-NN') ? '#233139' : name.startsWith('Annual') ? '#1f7a32' : '#6a7b83'
  // Right-most column (budget) labels to the left; left column to the right.
  const isLeft = index < Object.keys(STATE_META.states).length
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
      <text
        x={isLeft ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isLeft ? 'end' : 'start'}
        dominantBaseline="central"
        fontSize={10.5}
        fill="#233139"
      >
        {name}
      </text>
    </g>
  )
}
