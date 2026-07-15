// Export the facility calculator to a single-sheet Excel workbook where the
// calculation cells are LIVE formulas referencing the input cells — edit an
// input in Excel and the components, sub-totals and grand total recompute there,
// exactly mirroring the engine. Import reads the same sheet back (by the hidden
// machine-key in column A) to autofill the tool; it reads only the input rows
// (calc rows carry no key), so edits made in the tool OR in Excel round-trip.
//
// Layout (one "OxyCost" sheet): Demand & settings → Shared costs → one block per
// source (its inputs, then its cost components as formulas, sub-total, output and
// per-cu-m) → a final summary matrix totalling every source + shared overhead.
//
// ExcelJS is heavy, so it is dynamically imported only when export/import runs.
import type { Workbook } from 'exceljs'
import { compareAllSources, SHARED_DEFAULTS } from '../engine'
import type { EngineInputs, SourceResult, SourceType } from '../engine'
import { defaultsFor, initialState, resetInstance } from '../state'
import type { AppState } from '../state'
import { resolveDemand } from '../hooks/useCalculation'

// ---------------------------------------------------------------------------
// Field schema
// ---------------------------------------------------------------------------

type Kind = 'number' | 'text' | 'enum'
interface FieldDef {
  key: string
  label: string
  unit?: string
  kind: Kind
  options?: { value: string; label: string }[]
  nullable?: boolean
  scale?: number
  required?: boolean
  money?: boolean
}

const OWNERSHIP = [
  { value: 'purchased', label: 'Purchased' },
  { value: 'rented', label: 'Rented' },
]

const META_FIELDS: FieldDef[] = [
  { key: 'demandMode', label: 'Demand entry mode', kind: 'enum', options: [
    { value: 'direct', label: 'Direct (cu m/month)' },
    { value: 'admissions', label: 'From admissions' },
  ] },
  { key: 'demandDirect', label: 'Monthly demand (direct)', unit: 'cu m/mo', kind: 'number', required: true },
  { key: 'admissionsDemand.month', label: 'Demand month (0=Nov … 11=Oct)', unit: 'idx', kind: 'number' },
  { key: 'admissionsDemand.state', label: 'Demand state', kind: 'text' },
  { key: 'admissionsDemand.facilityType', label: 'Demand facility type', kind: 'text' },
  { key: 'admissionsDemand.ipd', label: 'Avg monthly IPD admissions', unit: '/mo', kind: 'number' },
  { key: 'costView', label: 'Active cost view', kind: 'enum', options: [
    { value: 'opex_only', label: 'Opex only' },
    { value: 'capex_opex', label: 'Capex + Opex' },
    { value: 'incremental', label: 'Incremental' },
  ] },
]

const SHARED_FIELDS: FieldDef[] = [
  { key: 'hr_salary_monthly', label: 'Oxygen technician / HR salary', unit: '₹/mo', kind: 'number', money: true },
  { key: 'other_shared_monthly', label: 'Other shared cost', unit: '₹/mo', kind: 'number', money: true },
  { key: 'mgps_amc_annual', label: 'MGPS AMC (annual, if applicable)', unit: '₹/yr', kind: 'number', money: true },
  { key: 'mgps_maintenance_annual', label: 'MGPS ad hoc maintenance & repairs (annual)', unit: '₹/yr', kind: 'number', money: true },
]

const PSA_FIELDS: FieldDef[] = [
  { key: 'item_id_value', label: 'Identifier (make / donor / asset id)', kind: 'text' },
  { key: 'psa_capacity_lpm', label: 'Capacity', unit: 'LPM', kind: 'number', required: true },
  { key: 'psa_ownership', label: 'Ownership', kind: 'enum', options: OWNERSHIP },
  { key: 'psa_power_kw', label: 'Power consumption', unit: 'KW', kind: 'number', required: true },
  { key: 'psa_run_hours_monthly', label: 'Monthly run hours', unit: 'hrs/mo', kind: 'number', required: true },
  { key: 'psa_capacity_utilization', label: 'Capacity utilization', unit: '(0–1)', kind: 'number' },
  { key: 'psa_compressor_run_fraction', label: 'Compressor-run fraction', unit: '(0–1)', kind: 'number' },
  { key: 'psa_compressor_power_fraction', label: 'Compressor power share', unit: '(0–1)', kind: 'number' },
  { key: 'electricity_rate_per_kwh', label: 'Electricity usage rate', unit: '₹/kWh', kind: 'number' },
  { key: 'electricity_fixed_monthly', label: 'Electricity fixed charges', unit: '₹/mo', kind: 'number', money: true },
  { key: 'psa_plant_cost', label: 'Plant purchase cost', unit: '₹', kind: 'number', money: true },
  { key: 'psa_plant_life_years', label: 'Plant life', unit: 'yrs', kind: 'number' },
  { key: 'psa_rental_monthly', label: 'Plant rental', unit: '₹/mo', kind: 'number', money: true },
  { key: 'psa_amc_annual', label: 'AMC / CMC (annual, blank = auto 3.27%)', unit: '₹/yr', kind: 'number', nullable: true, money: true },
  { key: 'psa_repair_annual', label: 'Annual repairs', unit: '₹/yr', kind: 'number', money: true },
  { key: 'psa_consumables_annual', label: 'Annual consumables / spares', unit: '₹/yr', kind: 'number', money: true },
]

const LMO_FIELDS: FieldDef[] = [
  { key: 'item_id_value', label: 'Identifier (make / donor / asset id)', kind: 'text' },
  { key: 'lmo_capacity_kl', label: 'Tank capacity', unit: 'KL', kind: 'number' },
  { key: 'lmo_ownership', label: 'Ownership', kind: 'enum', options: OWNERSHIP },
  { key: 'lmo_monthly_cu_m', label: 'Monthly consumption (delivered)', unit: 'cu m/mo', kind: 'number', required: true },
  { key: 'lmo_rental_monthly', label: 'Tank rental', unit: '₹/mo', kind: 'number', money: true },
  { key: 'lmo_tank_cost', label: 'Tank purchase cost', unit: '₹', kind: 'number', money: true },
  { key: 'lmo_tank_life_years', label: 'Tank life', unit: 'yrs', kind: 'number' },
  { key: 'lmo_refill_base_per_litre', label: 'Refill cost / litre', unit: '₹/L', kind: 'number' },
  { key: 'lmo_refill_gst', label: 'Refill GST', unit: '%', kind: 'number', scale: 100 },
  { key: 'lmo_handling_base_per_litre', label: 'Handling cost / litre', unit: '₹/L', kind: 'number' },
  { key: 'lmo_handling_gst', label: 'Handling GST', unit: '%', kind: 'number', scale: 100 },
  { key: 'lmo_loss_pct', label: 'Boil-off loss (per month)', unit: '%', kind: 'number', scale: 100 },
]

const CYL_FIELDS: FieldDef[] = [
  { key: 'item_id_value', label: 'Identifier (make / donor / asset id)', kind: 'text' },
  { key: 'cyl_type', label: 'Cylinder type', kind: 'enum', options: [
    { value: 'd_type', label: 'D-type' },
    { value: 'b_type', label: 'B-type' },
  ] },
  { key: 'cyl_refill_cost', label: 'Refill cost / cylinder', unit: '₹', kind: 'number', required: true, money: true },
  { key: 'cyl_monthly_count', label: 'Cylinders / month', unit: '/mo', kind: 'number', required: true },
  { key: 'cyl_purchase_price', label: 'Purchase price / cylinder', unit: '₹', kind: 'number', money: true },
  { key: 'cyl_lifetime_years', label: 'Cylinder lifetime', unit: 'yrs', kind: 'number' },
  { key: 'cyl_owned_count', label: 'Cylinders owned (blank = 1 rotation/mo)', unit: 'count', kind: 'number', nullable: true },
  { key: 'cyl_hydrotest_cost', label: 'Hydrotest / cylinder', unit: '₹', kind: 'number', money: true },
  { key: 'cyl_hydrotest_interval_years', label: 'Hydrotest interval', unit: 'yrs', kind: 'number' },
  { key: 'cyl_transport_per_trip', label: 'Transport / trip', unit: '₹', kind: 'number', money: true },
  { key: 'cyl_cylinders_per_trip', label: 'Cylinders / trip', unit: 'count', kind: 'number' },
]

const OC_FIELDS: FieldDef[] = [
  { key: 'item_id_value', label: 'Identifier (make / donor / asset id)', kind: 'text' },
  { key: 'oc_output_lpm', label: 'Per-unit flow', unit: 'LPM', kind: 'number' },
  { key: 'oc_high_use_units', label: 'High-use units (≥8 h/day)', unit: 'count', kind: 'number', required: true },
  { key: 'oc_high_use_hours', label: 'High-use hrs/day', unit: 'h', kind: 'number' },
  { key: 'oc_low_use_units', label: 'Low-use units (<8 h/day)', unit: 'count', kind: 'number', required: true },
  { key: 'oc_low_use_hours', label: 'Low-use hrs/day', unit: 'h', kind: 'number' },
  { key: 'oc_price_per_unit', label: 'Price / unit', unit: '₹', kind: 'number', money: true },
  { key: 'oc_life_years', label: 'Unit life', unit: 'yrs', kind: 'number' },
  { key: 'oc_power_watts', label: 'Power draw', unit: 'W', kind: 'number' },
  { key: 'oc_electricity_rate', label: 'Electricity rate', unit: '₹/kWh', kind: 'number' },
  { key: 'oc_days_per_month', label: 'Days per month', unit: 'days', kind: 'number' },
  { key: 'oc_maintenance_per_unit', label: 'Maintenance / unit (annual)', unit: '₹/yr', kind: 'number', money: true },
]

const SOURCE_FIELDS: Record<SourceType, FieldDef[]> = { psa: PSA_FIELDS, lmo: LMO_FIELDS, cylinder: CYL_FIELDS, oc: OC_FIELDS }
const SOURCE_TITLE: Record<SourceType, string> = { psa: 'PSA plant', lmo: 'LMO tank', cylinder: 'Oxygen cylinders', oc: 'Oxygen concentrators' }
const SOURCE_ORDER: SourceType[] = ['psa', 'lmo', 'cylinder', 'oc']

// ---------------------------------------------------------------------------
// Colours & formats
// ---------------------------------------------------------------------------

const FILL_GREEN = 'FFE6F4EA'
const FILL_YELLOW = 'FFFEF3D6'
const FILL_RED = 'FFFCE8E6'
const FILL_HEAD = 'FF0F5A66'
const FILL_SUBHEAD = 'FFEAF1F3'
const FILL_CALC = 'FFF6F9FA'
const MONEY_FMT = '"₹"#,##0'
const RATE_FMT = '"₹"#,##0.00'

function thin() {
  const s = { style: 'thin' as const, color: { argb: 'FFD8DEE1' } }
  return { top: s, left: s, bottom: s, right: s }
}

// ---------------------------------------------------------------------------
// State get/set + cell helpers
// ---------------------------------------------------------------------------

function metaGet(state: AppState, key: string): number | string {
  switch (key) {
    case 'demandMode': return state.demandMode
    case 'demandDirect': return state.demandDirect
    case 'admissionsDemand.month': return state.admissionsDemand.month
    case 'admissionsDemand.state': return state.admissionsDemand.state
    case 'admissionsDemand.facilityType': return state.admissionsDemand.facilityType
    case 'admissionsDemand.ipd': return state.admissionsDemand.ipd
    case 'costView': return state.costView
    default: return ''
  }
}

function cellFor(def: FieldDef, raw: unknown): number | string {
  if (raw === null || raw === undefined) return ''
  if (def.kind === 'enum') return def.options?.find((o) => o.value === raw)?.label ?? String(raw)
  if (def.kind === 'number') {
    const v = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(v)) return ''
    return v * (def.scale ?? 1)
  }
  return String(raw)
}

function toneFill(def: FieldDef, raw: unknown, dflt: unknown): string {
  if (def.kind !== 'number') return raw !== undefined && raw !== '' && raw !== dflt ? FILL_GREEN : FILL_YELLOW
  const v = typeof raw === 'number' ? raw : 0
  if (def.required) return v > 0 ? FILL_GREEN : FILL_RED
  return v === dflt ? FILL_YELLOW : FILL_GREEN
}

// ---------------------------------------------------------------------------
// Export — single sheet with live formulas
// ---------------------------------------------------------------------------

function compAmt(s: SourceResult, key: string): number {
  return s.components.find((c) => c.key === key)?.amount ?? 0
}
const fin = (v: number) => (Number.isFinite(v) ? v : null)

function buildSheet(wb: Workbook, state: AppState): void {
  const ws = wb.addWorksheet('OxyCost', { views: [{ state: 'frozen', ySplit: 4 }] })
  ws.columns = [
    { key: 'k', width: 26, hidden: true },
    { key: 'label', width: 46 },
    { key: 'value', width: 18 },
    { key: 'unit', width: 12 },
    { key: 'dflt', width: 16 },
  ]

  const title = ws.addRow(['', 'OxyCost — Facility calculator'])
  ws.mergeCells(`B${title.number}:E${title.number}`)
  title.getCell(2).font = { bold: true, size: 14, color: { argb: 'FF0F5A66' } }
  title.height = 22
  const note = ws.addRow(['', 'Edit any Value (green = your value · yellow = default · red = required). Grey cells are live formulas that recompute in Excel. Re-import this file into the tool to load your inputs.'])
  ws.mergeCells(`B${note.number}:E${note.number}`)
  note.getCell(2).font = { size: 9, italic: true, color: { argb: 'FF6A7B83' } }
  const head = ws.addRow(['key', 'Field / calculation', 'Value', 'Unit', 'Default / typical'])
  head.eachCell((c, n) => {
    if (n === 1) return
    c.font = { bold: true, size: 10 }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF3F4' } }
    c.border = thin()
  })
  ws.addRow([])

  const refs = new Map<string, string>()

  const band = (t: string, fill = FILL_HEAD, color = 'FFFFFFFF', size = 11) => {
    const r = ws.addRow(['', t])
    ws.mergeCells(`B${r.number}:E${r.number}`)
    const c = r.getCell(2)
    c.font = { bold: true, size, color: { argb: color } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
    r.height = 17
  }

  // Write an editable input row; returns its Value cell address (e.g. "C12").
  const input = (key: string, def: FieldDef, raw: unknown, dflt: unknown): string => {
    const cv = cellFor(def, raw)
    const row = ws.addRow([key, def.label, cv, def.unit ?? '', cellFor(def, dflt)])
    const vc = row.getCell(3)
    if (def.kind === 'number' && typeof cv === 'number' && def.money) vc.numFmt = MONEY_FMT
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toneFill(def, raw, dflt) } }
    vc.border = thin()
    row.getCell(2).font = { size: 10 }
    row.getCell(4).font = { size: 9, color: { argb: 'FF6A7B83' } }
    row.getCell(5).font = { size: 9, color: { argb: 'FF9AA6AB' } }
    return `C${row.number}`
  }

  // Write a calc row whose Value is a live formula; returns its cell address.
  const calc = (
    label: string,
    formula: string,
    result: number | null,
    opts: { unit?: string; fmt?: 'money' | 'rate' | 'num'; bold?: boolean } = {},
  ): string => {
    const row = ws.addRow(['', label, { formula, result: result ?? undefined }, opts.unit ?? ''])
    const vc = row.getCell(3)
    vc.numFmt = opts.fmt === 'rate' ? RATE_FMT : opts.fmt === 'num' ? '#,##0.##' : MONEY_FMT
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_CALC } }
    vc.border = thin()
    vc.font = { size: 10, bold: opts.bold, color: { argb: 'FF16333B' } }
    row.getCell(2).font = { size: 10, bold: opts.bold, italic: !opts.bold, color: { argb: 'FF4A5A61' } }
    row.getCell(4).font = { size: 9, color: { argb: 'FF6A7B83' } }
    return `C${row.number}`
  }

  // --- Demand & settings ---
  band('Demand & settings')
  for (const def of META_FIELDS) refs.set(def.key, input(def.key, def, metaGet(state, def.key), ''))

  // --- Shared facility costs ---
  band('Shared facility costs')
  for (const def of SHARED_FIELDS) {
    refs.set(`shared.${def.key}`, input(`shared.${def.key}`, def, (state.shared as unknown as Record<string, unknown>)[def.key], (SHARED_DEFAULTS as unknown as Record<string, unknown>)[def.key]))
  }

  // --- Engine result (seeds the formula results + summary) ---
  const demand = resolveDemand(state)
  const f = state.fleet
  const engineInputs: EngineInputs = {
    demand_cu_m: demand,
    shared: state.shared,
    ...(f.psa.length ? { psa: f.psa } : {}),
    ...(f.lmo.length ? { lmo: f.lmo } : {}),
    ...(f.cylinder.length ? { cylinder: f.cylinder } : {}),
    ...(f.oc.length ? { oc: f.oc } : {}),
  }
  const result = compareAllSources(engineInputs)
  const byId = new Map(result.sources.map((s) => [s.id, s]))

  interface Summary { label: string; totalRef: string; outRef: string; perCuMRef: string; totalVal: number; outVal: number; perCuMVal: number | null }
  const summaries: Summary[] = []

  for (const source of SOURCE_ORDER) {
    const instances = state.fleet[source]
    if (instances.length === 0) continue
    const dflt = defaultsFor(source) as unknown as Record<string, unknown>
    band(`${SOURCE_TITLE[source]}s — ${instances.length} unit${instances.length === 1 ? '' : 's'}`)
    instances.forEach((inst, i) => {
      const rec = inst as unknown as Record<string, unknown>
      const idv = (rec.item_id_value as string) || ''
      band(`${SOURCE_TITLE[source]} ${i + 1}${idv ? ` · ${idv}` : ''}`, FILL_SUBHEAD, 'FF16333B', 10)
      const cell: Record<string, string> = {}
      for (const def of SOURCE_FIELDS[source]) {
        cell[def.key] = input(`${source}[${i}].${def.key}`, def, rec[def.key], dflt[def.key])
      }
      const s = byId.get(`${source}-${i}`)
      if (s) {
        const sc = buildSourceCalc(source, calc, cell, s, rec)
        summaries.push({ ...sc, totalVal: s.total_monthly_cost, outVal: s.monthly_output_cu_m, perCuMVal: fin(s.per_cu_m_capex_opex) })
      }
    })
  }

  // --- Shared overhead (monthly) ---
  band('Shared facility overhead (per month)', FILL_SUBHEAD, 'FF16333B', 10)
  const sh = refs
  const hrRef = calc('HR / technician salary', `${sh.get('shared.hr_salary_monthly')}`, state.shared.hr_salary_monthly, { unit: '₹/mo' })
  calc('MGPS AMC (monthly)', `${sh.get('shared.mgps_amc_annual')}/12`, state.shared.mgps_amc_annual / 12, { unit: '₹/mo' })
  calc('MGPS maintenance & repairs (monthly)', `${sh.get('shared.mgps_maintenance_annual')}/12`, state.shared.mgps_maintenance_annual / 12, { unit: '₹/mo' })
  const otherRef = calc('Other shared cost', `${sh.get('shared.other_shared_monthly')}`, state.shared.other_shared_monthly, { unit: '₹/mo' })
  const sharedTotalRef = calc('Total shared overhead', `SUM(${hrRef}:${otherRef})`, result.shared_overhead_monthly, { unit: '₹/mo', bold: true })

  // --- Summary matrix ---
  ws.addRow([])
  band('Summary — monthly totals')
  const sHead = ws.addRow(['', 'Source', 'Monthly total', 'Output', '₹/cu m'])
  sHead.eachCell((c, n) => {
    if (n === 1) return
    c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_HEAD } }
    c.border = thin()
  })
  const totalRefs: string[] = []
  const outRefs: string[] = []
  for (const sm of summaries) {
    const row = ws.addRow(['', sm.label, { formula: sm.totalRef, result: sm.totalVal }, { formula: sm.outRef, result: sm.outVal }, { formula: sm.perCuMRef, result: sm.perCuMVal ?? undefined }])
    row.getCell(3).numFmt = MONEY_FMT
    row.getCell(4).numFmt = '#,##0'
    row.getCell(5).numFmt = RATE_FMT
    row.eachCell((c, n) => { if (n > 1) c.border = thin() })
    totalRefs.push(`C${row.number}`)
    outRefs.push(`D${row.number}`)
  }
  // Shared overhead line (no output).
  const shRow = ws.addRow(['', 'Shared facility overhead', { formula: sharedTotalRef, result: result.shared_overhead_monthly }, '', ''])
  shRow.getCell(3).numFmt = MONEY_FMT
  shRow.eachCell((c, n) => { if (n > 1) c.border = thin() })
  totalRefs.push(`C${shRow.number}`)
  // Grand total.
  const totalOutVal = summaries.reduce((a, s) => a + (s.outVal || 0), 0)
  const grandTotVal = summaries.reduce((a, s) => a + (s.totalVal || 0), 0) + result.shared_overhead_monthly
  const grandOut = outRefs.length ? `SUM(${outRefs.join(',')})` : '0'
  const grandTot = totalRefs.length ? `SUM(${totalRefs.join(',')})` : '0'
  const gRow = ws.addRow(['', 'ALL-IN (sources + shared)', { formula: grandTot, result: grandTotVal }, { formula: grandOut, result: totalOutVal }, { formula: `IF(${grandOut}>0,${grandTot}/${grandOut},"")`, result: totalOutVal > 0 ? grandTotVal / totalOutVal : undefined }])
  gRow.getCell(3).numFmt = MONEY_FMT
  gRow.getCell(4).numFmt = '#,##0'
  gRow.getCell(5).numFmt = RATE_FMT
  gRow.eachCell((c, n) => {
    if (n === 1) return
    c.font = { bold: true, size: 11 }
    c.border = thin()
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF1F3' } }
  })
}

/** Emit a source's cost components as live formulas; return its summary refs. */
function buildSourceCalc(
  source: SourceType,
  calc: (l: string, f: string, r: number | null, o?: { unit?: string; fmt?: 'money' | 'rate' | 'num'; bold?: boolean }) => string,
  c: Record<string, string>,
  s: SourceResult,
  rec: Record<string, unknown>,
): { label: string; totalRef: string; outRef: string; perCuMRef: string } {
  const M = { unit: '₹/mo' as const }
  const R = { unit: '₹/cu m', fmt: 'rate' as const }
  const N = (u: string) => ({ unit: u, fmt: 'num' as const })

  if (source === 'psa') {
    const runFrac = clamp01(rec.psa_compressor_run_fraction as number)
    const powFrac = clamp01(rec.psa_compressor_power_fraction as number)
    const ph = (rec.psa_run_hours_monthly as number) * runFrac
    const kwh = (rec.psa_power_kw as number) * powFrac * ph + (rec.psa_power_kw as number) * (1 - powFrac) * (rec.psa_run_hours_monthly as number)
    const phRef = calc('Production (compressor) hours', `${c.psa_run_hours_monthly}*${c.psa_compressor_run_fraction}`, ph, N('hrs/mo'))
    const outRef = calc('Oxygen produced', `${phRef}*60*${c.psa_capacity_lpm}*${c.psa_capacity_utilization}/1000`, s.monthly_output_cu_m, N('cu m/mo'))
    const kwhRef = calc('Electricity used', `(${c.psa_power_kw}*${c.psa_compressor_power_fraction})*${phRef}+(${c.psa_power_kw}*(1-${c.psa_compressor_power_fraction}))*${c.psa_run_hours_monthly}`, kwh, N('kWh/mo'))
    const eUse = calc('Electricity (usage)', `${kwhRef}*${c.electricity_rate_per_kwh}`, compAmt(s, 'electricity_usage'), M)
    calc('Electricity (fixed)', `${c.electricity_fixed_monthly}`, compAmt(s, 'electricity_fixed'), M)
    calc('Maintenance (AMC/CMC)', `IF(${c.psa_amc_annual}="",0.0327*IF(${c.psa_ownership}="Rented",0,${c.psa_plant_cost}),${c.psa_amc_annual})/12`, compAmt(s, 'maintenance'), M)
    calc('Repairs', `${c.psa_repair_annual}/12`, compAmt(s, 'repairs'), M)
    calc('Consumables / spares', `${c.psa_consumables_annual}/12`, compAmt(s, 'consumables'), M)
    calc('Plant rental', `IF(${c.psa_ownership}="Rented",${c.psa_rental_monthly},0)`, compAmt(s, 'rental'), M)
    const dep = calc('Depreciation', `IF(${c.psa_ownership}="Rented",0,${c.psa_plant_cost}/${c.psa_plant_life_years}/12)`, compAmt(s, 'depreciation'), M)
    const total = calc('Monthly total', `SUM(${eUse}:${dep})`, s.total_monthly_cost, { unit: '₹/mo', bold: true })
    const per = calc('Cost / cu m (capex + opex)', `IF(${outRef}>0,${total}/${outRef},"")`, fin(s.per_cu_m_capex_opex), R)
    calc('Cost / cu m (opex only)', `IF(${outRef}>0,(${total}-${dep})/${outRef},"")`, fin(s.per_cu_m_opex_only), R)
    calc('Cost / cu m (incremental)', `IF(${outRef}>0,${eUse}/${outRef},"")`, fin(s.incremental_cost_per_cu_m), R)
    return { label: s.label, totalRef: total, outRef, perCuMRef: per }
  }

  if (source === 'lmo') {
    const loss = Math.min(0.95, Math.max(0, (rec.lmo_loss_pct as number) || 0))
    const lf = 1 / (1 - loss)
    const refPerCuM = ((rec.lmo_refill_base_per_litre as number) * (1 + (rec.lmo_refill_gst as number))) / 0.861
    const hanPerCuM = ((rec.lmo_handling_base_per_litre as number) * (1 + (rec.lmo_handling_gst as number))) / 0.861
    const lfRef = calc('Boil-off loss factor', `1/(1-MIN(0.95,MAX(0,${c.lmo_loss_pct}/100)))`, lf, N('×'))
    const refRate = calc('Refilling / cu m (purchased)', `${c.lmo_refill_base_per_litre}*(1+${c.lmo_refill_gst}/100)/0.861`, refPerCuM, R)
    const hanRate = calc('Handling / cu m (purchased)', `${c.lmo_handling_base_per_litre}*(1+${c.lmo_handling_gst}/100)/0.861`, hanPerCuM, R)
    const rent = calc('Tank rental', `IF(${c.lmo_ownership}="Purchased",0,${c.lmo_rental_monthly})`, compAmt(s, 'rental'), M)
    calc('Refilling', `${refRate}*${c.lmo_monthly_cu_m}*${lfRef}`, compAmt(s, 'refilling'), M)
    calc('Handling & transport', `${hanRate}*${c.lmo_monthly_cu_m}*${lfRef}`, compAmt(s, 'handling'), M)
    const dep = calc('Depreciation', `IF(${c.lmo_ownership}="Purchased",${c.lmo_tank_cost}/${c.lmo_tank_life_years}/12,0)`, compAmt(s, 'depreciation'), M)
    const total = calc('Monthly total', `SUM(${rent}:${dep})`, s.total_monthly_cost, { unit: '₹/mo', bold: true })
    const per = calc('Cost / cu m (capex + opex)', `IF(${c.lmo_monthly_cu_m}>0,${total}/${c.lmo_monthly_cu_m},"")`, fin(s.per_cu_m_capex_opex), R)
    calc('Cost / cu m (opex only)', `IF(${c.lmo_monthly_cu_m}>0,(${total}-${dep})/${c.lmo_monthly_cu_m},"")`, fin(s.per_cu_m_opex_only), R)
    calc('Cost / cu m (incremental)', `(${refRate}+${hanRate})*${lfRef}`, fin(s.incremental_cost_per_cu_m), R)
    return { label: s.label, totalRef: total, outRef: c.lmo_monthly_cu_m, perCuMRef: per }
  }

  if (source === 'cylinder') {
    const volPer = calc('Volume / cylinder', `IF(${c.cyl_type}="D-type",7,1.5)`, s.monthly_output_cu_m / Math.max(1, rec.cyl_monthly_count as number), N('cu m'))
    const outRef = calc('Oxygen delivered', `${c.cyl_monthly_count}*${volPer}`, s.monthly_output_cu_m, N('cu m/mo'))
    const owned = calc('Cylinders owned (effective)', `IF(${c.cyl_owned_count}="",${c.cyl_monthly_count},${c.cyl_owned_count})`, (rec.cyl_owned_count as number) ?? (rec.cyl_monthly_count as number), N('count'))
    const transPer = calc('Transport / cylinder', `IF(${c.cyl_cylinders_per_trip}>0,${c.cyl_transport_per_trip}/${c.cyl_cylinders_per_trip},0)`, (rec.cyl_cylinders_per_trip as number) > 0 ? (rec.cyl_transport_per_trip as number) / (rec.cyl_cylinders_per_trip as number) : 0, M)
    const refs = calc('Cylinder refills', `${c.cyl_refill_cost}*${c.cyl_monthly_count}`, compAmt(s, 'refills'), M)
    const trans = calc('Transport', `${transPer}*${c.cyl_monthly_count}`, compAmt(s, 'transport'), M)
    calc('Cylinder purchase (amortized)', `IF(${owned}>0,${owned}*${c.cyl_purchase_price}/(${c.cyl_lifetime_years}*12),0)`, compAmt(s, 'capex'), M)
    const hydro = calc('Hydrostatic testing', `IF(${c.cyl_hydrotest_interval_years}>0,${owned}*${c.cyl_hydrotest_cost}/(${c.cyl_hydrotest_interval_years}*12),0)`, compAmt(s, 'hydrotest'), M)
    const total = calc('Monthly total', `SUM(${refs}:${hydro})`, s.total_monthly_cost, { unit: '₹/mo', bold: true })
    const per = calc('Cost / cu m (capex + opex)', `IF(${outRef}>0,${total}/${outRef},"")`, fin(s.per_cu_m_capex_opex), R)
    calc('Cost / cu m (opex only)', `IF(${outRef}>0,(${refs}+${trans}+${hydro})/${outRef},"")`, fin(s.per_cu_m_opex_only), R)
    calc('Cost / cu m (incremental)', `IF(${outRef}>0,(${refs}+${trans})/${outRef},"")`, fin(s.incremental_cost_per_cu_m), R)
    return { label: s.label, totalRef: total, outRef, perCuMRef: per }
  }

  // oc
  const uhVal = ((rec.oc_high_use_units as number) * (rec.oc_high_use_hours as number) + (rec.oc_low_use_units as number) * (rec.oc_low_use_hours as number)) * (rec.oc_days_per_month as number)
  const kwhVal = (uhVal * (rec.oc_power_watts as number)) / 1000
  const depUnits = calc('Deployed units', `${c.oc_high_use_units}+${c.oc_low_use_units}`, (rec.oc_high_use_units as number) + (rec.oc_low_use_units as number), N('units'))
  const uh = calc('Unit-hours / month', `(${c.oc_high_use_units}*${c.oc_high_use_hours}+${c.oc_low_use_units}*${c.oc_low_use_hours})*${c.oc_days_per_month}`, uhVal, N('unit·h'))
  const outRef = calc('Oxygen produced', `${uh}*${c.oc_output_lpm}*60/1000`, s.monthly_output_cu_m, N('cu m/mo'))
  const kwhRef = calc('Electricity used', `${uh}*${c.oc_power_watts}/1000`, kwhVal, N('kWh/mo'))
  const elec = calc('Electricity', `${kwhRef}*${c.oc_electricity_rate}`, compAmt(s, 'electricity'), M)
  const maint = calc('Maintenance', `${depUnits}*${c.oc_maintenance_per_unit}/12`, compAmt(s, 'maintenance'), M)
  const dep = calc('Depreciation', `${depUnits}*${c.oc_price_per_unit}/(${c.oc_life_years}*12)`, compAmt(s, 'depreciation'), M)
  const total = calc('Monthly total', `SUM(${elec}:${dep})`, s.total_monthly_cost, { unit: '₹/mo', bold: true })
  const per = calc('Cost / cu m (capex + opex)', `IF(${outRef}>0,${total}/${outRef},"")`, fin(s.per_cu_m_capex_opex), R)
  calc('Cost / cu m (opex only)', `IF(${outRef}>0,(${elec}+${maint})/${outRef},"")`, fin(s.per_cu_m_opex_only), R)
  calc('Cost / cu m (incremental)', `IF(${outRef}>0,${elec}/${outRef},"")`, fin(s.incremental_cost_per_cu_m), R)
  return { label: s.label, totalRef: total, outRef, perCuMRef: per }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

/** Build the workbook bytes (no DOM). Exposed for tests. */
export async function facilityWorkbookBuffer(state: AppState): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'OxyCost'
  buildSheet(wb, state)
  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}

export async function exportFacilityWorkbook(state: AppState): Promise<void> {
  const buf = await facilityWorkbookBuffer(state)
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  a.download = `OxyCost-facility-${stamp}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function parseCell(def: FieldDef, cell: unknown): number | string | null {
  if (def.kind === 'enum') {
    const str = String((cell as { text?: string })?.text ?? cell ?? '').trim()
    const opt = def.options?.find((o) => o.label.toLowerCase() === str.toLowerCase() || o.value.toLowerCase() === str.toLowerCase())
    return opt ? opt.value : (def.options?.[0].value ?? '')
  }
  if (def.kind === 'text') return String((cell as { text?: string })?.text ?? cell ?? '')
  if (cell === null || cell === undefined || cell === '') return def.nullable ? null : 0
  const raw = typeof cell === 'object' && cell !== null && 'result' in cell ? (cell as { result: unknown }).result : cell
  const v = typeof raw === 'number' ? raw : Number(String(raw).replace(/[₹,\s%]/g, ''))
  if (!Number.isFinite(v)) return def.nullable ? null : 0
  return v / (def.scale ?? 1)
}

export async function importFacilityWorkbook(file: File): Promise<AppState> {
  return importFacilityWorkbookBuffer(await file.arrayBuffer())
}

/** Import from raw bytes (no File/DOM). Exposed for tests. */
export async function importFacilityWorkbookBuffer(buf: ArrayBuffer): Promise<AppState> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const ws = wb.getWorksheet('OxyCost') ?? wb.getWorksheet('Inputs') ?? wb.worksheets[0]
  if (!ws) throw new Error('No worksheet found — is this an OxyCost export?')

  const cells = new Map<string, unknown>()
  ws.eachRow((row) => {
    const key = row.getCell(1).value
    if (typeof key !== 'string' || !key) return
    cells.set(key, row.getCell(3).value)
  })
  const instRe = /^(psa|lmo|cylinder|oc)\[(\d+)\]\.(.+)$/
  const known = new Set<string>([...META_FIELDS.map((d) => d.key), ...SHARED_FIELDS.map((d) => `shared.${d.key}`)])
  const recognised = [...cells.keys()].some((k) => known.has(k) || instRe.test(k))
  if (!recognised) throw new Error('This workbook doesn’t look like an OxyCost export (no recognisable fields).')

  const state: AppState = {
    demandMode: 'direct',
    demandDirect: 0,
    admissionsDemand: { ...initialState.admissionsDemand },
    costView: 'capex_opex',
    shared: { ...SHARED_DEFAULTS },
    fleet: { psa: [], lmo: [], cylinder: [], oc: [] },
  }

  const setMeta = (key: string, val: number | string | null) => {
    switch (key) {
      case 'demandMode': state.demandMode = val as AppState['demandMode']; break
      case 'demandDirect': state.demandDirect = Number(val) || 0; break
      case 'admissionsDemand.month': state.admissionsDemand.month = Number(val) || 0; break
      case 'admissionsDemand.state': state.admissionsDemand.state = String(val ?? ''); break
      case 'admissionsDemand.facilityType': state.admissionsDemand.facilityType = String(val ?? ''); break
      case 'admissionsDemand.ipd': state.admissionsDemand.ipd = Number(val) || 0; break
      case 'costView': state.costView = val as AppState['costView']; break
    }
  }
  for (const def of META_FIELDS) if (cells.has(def.key)) setMeta(def.key, parseCell(def, cells.get(def.key)))

  for (const def of SHARED_FIELDS) {
    const k = `shared.${def.key}`
    if (cells.has(k)) (state.shared as unknown as Record<string, unknown>)[def.key] = parseCell(def, cells.get(k))
  }

  const maxIdx: Record<SourceType, number> = { psa: -1, lmo: -1, cylinder: -1, oc: -1 }
  for (const key of cells.keys()) {
    const m = key.match(instRe)
    if (m) maxIdx[m[1] as SourceType] = Math.max(maxIdx[m[1] as SourceType], Number(m[2]))
  }
  for (const source of SOURCE_ORDER) {
    for (let i = 0; i <= maxIdx[source]; i++) {
      const inst = resetInstance(source) as unknown as Record<string, unknown>
      for (const def of SOURCE_FIELDS[source]) {
        const k = `${source}[${i}].${def.key}`
        if (cells.has(k)) inst[def.key] = parseCell(def, cells.get(k))
      }
      ;(state.fleet[source] as unknown[]).push(inst)
    }
  }

  return state
}
