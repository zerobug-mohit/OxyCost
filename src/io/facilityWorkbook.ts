// Export the facility calculator's full state to a lean, well-formatted Excel
// workbook, and import that same workbook back to rebuild the state. The layout
// is schema-driven (SECTION field lists) so export and import never drift: every
// input row carries a hidden machine key in column A, so import maps key → value
// and honours edits made in the tool OR directly in Excel.
//
// Two sheets:
//   • Inputs        — grouped, colour-coded, round-trippable (import reads this).
//   • Calculations  — read-only transparency: each source's cost components sit
//                     in adjacent columns, then per-cu-m sub-totals and the
//                     monthly total, so the whole build-up reads in one glance.
//
// ExcelJS is heavy, so it is dynamically imported only when export/import runs.
import type { Workbook, Worksheet } from 'exceljs'
import { compareAllSources, SHARED_DEFAULTS } from '../engine'
import type { EngineInputs, SourceType } from '../engine'
import { defaultsFor, resetInstance } from '../state'
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
  /** enum value ↔ human label. */
  options?: { value: string; label: string }[]
  /** blank cell ⇒ null (auto). */
  nullable?: boolean
  /** cell value = raw × scale (e.g. GST fraction shown as %). Default 1. */
  scale?: number
  /** Required (red when empty); else optional (yellow at default, green when changed). */
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
    { value: 'beds', label: 'From beds' },
  ] },
  { key: 'demandDirect', label: 'Monthly demand (direct)', unit: 'cu m/mo', kind: 'number', required: true },
  { key: 'bedDemand.beds', label: 'Oxygen beds', unit: 'beds', kind: 'number' },
  { key: 'bedDemand.lpmPerBed', label: 'LPM per bed', unit: 'LPM', kind: 'number' },
  { key: 'bedDemand.hoursPerDay', label: 'Hours per day', unit: 'h', kind: 'number' },
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
  { key: 'psa_amc_annual', label: 'AMC / CMC (annual)', unit: '₹/yr', kind: 'number', nullable: true, money: true },
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
  { key: 'cyl_owned_count', label: 'Cylinders owned', unit: 'count', kind: 'number', nullable: true },
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

const SOURCE_FIELDS: Record<SourceType, FieldDef[]> = {
  psa: PSA_FIELDS,
  lmo: LMO_FIELDS,
  cylinder: CYL_FIELDS,
  oc: OC_FIELDS,
}
const SOURCE_TITLE: Record<SourceType, string> = {
  psa: 'PSA plant',
  lmo: 'LMO tank',
  cylinder: 'Oxygen cylinders',
  oc: 'Oxygen concentrators',
}
const SOURCE_ORDER: SourceType[] = ['psa', 'lmo', 'cylinder', 'oc']

// ---------------------------------------------------------------------------
// Colours & formats
// ---------------------------------------------------------------------------

const FILL_GREEN = 'FFE6F4EA' // user-entered / changed
const FILL_YELLOW = 'FFFEF3D6' // pre-filled default
const FILL_RED = 'FFFCE8E6' // required, empty
const FILL_HEAD = 'FF0F5A66' // section header band
const FILL_SUBHEAD = 'FFEAF1F3'
const MONEY_FMT = '"₹"#,##0'
const RATE_FMT = '"₹"#,##0.00'

// ---------------------------------------------------------------------------
// State get/set helpers
// ---------------------------------------------------------------------------

function metaGet(state: AppState, key: string): number | string {
  switch (key) {
    case 'demandMode': return state.demandMode
    case 'demandDirect': return state.demandDirect
    case 'bedDemand.beds': return state.bedDemand.beds
    case 'bedDemand.lpmPerBed': return state.bedDemand.lpmPerBed
    case 'bedDemand.hoursPerDay': return state.bedDemand.hoursPerDay
    case 'costView': return state.costView
    default: return ''
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function toneFill(def: FieldDef, raw: unknown, dflt: unknown): string | null {
  if (def.kind !== 'number') {
    // text/enum: green if it differs from default, else yellow.
    return raw !== undefined && raw !== '' && raw !== dflt ? FILL_GREEN : FILL_YELLOW
  }
  const v = typeof raw === 'number' ? raw : 0
  if (def.required) return v > 0 ? FILL_GREEN : FILL_RED
  return v === dflt ? FILL_YELLOW : FILL_GREEN
}

function cellFor(def: FieldDef, raw: unknown): number | string {
  if (raw === null || raw === undefined) return ''
  if (def.kind === 'enum') {
    const opt = def.options?.find((o) => o.value === raw)
    return opt ? opt.label : String(raw)
  }
  if (def.kind === 'number') {
    const v = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(v)) return ''
    return v * (def.scale ?? 1)
  }
  return String(raw)
}

function writeInputRow(
  ws: Worksheet,
  key: string,
  def: FieldDef,
  raw: unknown,
  dflt: unknown,
): void {
  const cellVal = cellFor(def, raw)
  const row = ws.addRow([key, def.label, cellVal, def.unit ?? '', cellFor(def, dflt)])
  const valCell = row.getCell(3)
  if (def.kind === 'number' && typeof cellVal === 'number' && def.money) valCell.numFmt = MONEY_FMT
  const fill = toneFill(def, raw, dflt)
  if (fill) valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
  valCell.border = thin()
  row.getCell(2).font = { size: 10 }
  row.getCell(4).font = { size: 9, color: { argb: 'FF6A7B83' } }
  row.getCell(5).font = { size: 9, color: { argb: 'FF9AA6AB' } }
}

function thin() {
  const s = { style: 'thin' as const, color: { argb: 'FFD8DEE1' } }
  return { top: s, left: s, bottom: s, right: s }
}

function sectionBand(ws: Worksheet, title: string): void {
  const row = ws.addRow(['', title])
  ws.mergeCells(`B${row.number}:E${row.number}`)
  const c = row.getCell(2)
  c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_HEAD } }
  row.height = 18
}

function subBand(ws: Worksheet, title: string): void {
  const row = ws.addRow(['', title])
  ws.mergeCells(`B${row.number}:E${row.number}`)
  const c = row.getCell(2)
  c.font = { bold: true, size: 10, color: { argb: 'FF16333B' } }
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_SUBHEAD } }
}

function buildInputsSheet(wb: Workbook, state: AppState): void {
  const ws = wb.addWorksheet('Inputs', { views: [{ state: 'frozen', ySplit: 4 }] })
  ws.columns = [
    { key: 'k', width: 26, hidden: true },
    { key: 'label', width: 42 },
    { key: 'value', width: 16 },
    { key: 'unit', width: 12 },
    { key: 'dflt', width: 14 },
  ]

  // Title + column captions.
  const title = ws.addRow(['', 'OxyCost — Facility calculator (Inputs)'])
  ws.mergeCells(`B${title.number}:E${title.number}`)
  title.getCell(2).font = { bold: true, size: 14, color: { argb: 'FF0F5A66' } }
  title.height = 22
  const note = ws.addRow(['', 'Edit the Value column, then Import this file back into the tool. Colours: green = your value · yellow = default · red = required, still empty.'])
  ws.mergeCells(`B${note.number}:E${note.number}`)
  note.getCell(2).font = { size: 9, italic: true, color: { argb: 'FF6A7B83' } }
  const head = ws.addRow(['key', 'Field', 'Value', 'Unit', 'Default / typical'])
  head.eachCell((c, n) => {
    if (n === 1) return
    c.font = { bold: true, size: 10 }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF3F4' } }
    c.border = thin()
  })
  ws.addRow([])

  // Demand & settings.
  sectionBand(ws, 'Demand & settings')
  for (const def of META_FIELDS) writeInputRow(ws, def.key, def, metaGet(state, def.key), '')

  // Shared facility costs.
  sectionBand(ws, 'Shared facility costs')
  for (const def of SHARED_FIELDS) {
    writeInputRow(ws, `shared.${def.key}`, def, (state.shared as unknown as Record<string, unknown>)[def.key], (SHARED_DEFAULTS as unknown as Record<string, unknown>)[def.key])
  }

  // Sources.
  for (const source of SOURCE_ORDER) {
    const instances = state.fleet[source]
    if (instances.length === 0) continue
    const dflt = defaultsFor(source) as unknown as Record<string, unknown>
    sectionBand(ws, `${SOURCE_TITLE[source]}s — ${instances.length} unit${instances.length === 1 ? '' : 's'}`)
    instances.forEach((inst, i) => {
      const rec = inst as unknown as Record<string, unknown>
      const idv = (rec.item_id_value as string) || ''
      subBand(ws, `${SOURCE_TITLE[source]} ${i + 1}${idv ? ` · ${idv}` : ''}`)
      for (const def of SOURCE_FIELDS[source]) {
        writeInputRow(ws, `${source}[${i}].${def.key}`, def, rec[def.key], dflt[def.key])
      }
    })
  }
}

function buildCalcSheet(wb: Workbook, state: AppState): void {
  const demand = resolveDemand(state)
  const f = state.fleet
  const inputs: EngineInputs = {
    demand_cu_m: demand,
    shared: state.shared,
    ...(f.psa.length ? { psa: f.psa } : {}),
    ...(f.lmo.length ? { lmo: f.lmo } : {}),
    ...(f.cylinder.length ? { cylinder: f.cylinder } : {}),
    ...(f.oc.length ? { oc: f.oc } : {}),
  }
  const result = compareAllSources(inputs)
  const ws = wb.addWorksheet('Calculations', { views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }] })

  // Union of component keys across sources, in first-seen order.
  const compKeys: string[] = []
  const compLabel = new Map<string, string>()
  for (const s of result.sources) {
    for (const c of s.components) {
      if (!compLabel.has(c.key)) {
        compLabel.set(c.key, c.label)
        compKeys.push(c.key)
      }
    }
  }

  const title = ws.addRow(['Calculations — monthly cost components (₹) → totals'])
  title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF0F5A66' } }
  title.height = 22
  const note = ws.addRow([`Demand ${Math.round(demand).toLocaleString('en-IN')} cu m/month · read-only. Each row is one source; components add left-to-right to the monthly total, then divide by output for the per-cu-m costs.`])
  note.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF6A7B83' } }
  ws.addRow([])

  const header = ['Source', ...compKeys.map((k) => compLabel.get(k) ?? k), 'Monthly total', 'Output (cu m)', '₹/cu m (opex)', '₹/cu m (capex+opex)', '₹/cu m (incremental)']
  const hRow = ws.addRow(header)
  hRow.eachCell((c) => {
    c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_HEAD } }
    c.alignment = { wrapText: true, vertical: 'middle' }
    c.border = thin()
  })
  hRow.height = 30

  const perCuM = (v: number) => (Number.isFinite(v) ? v : null)
  let totalOutput = 0
  let totalMonthly = 0
  for (const s of result.sources) {
    totalOutput += s.monthly_output_cu_m || 0
    totalMonthly += s.total_monthly_cost || 0
    const byKey = new Map(s.components.map((c) => [c.key, c.amount]))
    const rowVals: (number | string | null)[] = [s.label]
    for (const k of compKeys) rowVals.push(byKey.has(k) ? Math.round(byKey.get(k)!) : 0)
    rowVals.push(Math.round(s.total_monthly_cost))
    rowVals.push(Math.round(s.monthly_output_cu_m))
    rowVals.push(perCuM(s.per_cu_m_opex_only))
    rowVals.push(perCuM(s.per_cu_m_capex_opex))
    rowVals.push(perCuM(s.incremental_cost_per_cu_m))
    const row = ws.addRow(rowVals)
    styleCalcRow(row, compKeys.length)
  }

  // Shared overhead.
  ws.addRow([])
  const shRow = ws.addRow(['Shared facility overhead (per month)'])
  shRow.getCell(1).font = { bold: true, size: 10 }
  const shMonthly = result.shared_overhead_monthly
  const pushShared = (label: string, amt: number) => {
    const r = ws.addRow([label, Math.round(amt)])
    r.getCell(2).numFmt = MONEY_FMT
    r.getCell(1).font = { size: 10 }
  }
  pushShared('HR / technician salary', state.shared.hr_salary_monthly)
  pushShared('MGPS AMC (monthly)', state.shared.mgps_amc_annual / 12)
  pushShared('MGPS maintenance & repairs (monthly)', state.shared.mgps_maintenance_annual / 12)
  pushShared('Other shared cost', state.shared.other_shared_monthly)
  const shTot = ws.addRow(['Total shared overhead', Math.round(shMonthly), '', totalOutput > 0 ? shMonthly / totalOutput : null, '₹/cu m spread across all output'])
  shTot.getCell(1).font = { bold: true }
  shTot.getCell(2).numFmt = MONEY_FMT
  shTot.getCell(2).font = { bold: true }
  shTot.getCell(4).numFmt = RATE_FMT

  // Grand total.
  ws.addRow([])
  const gt = ws.addRow(['All sources + shared (per month)', Math.round(totalMonthly + shMonthly)])
  gt.getCell(1).font = { bold: true, size: 11 }
  gt.getCell(2).font = { bold: true, size: 11 }
  gt.getCell(2).numFmt = MONEY_FMT
  const gt2 = ws.addRow(['Total oxygen supplied (per month)', Math.round(totalOutput), 'cu m'])
  gt2.getCell(1).font = { bold: true }

  // Column widths.
  ws.getColumn(1).width = 30
  const nCols = header.length
  for (let c = 2; c <= nCols; c++) ws.getColumn(c).width = 15
}

function styleCalcRow(row: import('exceljs').Row, nComp: number): void {
  row.eachCell((cell, n) => {
    cell.border = thin()
    if (n === 1) { cell.font = { size: 10 }; return }
    const isPerCuM = n > 1 + nComp + 2 // after Monthly total + Output
    cell.numFmt = isPerCuM ? RATE_FMT : MONEY_FMT
    if (n === 2 + nComp) cell.font = { bold: true } // Monthly total column
  })
}

/** Build the workbook and return its bytes (no DOM). Exposed for tests. */
export async function facilityWorkbookBuffer(state: AppState): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'OxyCost'
  buildInputsSheet(wb, state)
  buildCalcSheet(wb, state)
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
    const s = String(cell ?? '').trim()
    const opt = def.options?.find((o) => o.label.toLowerCase() === s.toLowerCase() || o.value.toLowerCase() === s.toLowerCase())
    return opt ? opt.value : (def.options?.[0].value ?? '')
  }
  if (def.kind === 'text') return String(cell ?? '')
  // number
  if (cell === null || cell === undefined || cell === '') return def.nullable ? null : 0
  const v = typeof cell === 'number' ? cell : Number(String(cell).replace(/[₹,\s%]/g, ''))
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
  const ws = wb.getWorksheet('Inputs')
  if (!ws) throw new Error('No "Inputs" sheet found — is this an OxyCost export?')

  // key → raw cell value (column A = key, column C = value).
  const cells = new Map<string, unknown>()
  ws.eachRow((row) => {
    const key = row.getCell(1).value
    if (typeof key !== 'string' || !key) return
    cells.set(key, row.getCell(3).value)
  })
  if (cells.size === 0) throw new Error('No recognisable input rows found in this workbook.')

  // Start from a clean state and overlay.
  const state: AppState = {
    demandMode: 'direct',
    demandDirect: 0,
    bedDemand: { beds: 0, lpmPerBed: 5, hoursPerDay: 12 },
    costView: 'capex_opex',
    shared: { ...SHARED_DEFAULTS },
    fleet: { psa: [], lmo: [], cylinder: [], oc: [] },
  }

  // Meta.
  const setMeta = (key: string, val: number | string | null) => {
    switch (key) {
      case 'demandMode': state.demandMode = (val as AppState['demandMode']); break
      case 'demandDirect': state.demandDirect = Number(val) || 0; break
      case 'bedDemand.beds': state.bedDemand.beds = Number(val) || 0; break
      case 'bedDemand.lpmPerBed': state.bedDemand.lpmPerBed = Number(val) || 0; break
      case 'bedDemand.hoursPerDay': state.bedDemand.hoursPerDay = Number(val) || 0; break
      case 'costView': state.costView = (val as AppState['costView']); break
    }
  }
  for (const def of META_FIELDS) {
    if (cells.has(def.key)) setMeta(def.key, parseCell(def, cells.get(def.key)))
  }

  // Shared.
  for (const def of SHARED_FIELDS) {
    const k = `shared.${def.key}`
    if (cells.has(k)) (state.shared as unknown as Record<string, unknown>)[def.key] = parseCell(def, cells.get(k))
  }

  // Sources: discover instance counts from the keys present.
  const instRe = /^(psa|lmo|cylinder|oc)\[(\d+)\]\.(.+)$/
  const maxIdx: Record<SourceType, number> = { psa: -1, lmo: -1, cylinder: -1, oc: -1 }
  for (const key of cells.keys()) {
    const m = key.match(instRe)
    if (m) maxIdx[m[1] as SourceType] = Math.max(maxIdx[m[1] as SourceType], Number(m[2]))
  }
  for (const source of SOURCE_ORDER) {
    const count = maxIdx[source] + 1
    for (let i = 0; i < count; i++) {
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
