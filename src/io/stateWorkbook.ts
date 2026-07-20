// Export the District / State planner to a single-sheet Excel workbook and
// import it back. Mirrors the facility workbook: inputs + calculations in one
// "State planner" sheet, round-trippable via a hidden machine-key in column A.
//
// Only the ACTIVE mode's inputs are written (plus the shared unit rates), so the
// sheet stays lean. In DIRECT mode the cost heads are LIVE Excel formulas over
// the district totals × rates (edit an input, the totals recompute in Excel). In
// ESTIMATE mode the per-facility figures come from the k-NN model, so the head
// amounts are seeded values — but the group sub-totals, contingency and grand
// total are still live formulas. Import reads only the keyed input rows.
import type { Workbook, Worksheet } from 'exceljs'
import {
  BAND_KEYS,
  bandLabel,
  computeStateCost,
  initialStateInputs,
} from '../state-engine'
import type { BandKey, CostGroup, DirectInputs, StateInputs, StateRates, StateResult } from '../state-engine'

// ---------------------------------------------------------------------------
// Field schema
// ---------------------------------------------------------------------------

type Kind = 'number' | 'enum'
interface FieldDef { key: string; label: string; unit?: string; kind: Kind; options?: { value: string; label: string }[]; scale?: number; money?: boolean }

/** Step-1 demand selection carried in the workbook (round-trip only). */
export interface DemandMeta { state: string; district: string | null; scenario: string }
/** What an import reconstructs: the cost inputs plus the Step-1 demand + overrides. */
export interface StateImport { inputs: StateInputs; demand: DemandMeta | null; demandOverrides: Record<string, number> }

const num = (key: string, label: string, unit?: string, money?: boolean): FieldDef => ({ key, label, unit, kind: 'number', money })
const pct = (key: string, label: string): FieldDef => ({ key, label, unit: '%', kind: 'number', scale: 100 })

// Direct-mode district totals (scalar fields; PSA/LMO maps handled separately).
const DIRECT_SCALARS: FieldDef[] = [
  num('lmoAnnualKl', 'LMO volume (total)', 'KL/yr'),
  num('cylDRefillsMo', 'D-type refills / month', '/mo'),
  num('cylBRefillsMo', 'B-type refills / month', '/mo'),
  num('cylARefillsMo', 'A-type refills / month', '/mo'),
  num('cylCount', 'Cylinders owned (total)', 'count'),
  num('ocHighUnits', 'Concentrators — high-use units', 'count'),
  num('ocHighHrs', 'High-use hrs/day', 'h'),
  num('ocLowUnits', 'Concentrators — low-use units', 'count'),
  num('ocLowHrs', 'Low-use hrs/day', 'h'),
  num('mgpsBhu', 'MGPS bed-head units (total)', 'count'),
  num('techs', 'Dedicated technicians (total)', 'count'),
  num('fingertip', 'Fingertip oximeters (total)', 'count'),
  num('bedside', 'Bedside oximeters (total)', 'count'),
  num('doctors', 'Doctors to train (total)', 'count'),
  num('nurses', 'Nurses to train (total)', 'count'),
  num('paramedics', 'Paramedics to train (total)', 'count'),
]

// State unit rates (scalars). Maps (by capacity / kl / tier) handled dynamically.
const RATE_SCALARS: FieldDef[] = [
  num('electricityTariff', 'Electricity tariff', '₹/kWh'),
  num('ocPowerKwh', 'Concentrator power', 'kWh/hr'),
  num('cylRefillD', 'D-type refill', '₹', true),
  num('cylRefillB', 'B-type refill', '₹', true),
  num('cylRefillA', 'A-type refill', '₹', true),
  num('cylTransportPerTrip', 'Cylinder transport / trip', '₹', true),
  num('cylPerTrip', 'Cylinders / trip', 'count'),
  num('cylHydrotest', 'Hydrotest / cylinder', '₹', true),
  num('lmoRatePerKg', 'LMO rate', '₹/kg'),
  pct('lmoAmcPct', 'LMO AMC rate'),
  pct('psaCamcPct', 'PSA CAMC rate'),
  pct('psaRepairPct', 'PSA repairs rate'),
  pct('mgpsAmcPct', 'MGPS AMC rate'),
  num('mgpsAssetPerBhu', 'MGPS asset / BHU', '₹', true),
  pct('mgpsRepairPct', 'MGPS repairs rate'),
  pct('ocAmcPct', 'Concentrator AMC rate'),
  num('ocAsset', 'Concentrator asset', '₹', true),
  num('ocFilterPerYear', 'Concentrator filters / yr', '₹', true),
  num('oxiFingertipPerYear', 'Fingertip oximeter / yr', '₹', true),
  num('oxiBedsideProbePerYear', 'Bedside probe / yr', '₹', true),
  pct('oxiBedsideAmcPct', 'Bedside oximeter AMC rate'),
  num('oxiBedsideAsset', 'Bedside oximeter asset', '₹', true),
  num('salaryGovtTech', 'Govt technician salary', '₹/mo', true),
  num('salaryContractTech', 'Contractual technician salary', '₹/mo', true),
  pct('govtTechShare', 'Govt technician share'),
  num('trainDoctor', 'Training — doctor', '₹', true),
  num('trainNurse', 'Training — nurse', '₹', true),
  num('trainParamedic', 'Training — paramedic', '₹', true),
  num('trainPsaTech', 'Training — PSA technician', '₹', true),
  num('refresherEveryYears', 'Refresher every', 'yrs'),
  pct('refresherPct', 'Refresher cost (of initial)'),
  pct('contingencyPct', 'Contingency buffer'),
]

const GROUP_ORDER: CostGroup[] = ['psa', 'lmo', 'cylinder', 'oc', 'mgps', 'oximeter', 'hr', 'training', 'iec']
const GROUP_LABEL: Record<CostGroup, string> = {
  psa: 'PSA plants', lmo: 'LMO', cylinder: 'Cylinders', oc: 'Concentrators', mgps: 'MGPS / piped',
  oximeter: 'Pulse oximeters', hr: 'HR / technicians', training: 'Training', iec: 'IEC & printing',
}

// ---------------------------------------------------------------------------
// Colours & formats
// ---------------------------------------------------------------------------

const FILL_HEAD = 'FF0F5A66'
const FILL_SUB = 'FFEAF1F3'
const FILL_CALC = 'FFF6F9FA'
const FILL_ENTERED = 'FFE6F4EA'
const FILL_DEFAULT = 'FFFEF3D6'
const MONEY = '"₹"#,##0'
function thin() { const s = { style: 'thin' as const, color: { argb: 'FFD8DEE1' } }; return { top: s, left: s, bottom: s, right: s } }

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function cellVal(def: FieldDef, raw: unknown): number | string {
  if (raw === null || raw === undefined || raw === '') return ''
  if (def.kind === 'enum') return def.options?.find((o) => o.value === raw)?.label ?? String(raw)
  const v = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(v) ? v * (def.scale ?? 1) : ''
}

function buildStateSheet(wb: Workbook, inputs: StateInputs, result: StateResult, demand?: DemandMeta, overrides?: Record<string, number>): void {
  const ws = wb.addWorksheet('State planner', { views: [{ state: 'frozen', ySplit: 4 }] })
  ws.columns = [
    { key: 'k', width: 30, hidden: true },
    { key: 'label', width: 46 },
    { key: 'value', width: 18 },
    { key: 'unit', width: 12 },
    { key: 'dflt', width: 14 },
  ]
  const rates = inputs.rates
  const dflt = initialStateInputs().rates

  const title = ws.addRow(['', 'OxyCost — District / State planner'])
  ws.mergeCells(`B${title.number}:E${title.number}`)
  title.getCell(2).font = { bold: true, size: 14, color: { argb: 'FF0F5A66' } }
  title.height = 22
  const note = ws.addRow(['', `Mode: ${inputs.mode === 'direct' ? 'Enter equipment (district totals)' : 'Estimate from facility sizes'}. Edit any Value; grey cells are live formulas. Re-import this file into the tool to load your inputs.`])
  ws.mergeCells(`B${note.number}:E${note.number}`)
  note.getCell(2).font = { size: 9, italic: true, color: { argb: 'FF6A7B83' } }
  const head = ws.addRow(['key', 'Field / calculation', 'Value', 'Unit', 'Default'])
  head.eachCell((c, n) => { if (n === 1) return; c.font = { bold: true, size: 10 }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF3F4' } }; c.border = thin() })
  ws.addRow([])

  const dref = new Map<string, string>()
  const rref = new Map<string, string>()

  const band = (t: string, fill = FILL_HEAD, color = 'FFFFFFFF', size = 11) => {
    const r = ws.addRow(['', t])
    ws.mergeCells(`B${r.number}:E${r.number}`)
    const c = r.getCell(2); c.font = { bold: true, size, color: { argb: color } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }; r.height = 17
  }
  const input = (key: string, def: FieldDef, raw: unknown, dv: unknown): string => {
    const cv = cellVal(def, raw)
    const row = ws.addRow([key, def.label, cv, def.unit ?? '', cellVal(def, dv)])
    const vc = row.getCell(3)
    if (typeof cv === 'number' && def.money) vc.numFmt = MONEY
    const changed = raw !== undefined && raw !== '' && raw !== dv
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: changed ? FILL_ENTERED : FILL_DEFAULT } }
    vc.border = thin()
    row.getCell(2).font = { size: 10 }
    row.getCell(4).font = { size: 9, color: { argb: 'FF6A7B83' } }
    row.getCell(5).font = { size: 9, color: { argb: 'FF9AA6AB' } }
    return `C${row.number}`
  }
  const calc = (label: string, formula: string, result: number | null, opts: { unit?: string; bold?: boolean } = {}): string => {
    const row = ws.addRow(['', label, { formula, result: result ?? undefined }, opts.unit ?? ''])
    const vc = row.getCell(3)
    vc.numFmt = MONEY
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_CALC } }
    vc.border = thin()
    vc.font = { size: 10, bold: opts.bold, color: { argb: 'FF16333B' } }
    row.getCell(2).font = { size: 10, bold: opts.bold, italic: !opts.bold, color: { argb: 'FF4A5A61' } }
    return `C${row.number}`
  }

  // ---- Demand estimate (Step 1) — round-trip only ----
  if (demand) {
    band('Demand estimate (Step 1)')
    const textRow = (key: string, label: string, value: string) => {
      const row = ws.addRow([key, label, value])
      const vc = row.getCell(3)
      vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_ENTERED } }
      vc.border = thin()
      row.getCell(2).font = { size: 10 }
    }
    textRow('demand.state', 'Demand — state', demand.state)
    textRow('demand.district', 'Demand — district (blank = whole state)', demand.district ?? '')
    textRow('demand.scenario', 'Demand — scenario (normal / pandemic)', demand.scenario)
    textRow('demand.overrides', 'Demand overrides (annual MT, JSON)', JSON.stringify(overrides ?? {}))
  }

  // ---- Inputs: active mode ----
  if (inputs.mode === 'estimate') {
    band('Facility counts by size band')
    for (const b of BAND_KEYS) {
      input(`counts.${b}`, num(`counts.${b}`, `# facilities — ${bandLabel(b)}`, 'count'), inputs.counts[b], 0)
      input(`beds.${b}`, num(`beds.${b}`, `Typical oxygen beds — ${bandLabel(b)}`, 'beds'), inputs.beds[b], initialStateInputs().beds[b])
    }
    // Per-band overrides that the user set (round-trip only).
    const ovRows: [string, number][] = []
    for (const b of BAND_KEYS) for (const [k, v] of Object.entries(inputs.overrides[b] ?? {})) if (typeof v === 'number') ovRows.push([`overrides.${b}.${k}`, v])
    if (ovRows.length) {
      band('Per-band overrides (advanced)', FILL_SUB, 'FF16333B', 10)
      for (const [key, v] of ovRows) input(key, num(key, key.replace('overrides.', ''), ''), v, undefined)
    }
  } else {
    const d = inputs.direct as unknown as Record<string, unknown>
    const dd = initialStateInputs().direct as unknown as Record<string, unknown>
    band('PSA plants — by capacity (total · functional · hrs/day)')
    for (const cap of Object.keys(rates.psaPowerByCapacity).sort((a, b) => Number(a) - Number(b))) {
      const row = inputs.direct.psaByCapacity[cap] ?? { total: 0, functional: 0, hrs: 0 }
      dref.set(`direct.psaByCapacity.${cap}.total`, input(`direct.psaByCapacity.${cap}.total`, num('', `${cap} LPM — total plants`, 'count'), row.total, 0))
      dref.set(`direct.psaByCapacity.${cap}.functional`, input(`direct.psaByCapacity.${cap}.functional`, num('', `${cap} LPM — functional`, 'count'), row.functional, 0))
      dref.set(`direct.psaByCapacity.${cap}.hrs`, input(`direct.psaByCapacity.${cap}.hrs`, num('', `${cap} LPM — hrs/day (functional)`, 'h'), row.hrs, 0))
    }
    band('LMO tanks — by size + volume')
    for (const kl of Object.keys(rates.lmoAssetByKl).sort((a, b) => Number(a) - Number(b))) {
      dref.set(`direct.lmoTanksByKl.${kl}`, input(`direct.lmoTanksByKl.${kl}`, num('', `${kl} KL tanks`, 'count'), inputs.direct.lmoTanksByKl[kl] ?? 0, 0))
    }
    band('Cylinders, concentrators, MGPS, staff & training')
    for (const def of DIRECT_SCALARS) dref.set(`direct.${def.key}`, input(`direct.${def.key}`, def, d[def.key], dd[def.key]))
    band('Facilities by type — for IEC / printing')
    for (const tier of ['large', 'mid', 'small'] as const) {
      dref.set(`direct.facilitiesByTier.${tier}`, input(`direct.facilitiesByTier.${tier}`, num('', `${tier} facilities`, 'count'), inputs.direct.facilitiesByTier[tier], 0))
    }
  }

  // ---- State unit rates (apply to both modes) ----
  band('State unit rates')
  for (const def of RATE_SCALARS) rref.set(`rates.${def.key}`, input(`rates.${def.key}`, def, (rates as unknown as Record<string, unknown>)[def.key], (dflt as unknown as Record<string, unknown>)[def.key]))
  for (const cap of Object.keys(rates.psaPowerByCapacity).sort((a, b) => Number(a) - Number(b))) {
    rref.set(`rates.psaPowerByCapacity.${cap}`, input(`rates.psaPowerByCapacity.${cap}`, num('', `PSA power — ${cap} LPM`, 'kWh/hr'), rates.psaPowerByCapacity[cap], dflt.psaPowerByCapacity[cap]))
    rref.set(`rates.psaAssetByCapacity.${cap}`, input(`rates.psaAssetByCapacity.${cap}`, num('', `PSA asset — ${cap} LPM`, '₹', true), rates.psaAssetByCapacity[cap], dflt.psaAssetByCapacity[cap]))
  }
  for (const kl of Object.keys(rates.lmoAssetByKl).sort((a, b) => Number(a) - Number(b))) {
    rref.set(`rates.lmoAssetByKl.${kl}`, input(`rates.lmoAssetByKl.${kl}`, num('', `LMO tank asset — ${kl} KL`, '₹', true), rates.lmoAssetByKl[kl], dflt.lmoAssetByKl[kl]))
  }
  for (const tier of ['large', 'mid', 'small'] as const) {
    rref.set(`rates.iec.${tier}`, input(`rates.iec.${tier}`, num('', `IEC — ${tier}`, '₹/yr', true), rates.iec[tier], dflt.iec[tier]))
  }

  // ---- Calculations ----
  band('Calculations — annual cost by head (₹)')
  const formulaFor = inputs.mode === 'direct' ? directHeadFormulas(inputs.direct, rates, dref, rref, calc) : null
  const groupSubRefs: string[] = []
  for (const g of GROUP_ORDER) {
    const heads = result.heads.filter((h) => h.group === g && (Math.abs(h.annual) > 0.5 || formulaFor))
    if (heads.length === 0) continue
    band(GROUP_LABEL[g], FILL_SUB, 'FF16333B', 10)
    const refs: string[] = []
    for (const h of heads) {
      const f = formulaFor?.get(h.key)
      const ref = f
        ? calc(h.label + (h.oneTime ? ' (one-time)' : ''), f, h.annual)
        : calc(h.label + (h.oneTime ? ' (one-time)' : ''), '', h.annual) // estimate: seeded value, no formula
      refs.push(ref)
    }
    if (refs.length) {
      const sub = calc(`${GROUP_LABEL[g]} — subtotal`, `SUM(${refs[0]}:${refs[refs.length - 1]})`, heads.reduce((a, h) => a + h.annual, 0), { bold: true })
      groupSubRefs.push(sub)
    }
  }
  ws.addRow([])
  band('Total annual budget')
  const subtotalRef = calc('Subtotal (all heads)', groupSubRefs.length ? `SUM(${groupSubRefs.join(',')})` : '0', result.subtotal, { bold: true })
  const contRef = calc('Contingency buffer', `${subtotalRef}*${rref.get('rates.contingencyPct')}/100`, result.contingency)
  calc('TOTAL annual budget', `${subtotalRef}+${contRef}`, result.total, { bold: true })
}

/** Live Excel formulas for each direct-mode cost head (mirrors compute.ts directHeads). */
function directHeadFormulas(
  d: DirectInputs,
  rates: StateRates,
  dref: Map<string, string>,
  rref: Map<string, string>,
  calc: (l: string, f: string, r: number | null, o?: { unit?: string; bold?: boolean }) => string,
): Map<string, string> {
  const caps = Object.keys(rates.psaPowerByCapacity).sort((a, b) => Number(a) - Number(b))
  const kls = Object.keys(rates.lmoAssetByKl).sort((a, b) => Number(a) - Number(b))
  const D = (k: string) => dref.get(`direct.${k}`) ?? '0'
  const R = (k: string) => rref.get(`rates.${k}`) ?? '0'
  const pf = (c: string) => dref.get(`direct.psaByCapacity.${c}.functional`) ?? '0'
  const pt = (c: string) => dref.get(`direct.psaByCapacity.${c}.total`) ?? '0'
  const ph = (c: string) => dref.get(`direct.psaByCapacity.${c}.hrs`) ?? '0'
  const pw = (c: string) => rref.get(`rates.psaPowerByCapacity.${c}`) ?? '0'
  const pa = (c: string) => rref.get(`rates.psaAssetByCapacity.${c}`) ?? '0'
  const lt = (kl: string) => dref.get(`direct.lmoTanksByKl.${kl}`) ?? '0'
  const la = (kl: string) => rref.get(`rates.lmoAssetByKl.${kl}`) ?? '0'

  // Seed values (mirror engine) for intermediate cells.
  const psaAssetBaseVal = caps.reduce((a, c) => a + (d.psaByCapacity[c]?.total ?? 0) * (rates.psaAssetByCapacity[c] ?? 0), 0)
  const psaCountVal = caps.reduce((a, c) => a + (d.psaByCapacity[c]?.total ?? 0), 0)
  const lmoAssetBaseVal = kls.reduce((a, kl) => a + (d.lmoTanksByKl[kl] ?? 0) * (rates.lmoAssetByKl[kl] ?? 0), 0)
  const annualRefillsVal = (d.cylDRefillsMo + d.cylBRefillsMo + d.cylARefillsMo) * 12
  const trainInitVal = d.doctors * rates.trainDoctor + d.nurses * rates.trainNurse + d.paramedics * rates.trainParamedic

  // Intermediate helper rows (kept together, referenced by the heads below).
  const psaAssetBase = calc('PSA asset base (owned × asset)', caps.length ? caps.map((c) => `${pt(c)}*${pa(c)}`).join('+') : '0', psaAssetBaseVal)
  const psaCount = calc('PSA plants (total, all sizes)', caps.length ? caps.map((c) => pt(c)).join('+') : '0', psaCountVal)
  const lmoAssetBase = calc('LMO tank asset base', kls.length ? kls.map((kl) => `${lt(kl)}*${la(kl)}`).join('+') : '0', lmoAssetBaseVal)
  const annualRefills = calc('Cylinder refills / year', `(${D('cylDRefillsMo')}+${D('cylBRefillsMo')}+${D('cylARefillsMo')})*12`, annualRefillsVal)
  const trainInit = calc('Initial training total', `${D('doctors')}*${R('trainDoctor')}+${D('nurses')}*${R('trainNurse')}+${D('paramedics')}*${R('trainParamedic')}`, trainInitVal)

  const f = new Map<string, string>()
  f.set('elec_psa', caps.length ? caps.map((c) => `${pf(c)}*${ph(c)}*365*${pw(c)}*${R('electricityTariff')}`).join('+') : '0')
  f.set('elec_oc', `(${D('ocHighUnits')}*${D('ocHighHrs')}+${D('ocLowUnits')}*${D('ocLowHrs')})*365*${R('ocPowerKwh')}*${R('electricityTariff')}`)
  f.set('lmo_refill', `${D('lmoAnnualKl')}*1000*${R('lmoRatePerKg')}`)
  f.set('cyl_refill_d', `${D('cylDRefillsMo')}*12*${R('cylRefillD')}`)
  f.set('cyl_refill_b', `${D('cylBRefillsMo')}*12*${R('cylRefillB')}`)
  f.set('cyl_refill_a', `${D('cylARefillsMo')}*12*${R('cylRefillA')}`)
  f.set('cyl_transport', `IF(${R('cylPerTrip')}>0,(${annualRefills}/${R('cylPerTrip')})*${R('cylTransportPerTrip')},0)`)
  f.set('amc_psa', `${psaAssetBase}*${R('psaCamcPct')}/100`)
  f.set('amc_lmo', `${lmoAssetBase}*${R('lmoAmcPct')}/100`)
  f.set('amc_mgps', `${D('mgpsBhu')}*${R('mgpsAssetPerBhu')}*${R('mgpsAmcPct')}/100`)
  f.set('amc_oc', `(${D('ocHighUnits')}+${D('ocLowUnits')})*${R('ocAsset')}*${R('ocAmcPct')}/100`)
  f.set('amc_oxi', `${D('bedside')}*${R('oxiBedsideAsset')}*${R('oxiBedsideAmcPct')}/100`)
  f.set('repairs_psa', `${psaAssetBase}*${R('psaRepairPct')}/100`)
  f.set('repairs_mgps', `${D('mgpsBhu')}*${R('mgpsAssetPerBhu')}*${R('mgpsRepairPct')}/100`)
  f.set('consum_oc', `(${D('ocHighUnits')}+${D('ocLowUnits')})*${R('ocFilterPerYear')}`)
  f.set('consum_oxi', `${D('fingertip')}*${R('oxiFingertipPerYear')}+${D('bedside')}*${R('oxiBedsideProbePerYear')}`)
  f.set('hydrotest', `${D('cylCount')}*${R('cylHydrotest')}/5`)
  f.set('hr_govt', `${D('techs')}*${R('govtTechShare')}/100*${R('salaryGovtTech')}*12`)
  f.set('hr_contract', `${D('techs')}*(1-${R('govtTechShare')}/100)*${R('salaryContractTech')}*12`)
  f.set('train_initial', `${trainInit}`)
  f.set('train_refresher', `IF(${R('refresherEveryYears')}>0,${trainInit}*${R('refresherPct')}/100/${R('refresherEveryYears')},0)`)
  f.set('train_psa_tech', `IF(${psaCount}>0,${D('techs')}*${R('trainPsaTech')},0)`)
  f.set('iec', `${R('iec.small')}*${D('facilitiesByTier.small')}+${R('iec.mid')}*${D('facilitiesByTier.mid')}+${R('iec.large')}*${D('facilitiesByTier.large')}`)
  return f
}

export async function stateWorkbookBuffer(inputs: StateInputs, demand?: DemandMeta, overrides?: Record<string, number>): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'OxyCost'
  buildStateSheet(wb, inputs, computeStateCost(inputs), demand, overrides)
  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}

export async function exportStateWorkbook(inputs: StateInputs, demand?: DemandMeta, overrides?: Record<string, number>): Promise<void> {
  const buf = await stateWorkbookBuffer(inputs, demand, overrides)
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dt = new Date()
  a.download = `OxyCost-state-${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function numFromCell(cell: unknown, scale = 1): number {
  if (cell === null || cell === undefined || cell === '') return 0
  const raw = typeof cell === 'object' && cell !== null && 'result' in cell ? (cell as { result: unknown }).result : cell
  const v = typeof raw === 'number' ? raw : Number(String(raw).replace(/[₹,\s%]/g, ''))
  return Number.isFinite(v) ? v / scale : 0
}

export async function importStateWorkbook(file: File): Promise<StateImport> {
  return importStateWorkbookBuffer(await file.arrayBuffer())
}

/** Read a text/enum cell to a plain string. */
function strFromCell(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  if (typeof cell === 'object' && 'text' in (cell as object)) return String((cell as { text?: unknown }).text ?? '')
  if (typeof cell === 'object' && 'result' in (cell as object)) return String((cell as { result?: unknown }).result ?? '')
  return String(cell)
}

export async function importStateWorkbookBuffer(buf: ArrayBuffer): Promise<StateImport> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const ws: Worksheet | undefined = wb.getWorksheet('State planner') ?? wb.worksheets[0]
  if (!ws) throw new Error('No worksheet found — is this an OxyCost state export?')

  const cells = new Map<string, unknown>()
  ws.eachRow((row) => {
    const key = row.getCell(1).value
    if (typeof key !== 'string' || !key) return
    cells.set(key, row.getCell(3).value)
  })
  const recognised = [...cells.keys()].some((k) => k === 'mode' || k.startsWith('rates.') || k.startsWith('direct.') || k.startsWith('counts.') || k.startsWith('beds.'))
  if (!recognised) throw new Error('This workbook doesn’t look like an OxyCost state export (no recognisable fields).')

  const s = initialStateInputs()
  const rateScale = new Map(RATE_SCALARS.map((d) => [d.key, d.scale ?? 1]))

  for (const [key, cell] of cells) {
    if (key.startsWith('rates.')) {
      const rest = key.slice(6)
      const rmap = s.rates as unknown as Record<string, unknown>
      if (rest.includes('.')) {
        const [mapKey, sub] = rest.split('.')
        const m = rmap[mapKey] as Record<string, number>
        if (m) m[sub] = numFromCell(cell)
      } else {
        rmap[rest] = numFromCell(cell, rateScale.get(rest) ?? 1)
      }
    } else if (key.startsWith('counts.')) {
      s.counts[key.slice(7) as BandKey] = Math.max(0, Math.round(numFromCell(cell)))
    } else if (key.startsWith('beds.')) {
      s.beds[key.slice(5) as BandKey] = numFromCell(cell)
    } else if (key.startsWith('overrides.')) {
      const [, b, field] = key.split('.')
      ;(s.overrides[b as BandKey] as Record<string, number>)[field] = numFromCell(cell)
    } else if (key.startsWith('direct.')) {
      const rest = key.slice(7)
      const dobj = s.direct as unknown as Record<string, unknown>
      if (rest.startsWith('psaByCapacity.')) {
        const [, cap, prop] = rest.split('.')
        const map = s.direct.psaByCapacity
        if (!map[cap]) map[cap] = { total: 0, functional: 0, hrs: 0 }
        ;(map[cap] as unknown as Record<string, number>)[prop] = numFromCell(cell)
      } else if (rest.startsWith('lmoTanksByKl.')) {
        s.direct.lmoTanksByKl[rest.split('.')[1]] = Math.max(0, Math.round(numFromCell(cell)))
      } else if (rest.startsWith('facilitiesByTier.')) {
        s.direct.facilitiesByTier[rest.split('.')[1] as 'small' | 'mid' | 'large'] = Math.max(0, Math.round(numFromCell(cell)))
      } else {
        dobj[rest] = numFromCell(cell)
      }
    }
  }

  if (cells.has('mode')) {
    const m = String((cells.get('mode') as { text?: string })?.text ?? cells.get('mode') ?? '').toLowerCase()
    s.mode = m.includes('direct') || m.includes('equipment') ? 'direct' : 'estimate'
  } else {
    // Infer from which inputs are present.
    s.mode = [...cells.keys()].some((k) => k.startsWith('direct.')) ? 'direct' : 'estimate'
  }

  // Step-1 demand selection + overrides (present only in newer exports).
  let demand: DemandMeta | null = null
  let demandOverrides: Record<string, number> = {}
  if (cells.has('demand.state')) {
    const district = strFromCell(cells.get('demand.district')).trim()
    const scenario = strFromCell(cells.get('demand.scenario')).trim().toLowerCase()
    demand = {
      state: strFromCell(cells.get('demand.state')).trim(),
      district: district || null,
      scenario: scenario === 'pandemic' ? 'pandemic' : 'normal',
    }
    try {
      const parsed = JSON.parse(strFromCell(cells.get('demand.overrides')) || '{}') as Record<string, number>
      if (parsed && typeof parsed === 'object') demandOverrides = parsed
    } catch { /* ignore malformed overrides */ }
  }

  return { inputs: s, demand, demandOverrides }
}
