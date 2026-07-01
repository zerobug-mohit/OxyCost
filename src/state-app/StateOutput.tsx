// Output column for the State / District tab: headline summary, the full Cost
// Output table (all expense heads + subtotal, contingency, total, cost/bed), and
// interactive drill-down charts (by source, by expense head, by bed band).
import { useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CostGroup, StateResult } from '../state-engine'
import { formatINR, formatLakhs, formatNumber } from '../utils/format'
import { ChartSection } from '../components/results/ChartSection'
import { InfoBanner } from '../components/shared/InfoBanner'
import { Tooltip } from '../components/shared/Tooltip'

const GROUP_COLOR: Record<CostGroup, string> = {
  psa: '#0f7c8b',
  lmo: '#2b8a3e',
  cylinder: '#b5852a',
  oc: '#7048a8',
  mgps: '#1597a8',
  oximeter: '#c1352f',
  hr: '#4c6ef5',
  training: '#e8842a',
  iec: '#868e96',
}

interface Props {
  result: StateResult
}

export function StateOutput({ result }: Props) {
  const [focus, setFocus] = useState<CostGroup | null>(null)

  if (result.totalFacilities === 0) {
    return (
      <InfoBanner kind="info">
        Enter how many facilities your district / state has in each oxygen-bed band
        (left) to see the estimated annual oxygen budget.
      </InfoBanner>
    )
  }

  const { heads, byGroup, byBand, total, subtotal, contingency } = result
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)

  const groupData = byGroup.map((g) => ({ ...g, name: g.label }))
  const bandData = byBand
    .filter((b) => b.count > 0)
    .map((b) => ({ name: b.band, label: b.label, annual: b.bandAnnual }))
  const headData = [...heads]
    .filter((h) => h.annual > 0)
    .sort((a, b) => b.annual - a.annual)
    .slice(0, 8)
    .map((h) => ({ name: h.label, annual: h.annual, group: h.group }))

  const shownHeads = focus ? heads.filter((h) => h.group === focus) : heads

  return (
    <>
      {/* ---- Headline summary ---- */}
      <div className="state-summary">
        <div className="state-stat state-stat-lead">
          <span className="state-stat-label">Estimated annual oxygen budget</span>
          <span className="state-stat-value">{formatLakhs(result.total)}</span>
          <span className="state-stat-sub">{formatINR(result.total, 0)} / year</span>
        </div>
        <div className="state-stat">
          <span className="state-stat-label">Recurring / year</span>
          <span className="state-stat-value sm">{formatLakhs(result.recurringTotal)}</span>
          <span className="state-stat-sub">+ {formatLakhs(result.oneTimeTotal)} one-time</span>
        </div>
        <div className="state-stat">
          <span className="state-stat-label">Cost / functional bed</span>
          <span className="state-stat-value sm">{formatINR(result.costPerFuncBed, 0)}</span>
          <span className="state-stat-sub">per year</span>
        </div>
        <div className={`state-stat conf-stat conf-${result.confidence.level.toLowerCase()}`}>
          <span className="state-stat-label">
            Model confidence
            <Tooltip
              text="How well the 92-facility survey supports the cost model for the facility sizes you entered — NOT how many facilities you entered."
              effect="Higher when your sizes sit where the survey has many similar facilities and their equipment patterns are consistent; lower for very large/small sizes with few similar facilities, or where costs rely on norm-based heads (oximeters, training, IEC)."
            />
          </span>
          <span className="state-stat-value sm">
            {result.confidence.level} · {result.confidence.score}
            <span className="state-stat-outof">/100</span>
          </span>
          <span className="state-stat-sub">data support for your sizes</span>
        </div>
      </div>
      <p className="state-conf-note">
        Covering <strong>{formatNumber(result.totalFacilities)}</strong>{' '}
        {result.totalFacilities === 1 ? 'facility' : 'facilities'} (~
        {formatNumber(result.totalFuncBeds)} functional beds in total). {result.confidence.note}
      </p>

      {/* ---- Cost by source (interactive: click to filter the table) ---- */}
      <ChartSection
        title="Cost by source"
        tip="Annual cost grouped by what it is spent on. Click a bar to filter the expense table below to that group."
        howToRead={
          <>
            Each bar is the annual cost of one source/category across all your facilities.{' '}
            <strong>Click a bar</strong> to focus the expense table on it; click again to clear.
          </>
        }
        insight={
          byGroup.length > 0
            ? `${byGroup[0].label} is the largest expense at ${formatLakhs(
                byGroup[0].annual,
              )} (${pct(byGroup[0].annual).toFixed(0)}% of the budget).`
            : undefined
        }
      >
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={groupData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => formatLakhs(Number(v))} fontSize={11} />
              <YAxis type="category" dataKey="name" width={120} fontSize={11} />
              <RTooltip formatter={(v: number) => [formatINR(v, 0), 'Annual']} cursor={{ fill: '#f0f3f4' }} />
              <Bar dataKey="annual" radius={[0, 3, 3, 0]} cursor="pointer" onClick={(d: { group?: CostGroup }) => setFocus((f) => (f === d.group ? null : d.group ?? null))}>
                {groupData.map((g) => (
                  <Cell
                    key={g.group}
                    fill={GROUP_COLOR[g.group]}
                    opacity={focus && focus !== g.group ? 0.35 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* ---- Full cost-output table ---- */}
      <section className="chart-section">
        <h3 className="chart-section-title">
          Annual cost estimate
          {focus && (
            <button className="btn-reset" style={{ marginLeft: 10 }} onClick={() => setFocus(null)}>
              ✕ clear filter ({GROUP_COLOR[focus] && focus})
            </button>
          )}
        </h3>
        <table className="state-table">
          <thead>
            <tr>
              <th>Expense head</th>
              <th className="num">Annual (₹)</th>
              <th className="num">Monthly (₹)</th>
              <th className="num">% of total</th>
            </tr>
          </thead>
          <tbody>
            {shownHeads.map((h) => (
              <tr key={h.key}>
                <td>
                  <span className="src-dot" style={{ background: GROUP_COLOR[h.group] }} />
                  {h.label}
                  {h.oneTime && <span className="state-onetime"> one-time</span>}
                </td>
                <td className="num">{formatINR(h.annual, 0)}</td>
                <td className="num">{formatINR(h.annual / 12, 0)}</td>
                <td className="num">{pct(h.annual).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {!focus && (
              <>
                <tr className="state-subtotal">
                  <td>Sub-total (before contingency)</td>
                  <td className="num">{formatINR(subtotal, 0)}</td>
                  <td className="num">{formatINR(subtotal / 12, 0)}</td>
                  <td className="num" />
                </tr>
                <tr>
                  <td>Contingency ({Math.round(result.total > 0 ? (contingency / subtotal) * 100 : 0)}%)</td>
                  <td className="num">{formatINR(contingency, 0)}</td>
                  <td className="num">{formatINR(contingency / 12, 0)}</td>
                  <td className="num" />
                </tr>
              </>
            )}
            <tr className="state-total">
              <td>{focus ? 'Group total' : 'TOTAL ANNUAL ESTIMATED COST'}</td>
              <td className="num">
                {formatINR(focus ? shownHeads.reduce((s, h) => s + h.annual, 0) : total, 0)}
              </td>
              <td className="num">
                {formatINR((focus ? shownHeads.reduce((s, h) => s + h.annual, 0) : total) / 12, 0)}
              </td>
              <td className="num" />
            </tr>
          </tfoot>
        </table>
        <p className="small muted" style={{ marginTop: 8 }}>
          Estimated annual costs across all entered facilities. One-time (year-1) training
          costs are included in the total and broken out in the summary above.
        </p>
      </section>

      {/* ---- Top expense heads ---- */}
      <ChartSection
        title="Top cost drivers"
        howToRead={<>The largest individual expense heads across your facilities.</>}
        insight={
          headData.length > 0
            ? `${headData[0].name} alone is ${pct(headData[0].annual).toFixed(0)}% of the budget.`
            : undefined
        }
      >
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={headData} layout="vertical" margin={{ top: 8, right: 40, bottom: 8, left: 8 }}>
              <XAxis type="number" tickFormatter={(v) => formatLakhs(Number(v))} fontSize={11} />
              <YAxis type="category" dataKey="name" width={160} fontSize={10} />
              <RTooltip formatter={(v: number) => [formatINR(v, 0), 'Annual']} cursor={{ fill: '#f0f3f4' }} />
              <Bar dataKey="annual" radius={[0, 3, 3, 0]}>
                {headData.map((h, i) => (
                  <Cell key={i} fill={GROUP_COLOR[h.group]} />
                ))}
                <LabelList dataKey="annual" position="right" formatter={(v: number) => formatLakhs(v)} fontSize={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* ---- Cost by bed band ---- */}
      <ChartSection
        title="Cost by facility size (bed band)"
        howToRead={<>How the budget splits across the facility sizes you entered.</>}
        insight={
          bandData.length > 0
            ? `${[...bandData].sort((a, b) => b.annual - a.annual)[0].label} facilities carry the most.`
            : undefined
        }
      >
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={bandData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <XAxis dataKey="name" fontSize={11} />
              <YAxis tickFormatter={(v) => formatLakhs(Number(v))} fontSize={11} width={64} />
              <RTooltip
                formatter={(v: number) => [formatINR(v, 0), 'Annual']}
                labelFormatter={(l) => bandData.find((b) => b.name === l)?.label ?? String(l)}
                cursor={{ fill: '#f0f3f4' }}
              />
              <Bar dataKey="annual" fill="#0f7c8b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>
    </>
  )
}
