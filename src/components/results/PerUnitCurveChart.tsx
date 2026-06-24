// Per-cu-m cost vs monthly volume — the core decision chart. Each source's
// cost is recomputed across a range of volumes, revealing crossover points
// where one source overtakes another. A dashed line marks current demand, and
// a ringed dot marks where each source actually operates today. Hovering a dot
// opens a callout explaining that point with the source's full cost detail.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { costCurves } from '../../engine'
import type {
  ComparisonResult,
  CostView,
  EngineInputs,
  SourceResult,
} from '../../engine'
import { instanceColor } from '../shared/sourceColors'
import { formatINR, formatNumber, formatRate } from '../../utils/format'
import { buildVolumes } from './insights'

interface Props {
  inputs: EngineInputs
  result: ComparisonResult
  demand: number
  costView: CostView
  onSelect?: (id: string) => void
}

const VIEW_ROWS: { key: CostView; label: string }[] = [
  { key: 'opex_only', label: 'Opex / cu m' },
  { key: 'capex_opex', label: 'Capex+Opex / cu m' },
  { key: 'incremental', label: 'Incremental / cu m' },
]

function pick(s: SourceResult, view: CostView): number {
  return view === 'opex_only'
    ? s.per_cu_m_opex_only
    : view === 'incremental'
      ? s.incremental_cost_per_cu_m
      : s.per_cu_m_capex_opex
}

interface OpPoint {
  id: string
  x: number
  y: number
  color: string
  s: SourceResult
}

interface HoverState {
  op: OpPoint
  left: number
  top: number
}

export function PerUnitCurveChart({ inputs, result, demand, costView, onSelect }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null)

  const volumes = buildVolumes(result, demand)
  const series = costCurves(inputs, costView, volumes)

  const rows = volumes.map((volume) => {
    const row: Record<string, number | null> = { volume }
    for (const s of series) {
      const pt = s.points.find((p) => p.volume === volume)
      row[s.id] = pt ? pt.value : null
    }
    return row
  })

  // Use the comparison result's labels (which include the user identifier, e.g.
  // "Airox · PSA 1000 LPM") so the legend matches the table, bars and insight.
  const labelById = new Map(result.sources.map((s) => [s.id, s.label]))
  const labelFor = (id: string) => labelById.get(id) ?? seriesLabel(series, id)

  const operating: OpPoint[] = result.sources
    .map((s) => ({
      id: s.id,
      x: s.monthly_output_cu_m,
      y: pick(s, costView),
      color: instanceColor(s.source, s.index),
      s,
    }))
    .filter((p) => p.x > 0 && Number.isFinite(p.y))

  function showAt(op: OpPoint, clientX: number, clientY: number) {
    const W = 250
    const H = 210
    let left = clientX + 16
    let top = clientY + 16
    if (left + W > window.innerWidth - 8) left = clientX - W - 16
    if (top + H > window.innerHeight - 8) top = Math.max(8, window.innerHeight - H - 8)
    setHover({ op, left: Math.max(8, left), top: Math.max(8, top) })
  }

  if (series.length === 0) return null

  return (
    <div className="chart-block" style={{ width: '100%', height: 340 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f4" />
          <XAxis
            dataKey="volume"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => formatNumber(Number(v))}
            fontSize={11}
            tickMargin={6}
            minTickGap={28}
          />
          <YAxis
            fontSize={11}
            tickFormatter={(v) => `₹${formatNumber(Number(v))}`}
            width={56}
          />
          <RTooltip
            // Suppress the line tooltip while a dot callout is open, so the two
            // never overlap.
            active={hover ? false : undefined}
            formatter={(value: number, name: string) => [
              `₹${value.toFixed(2)}/cu m`,
              labelFor(name),
            ]}
            labelFormatter={(v) => `${formatNumber(Number(v))} cu m/month`}
          />
          <Legend
            verticalAlign="top"
            align="left"
            height={36}
            wrapperStyle={{
              fontSize: 11,
              fontFamily: 'var(--font)',
              paddingBottom: 14,
              cursor: onSelect ? 'pointer' : 'default',
            }}
            formatter={(name) => labelFor(String(name))}
            onClick={onSelect ? (e) => onSelect(String(e.dataKey)) : undefined}
          />
          <ReferenceLine
            x={demand}
            stroke="#233139"
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{ value: 'demand', position: 'insideTopRight', fontSize: 10, fill: '#6a7b83' }}
          />
          {series.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={instanceColor(s.source, s.index)}
              strokeWidth={2}
              dot={false}
              activeDot={onSelect ? { r: 4, onClick: () => onSelect(s.id) } : { r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
          {/* Current operating point per source, with a hover callout. */}
          {operating.map((op) => (
            <ReferenceDot
              key={op.id}
              x={op.x}
              y={op.y}
              ifOverflow="extendDomain"
              shape={(props: { cx?: number; cy?: number }) => (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={6}
                  fill={op.color}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ cursor: onSelect ? 'pointer' : 'help' }}
                  onMouseEnter={(e) => showAt(op, e.clientX, e.clientY)}
                  onMouseMove={(e) => showAt(op, e.clientX, e.clientY)}
                  onMouseLeave={() => setHover(null)}
                  onClick={onSelect ? () => onSelect(op.id) : undefined}
                />
              )}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {hover &&
        createPortal(
          <div
            className="dot-callout"
            style={{ position: 'fixed', left: hover.left, top: hover.top }}
          >
            <div className="dc-title">
              <span className="src-dot" style={{ background: hover.op.color, margin: 0 }} />
              {hover.op.s.label}
            </div>
            <div className="dc-sub">
              Current operating point — where this source sits today, given your inputs.
            </div>
            <table className="dc-table">
              <tbody>
                <tr>
                  <td>Output now</td>
                  <td>{formatNumber(hover.op.s.monthly_output_cu_m)} cu m/mo</td>
                </tr>
                {VIEW_ROWS.map((r) => (
                  <tr key={r.key} className={r.key === costView ? 'dc-active' : ''}>
                    <td>
                      {r.label}
                      {r.key === costView ? ' ◄' : ''}
                    </td>
                    <td>{formatRate(pick(hover.op.s, r.key))}</td>
                  </tr>
                ))}
                <tr>
                  <td>Monthly total</td>
                  <td>{formatINR(hover.op.s.total_monthly_cost, 0)}</td>
                </tr>
              </tbody>
            </table>
            <div className="dc-foot">
              The ◄ row is the chart&apos;s current view. GST-inclusive.
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function seriesLabel(
  series: { id: string; label: string }[],
  key: string,
): string {
  return series.find((s) => s.id === key)?.label ?? key
}
