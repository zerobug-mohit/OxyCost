// Stacked horizontal bar of monthly cost composition per source (spec 9b).
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ComparisonResult } from '../../engine'
import { formatINR } from '../../utils/format'

const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

interface Props {
  result: ComparisonResult
}

export function CostBreakdownChart({ result }: Props) {
  // Collect the union of component labels across all sources for stable series.
  const labels: string[] = []
  for (const s of result.sources) {
    for (const c of s.components) {
      if (!labels.includes(c.label)) labels.push(c.label)
    }
  }

  // One datum per source: { name, [label]: amount, ... }.
  const data = result.sources.map((s) => {
    const row: Record<string, number | string> = { name: s.label }
    for (const label of labels) {
      const comp = s.components.find((c) => c.label === label)
      row[label] = comp ? Math.round(comp.amount) : 0
    }
    return row
  })

  if (data.length === 0) return null

  return (
    <div
      className="chart-block"
      style={{
        width: '100%',
        height: Math.max(190, 64 * data.length + 30 + 22 * Math.ceil(labels.length / 2)),
      }}
    >
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f4" />
          <XAxis
            type="number"
            tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`}
            fontSize={11}
            tickMargin={4}
          />
          <YAxis type="category" dataKey="name" width={150} fontSize={11} />
          <RTooltip
            formatter={(value: number, name: string) => [formatINR(value, 0), name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font)', paddingTop: 8 }}
          />
          {labels.map((label, i) => (
            <Bar
              key={label}
              dataKey={label}
              stackId="cost"
              fill={PALETTE[i % PALETTE.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
