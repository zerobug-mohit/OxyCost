// Output column for the State / District tab: headline summary, the full Cost
// Output table (all expense heads + subtotal, contingency, total, cost/bed), and
// interactive drill-down charts (by source, by expense head, by bed band).
import { Fragment, useMemo, useState } from 'react'
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
import type { CostGroup, DirectInputs, StateMode, StateRates, StateResult } from '../state-engine'
import { computeStateCost } from '../state-engine'
import { formatINR, formatLakhs, formatNumber } from '../utils/format'
import { ChartSection } from '../components/results/ChartSection'
import { ScenarioViewToggle } from '../components/results/ScenarioBar'
import { InfoBanner } from '../components/shared/InfoBanner'
import { HeadCalc } from './StateHeadCalc'
import type { StateScenario } from './StateScenarioBar'

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
  rates: StateRates
  mode: StateMode
  direct: DirectInputs
  scenarios: StateScenario[]
  /** Show all budget figures per year or per (annual ÷ 12) month. */
  period: BudgetPeriod
  onPeriodChange: (p: BudgetPeriod) => void
}

export type BudgetPeriod = 'year' | 'month'

export function StateOutput({ result, rates, mode, direct, scenarios, period, onPeriodChange }: Props) {
  const [focus, setFocus] = useState<CostGroup | null>(null)
  const perYr = period === 'year'
  const div = perYr ? 1 : 12
  const per = perYr ? 'year' : 'month'
  // Which expense head's inline calculation is expanded (one at a time).
  const [openHead, setOpenHead] = useState<string | null>(null)
  // Each chart can independently show "Now" or a saved scenario (recomputed).
  const [groupView, setGroupView] = useState<string | null>(null)
  const [bandView, setBandView] = useState<string | null>(null)
  const scenarioResult = (id: string | null): StateResult => {
    const sc = id ? scenarios.find((s) => s.id === id) : null
    return sc ? computeStateCost(sc.inputs) : result
  }
  const groupResult = useMemo(() => scenarioResult(groupView), [groupView, scenarios, result])
  const bandResult = useMemo(() => scenarioResult(bandView), [bandView, scenarios, result])
  const toggle = (value: string | null, onChange: (id: string | null) => void) => (
    <ScenarioViewToggle scenarios={scenarios} value={value} onChange={onChange} />
  )

  if (result.totalFacilities === 0) {
    return (
      <InfoBanner kind="info">
        {mode === 'direct'
          ? "Enter your district's equipment totals (left) to see the estimated annual oxygen budget."
          : 'Enter how many facilities your district / state has in each size band (left) to see the estimated annual oxygen budget.'}
      </InfoBanner>
    )
  }

  const { heads, total, subtotal, contingency } = result
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)
  // Percentage relative to whichever result the "Cost by source" chart shows.
  // `v` is period-scaled, so scale the denominator too (ratio is period-invariant).
  const gpct = (v: number) => (groupResult.total > 0 ? (v / (groupResult.total / div)) * 100 : 0)

  // Single-line value label to the right of each bar (never wraps → no overlap).
  const GroupBarLabel = (props: {
    x?: number | string
    y?: number | string
    width?: number | string
    height?: number | string
    value?: number | string
  }) => {
    const x = Number(props.x) || 0
    const y = Number(props.y) || 0
    const width = Number(props.width) || 0
    const height = Number(props.height) || 0
    const value = Number(props.value) || 0
    if (!value) return null
    return (
      <text
        x={x + width + 6}
        y={y + height / 2}
        fontSize={10}
        fill="#233139"
        textAnchor="start"
        dominantBaseline="central"
      >
        {`${formatLakhs(value)} (${gpct(value).toFixed(0)}%)`}
      </text>
    )
  }

  const groupData = groupResult.byGroup.map((g) => ({ ...g, name: g.label, annual: g.annual / div }))
  const bandData = bandResult.byBand
    .filter((b) => b.count > 0)
    .map((b) => ({ name: b.band, label: b.label, annual: b.bandAnnual / div }))

  const shownHeads = focus ? heads.filter((h) => h.group === focus) : heads

  return (
    <>
      {/* ---- Headline summary ---- */}
      <div className="state-summary-head">
        <span className="scenario-toggle" role="group" aria-label="Budget period">
          <button type="button" className={perYr ? 'active' : ''} onClick={() => onPeriodChange('year')}>Yearly</button>
          <button type="button" className={!perYr ? 'active' : ''} onClick={() => onPeriodChange('month')}>Monthly</button>
        </span>
      </div>
      <div className="state-summary">
        <div className="state-stat state-stat-lead">
          <span className="state-stat-label">Estimated {perYr ? 'annual' : 'monthly'} oxygen budget</span>
          <span className="state-stat-value">{formatLakhs(result.total / div)}</span>
          <span className="state-stat-sub">{formatINR(result.total / div, 0)} / {per}</span>
        </div>
        <div className="state-stat">
          <span className="state-stat-label">Recurring / {per}</span>
          <span className="state-stat-value sm">{formatLakhs(result.recurringTotal / div)}</span>
          <span className="state-stat-sub">+ {formatLakhs(result.oneTimeTotal)} one-time</span>
        </div>
        <div className="state-stat">
          <span className="state-stat-label">Cost / functional bed</span>
          <span className="state-stat-value sm">
            {result.costPerFuncBed > 0 ? formatINR(result.costPerFuncBed / div, 0) : '—'}
          </span>
          <span className="state-stat-sub">per {per}</span>
        </div>
      </div>
      <p className="state-conf-note">
        Covering <strong>{formatNumber(result.totalFacilities)}</strong>{' '}
        {result.totalFacilities === 1 ? 'facility' : 'facilities'}
        {result.totalFuncBeds > 0 && ` (~${formatNumber(result.totalFuncBeds)} functional beds in total)`}.
      </p>

      {/* ---- Cost by source (interactive: click to filter the table) ---- */}
      <ChartSection
        title={`Cost by source (per ${per})`}
        tip="Cost grouped by what it is spent on. On the current (Now) view, click a bar to filter the expense table below."
        headerRight={toggle(groupView, setGroupView)}
        howToRead={
          <>
            Each bar is the per-{per} cost of one source/category across all your facilities. Use the
            toggle to compare a saved scenario. On <strong>Now</strong>, <strong>click a bar</strong>{' '}
            to focus the expense table on it; click again to clear.
          </>
        }
        insight={
          groupResult.byGroup.length > 0
            ? `${groupResult.byGroup[0].label} is the largest expense at ${formatLakhs(
                groupResult.byGroup[0].annual / div,
              )}/${per} (${gpct(groupResult.byGroup[0].annual / div).toFixed(0)}% of the budget).`
            : undefined
        }
      >
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={groupData} margin={{ top: 8, right: 132, bottom: 8, left: 8 }} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => formatLakhs(Number(v))} fontSize={11} />
              <YAxis type="category" dataKey="name" width={120} fontSize={11} />
              <RTooltip
                formatter={(v: number) => [`${formatINR(v, 0)} (${gpct(v).toFixed(0)}% of total)`, perYr ? 'Annual' : 'Monthly']}
                cursor={{ fill: '#f0f3f4' }}
              />
              <Bar
                dataKey="annual"
                radius={[0, 3, 3, 0]}
                cursor={groupView ? undefined : 'pointer'}
                onClick={groupView ? undefined : (d: { group?: CostGroup }) => setFocus((f) => (f === d.group ? null : d.group ?? null))}
              >
                {groupData.map((g) => (
                  <Cell
                    key={g.group}
                    fill={GROUP_COLOR[g.group]}
                    opacity={!groupView && focus && focus !== g.group ? 0.35 : 1}
                  />
                ))}
                <LabelList dataKey="annual" content={<GroupBarLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* ---- Full cost-output table ---- */}
      <section className="chart-section">
        <h3 className="chart-section-title">
          Cost estimate (annual &amp; monthly)
          {focus && (
            <button className="btn-reset" style={{ marginLeft: 10 }} onClick={() => setFocus(null)}>
              ✕ clear filter ({GROUP_COLOR[focus] && focus})
            </button>
          )}
        </h3>
        <p className="how-to" style={{ margin: '0 0 10px' }}>
          <span className="mini-badge">Tip</span> Click any expense head to see exactly how it
          is calculated, with each input value linking to where you can change it.
        </p>
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
            {shownHeads.map((h) => {
              const open = openHead === h.key
              return (
                <Fragment key={h.key}>
                  <tr
                    className={`state-head-row${open ? ' open' : ''}`}
                    onClick={() => setOpenHead((cur) => (cur === h.key ? null : h.key))}
                    aria-expanded={open}
                  >
                    <td>
                      <span className="head-caret" aria-hidden>{open ? '▾' : '▸'}</span>
                      <span className="src-dot" style={{ background: GROUP_COLOR[h.group] }} />
                      {h.label}
                      {h.oneTime && <span className="state-onetime"> one-time</span>}
                    </td>
                    <td className="num">{formatINR(h.annual, 0)}</td>
                    <td className="num">{formatINR(h.annual / 12, 0)}</td>
                    <td className="num">{pct(h.annual).toFixed(1)}%</td>
                  </tr>
                  {open && (
                    <tr className="head-calc-tr">
                      <td colSpan={4}>
                        <HeadCalc headKey={h.key} result={result} rates={rates} mode={mode} direct={direct} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
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

      {/* ---- Cost by bed band (shown when the live Now view uses size bands) ---- */}
      {mode === 'estimate' && (
      <ChartSection
        title={`Cost by facility size (bed band) · per ${per}`}
        headerRight={toggle(bandView, setBandView)}
        howToRead={<>How the budget splits across the facility sizes you entered. Toggle to compare a saved scenario.</>}
        insight={
          bandData.length > 0
            ? `${[...bandData].sort((a, b) => b.annual - a.annual)[0].label} facilities carry the most.`
            : undefined
        }
      >
        {bandData.length > 0 ? (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={bandData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <XAxis dataKey="name" fontSize={11} />
                <YAxis tickFormatter={(v) => formatLakhs(Number(v))} fontSize={11} width={64} />
                <RTooltip
                  formatter={(v: number) => [formatINR(v, 0), perYr ? 'Annual' : 'Monthly']}
                  labelFormatter={(l) => bandData.find((b) => b.name === l)?.label ?? String(l)}
                  cursor={{ fill: '#f0f3f4' }}
                />
                <Bar dataKey="annual" fill="#0f7c8b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="small muted">
            This scenario was entered as district-wide totals, so it has no size-band split.
          </p>
        )}
      </ChartSection>
      )}
    </>
  )
}
