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

interface Props {
  result: ComparisonResult
  costView: CostView
  onSelect?: (id: string) => void
}

export function CostComparisonBar({ result, costView, onSelect }: Props) {
  const pick = (s: ComparisonResult['sources'][number]) =>
    costView === 'opex_only'
      ? s.per_cu_m_opex_only
      : costView === 'incremental'
        ? s.incremental_cost_per_cu_m
        : s.per_cu_m_capex_opex

  const data = result.sources
    .map((s) => ({
      id: s.id,
      color: instanceColor(s.source, s.index),
      name: s.label,
      value: pick(s),
    }))
    .filter((d) => Number.isFinite(d.value))
    .sort((a, b) => a.value - b.value)

  if (data.length === 0) return null

  return (
    <div className="chart-block">
      <div style={{ width: '100%', height: Math.max(120, 54 * data.length + 44) }}>
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
              formatter={(value: number) => [`₹${value.toFixed(2)}/cu m`, 'Cost']}
            />
            <Bar
              dataKey="value"
              radius={[0, 3, 3, 0]}
              maxBarSize={26}
              cursor={onSelect ? 'pointer' : undefined}
              onClick={onSelect ? (d) => onSelect((d as { id: string }).id) : undefined}
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: number) => `₹${v.toFixed(1)}`}
                fontSize={11}
                fill="#233139"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
