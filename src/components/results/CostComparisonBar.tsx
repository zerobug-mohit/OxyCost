// Horizontal bar of per-cu-m cost by source for the active view — a quick
// visual ranking that complements the numeric table.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ComparisonResult, CostView } from '../../engine'
import { instanceColor } from '../shared/sourceColors'

interface ScenarioBars {
  label: string
  color: string
  /** Per-source cost keyed by source label, for the active view. */
  values: Record<string, number>
}

interface Props {
  result: ComparisonResult
  costView: CostView
  onSelect?: (id: string) => void
  /** Frozen scenarios drawn as greyed ghost bars grouped with each source. */
  scenarios?: ScenarioBars[]
}

export function CostComparisonBar({ result, costView, onSelect, scenarios = [] }: Props) {
  const pick = (s: ComparisonResult['sources'][number]) =>
    costView === 'opex_only'
      ? s.per_cu_m_opex_only
      : costView === 'incremental'
        ? s.incremental_cost_per_cu_m
        : s.per_cu_m_capex_opex

  const data = result.sources
    .map((s) => {
      const row: Record<string, number | string> = {
        id: s.id,
        color: instanceColor(s.source, s.index),
        name: s.label,
        value: pick(s),
      }
      scenarios.forEach((sc, i) => {
        const v = sc.values[s.label]
        if (Number.isFinite(v)) row[`sc${i}`] = v
      })
      return row
    })
    .filter((d) => Number.isFinite(d.value as number))
    .sort((a, b) => (a.value as number) - (b.value as number))

  if (data.length === 0) return null

  // Grouped bars need more vertical room per source category.
  const perCat = 26 + scenarios.length * 16
  const height = Math.max(120, (perCat + 26) * data.length + 44)

  return (
    <div className="chart-block">
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f4" />
            <XAxis
              type="number"
              tickFormatter={(v) => `₹${Number(v).toFixed(0)}`}
              fontSize={11}
              tickMargin={4}
            />
            <YAxis type="category" dataKey="name" width={150} fontSize={11} />
            <RTooltip
              cursor={{ fill: 'rgba(15,124,139,0.06)' }}
              formatter={(value: number, name: string) => [
                `₹${value.toFixed(2)}/cu m`,
                name === 'value' ? 'Now' : name,
              ]}
            />
            <Bar
              dataKey="value"
              name="Now"
              radius={[0, 3, 3, 0]}
              maxBarSize={26}
              cursor={onSelect ? 'pointer' : undefined}
              onClick={onSelect ? (d) => onSelect((d as { id: string }).id) : undefined}
            >
              {data.map((d) => (
                <Cell key={d.id as string} fill={d.color as string} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: number) => `₹${v.toFixed(1)}`}
                fontSize={11}
                fill="#233139"
              />
            </Bar>
            {scenarios.map((sc, i) => (
              <Bar
                key={sc.label}
                dataKey={`sc${i}`}
                name={sc.label}
                fill={sc.color}
                fillOpacity={0.85}
                radius={[0, 3, 3, 0]}
                maxBarSize={14}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {scenarios.length > 0 && (
        <p className="small muted" style={{ margin: '2px 0 0' }}>
          Coloured bars are your current inputs; grey bars are frozen scenarios (
          {scenarios.map((s) => s.label).join(', ')}) for the same source.
        </p>
      )}
    </div>
  )
}
