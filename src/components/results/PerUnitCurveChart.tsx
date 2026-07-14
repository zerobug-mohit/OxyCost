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
} from 'recharts'
import { costCurves, priorityOrder } from '../../engine'
import type {
  ComparisonResult,
  CostView,
  EngineInputs,
  SourceResult,
} from '../../engine'
import { instanceColor } from '../shared/sourceColors'
import { formatINR, formatNumber, formatRate } from '../../utils/format'
import { buildVolumes } from './insights'
import { PriorityBadgeIcon, RingedDotIcon } from './CurveMarkers'

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

  // Fixed, clean X domain from 0 to a rounded maximum that covers the sampled
  // curve range, the demand marker and every source's current output. A fixed
  // domain (rather than dataMin/dataMax + extendDomain on the dots) keeps the
  // axis ticks round and stops a small operating point from distorting the plot.
  const axisCeil = Math.max(
    volumes.length ? volumes[volumes.length - 1] : 0,
    demand,
    ...operatingOutputs(result),
  )
  const { axisMax, ticks: xTicks } = niceAxis(axisCeil)

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

  // Priority / fallback order to meet demand — numbered markers placed where
  // each source meets demand (or, for a capacity-limited source, at the end of
  // its reach). Mirrors the order called out in the insight and recommendation.
  const priority = priorityOrder(inputs, result.sources, costView, demand)
  const priorityMarks = priority
    .map((p) => {
      const x = p.meetsDemand
        ? demand
        : Number.isFinite(p.capacity)
          ? p.capacity
          : demand
      const color = instanceColor(p.source, p.index)
      return { rank: p.rank, x, y: p.cost, color, meetsDemand: p.meetsDemand }
    })
    .filter((m) => Number.isFinite(m.x) && Number.isFinite(m.y) && m.x > 0)

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

  const hasPartial = priorityMarks.some((m) => !m.meetsDemand)

  return (
    <>
    {/* Custom HTML legend above the plot — wraps cleanly on narrow widths and
        never overlaps the chart (the built-in Recharts legend did). */}
    <div className="curve-legend">
      {series.map((s) => (
        <button
          key={s.id}
          type="button"
          className="curve-legend-item"
          onClick={onSelect ? () => onSelect(s.id) : undefined}
          style={{ cursor: onSelect ? 'pointer' : 'default' }}
        >
          <span
            className="curve-legend-swatch"
            style={{ background: instanceColor(s.source, s.index) }}
          />
          {labelFor(s.id)}
        </button>
      ))}
    </div>
    <div className="chart-block" style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f4" />
          <XAxis
            dataKey="volume"
            type="number"
            domain={[0, axisMax]}
            ticks={xTicks}
            allowDataOverflow={false}
            tickFormatter={(v) => formatNumber(Number(v))}
            fontSize={11}
            tickMargin={6}
            minTickGap={20}
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
              ifOverflow="discard"
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
          {/* Priority / fallback order: numbered badges at each source's demand
              crossing (or capacity limit). Lower rank = first choice. */}
          {priorityMarks.map((m) => (
            <ReferenceDot
              key={`rank-${m.rank}`}
              x={m.x}
              y={m.y}
              ifOverflow="discard"
              shape={(props: { cx?: number; cy?: number }) => (
                <g transform={`translate(${props.cx ?? 0}, ${(props.cy ?? 0) - 16})`}>
                  <circle
                    r={9}
                    fill={m.meetsDemand ? m.color : '#fff'}
                    stroke={m.color}
                    strokeWidth={2}
                    strokeDasharray={m.meetsDemand ? undefined : '3 2'}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={700}
                    fill={m.meetsDemand ? '#fff' : m.color}
                  >
                    {m.rank}
                  </text>
                </g>
              )}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>

    {(operating.length > 0 || priorityMarks.length > 0) && (
      <div className="curve-key">
        {operating.length > 0 && (
          <span className="curve-key-item">
            <RingedDotIcon /> Ringed dot — operates now
          </span>
        )}
        {priorityMarks.length > 0 && (
          <span className="curve-key-item">
            <PriorityBadgeIcon rank={1} /> Numbered badge — priority order to meet demand
          </span>
        )}
        {hasPartial && (
          <span className="curve-key-item">
            <PriorityBadgeIcon rank={3} partial /> Dashed badge — covers only part of demand
          </span>
        )}
      </div>
    )}

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
    </>
  )
}

function seriesLabel(
  series: { id: string; label: string }[],
  key: string,
): string {
  return series.find((s) => s.id === key)?.label ?? key
}

/** Each source's current monthly output (cu m), for sizing the X domain. */
function operatingOutputs(result: ComparisonResult): number[] {
  return result.sources
    .map((s) => s.monthly_output_cu_m)
    .filter((v) => Number.isFinite(v) && v > 0)
}

/**
 * A clean numeric axis [0, axisMax] with ~5 round ticks covering `max`.
 * Snaps the step to a 1 / 2 / 2.5 / 5 / 10 × 10ⁿ value so labels read nicely.
 */
function niceAxis(max: number): { axisMax: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) {
    return { axisMax: 1000, ticks: [0, 250, 500, 750, 1000] }
  }
  const target = 5
  const rawStep = max / target
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  const niceStep =
    (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const axisMax = Math.ceil(max / niceStep) * niceStep
  const ticks: number[] = []
  for (let t = 0; t <= axisMax + niceStep * 1e-6; t += niceStep) {
    ticks.push(Math.round(t))
  }
  return { axisMax, ticks }
}
