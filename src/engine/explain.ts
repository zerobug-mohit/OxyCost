// Calculation drill-down: turns a source's inputs + result into a step-by-step,
// numbers-substituted explanation for the UI. Pure (no UI dependency); every
// formula mirrors the corresponding calculator and the CALC-XXX spec IDs.
//
// Formulas are token arrays, not plain strings: a token is either literal text
// or a FieldRef that ties a substituted number back to the input field it came
// from, so the UI can make it a clickable link to that field on the left pane.

import { CYL_VOLUME, LMO_EXPANSION } from './constants'
import { effectivePsaPlantCost, resolvePsaAmc } from './psa'
import type { InstanceInputs } from './sweep'
import type {
  CylinderInputs,
  LmoInputs,
  OcInputs,
  PsaInputs,
  SourceResult,
  SourceType,
} from './types'

/** A run of formula text that came from a specific input field. */
export interface FieldRef {
  /** Display text (the substituted number, with its unit). */
  t: string
  /** The input property this value came from — the link target. */
  field: string
}
/** One piece of a formula: plain text, or a link back to an input field. */
export type FormulaPart = string | FieldRef

/** Flatten a token formula to plain text (for tests / fallbacks). */
export function partsText(parts: FormulaPart[]): string {
  return parts.map((p) => (typeof p === 'string' ? p : p.t)).join('')
}

export interface CalcStep {
  /** Component/quantity name. */
  label: string
  /** Formula with the actual input numbers substituted in, as linkable tokens. */
  formula: FormulaPart[]
  /** Formatted result of this step. */
  value: string
  /** True if this quantity scales with run hours / volume. */
  variable?: boolean
}

export interface SourceExplanation {
  title: string
  /** How the monthly output volume is derived. */
  output: CalcStep
  /** Each monthly cost component, with formula and amount. */
  components: CalcStep[]
  /** Total monthly cost (formatted). */
  totalValue: string
  /** The three per-cu-m derivations. */
  perUnit: CalcStep[]
}

// --- formatting helpers (kept local so the engine stays dependency-free) -----

function n(value: number, dp = 0): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })
}
function inr(value: number, dp = 0): string {
  return `₹${n(value, dp)}`
}
function rate(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `₹${n(value, 2)}/cu m`
}
function amountOf(result: SourceResult, key: string): number {
  return result.components.find((c) => c.key === key)?.amount ?? 0
}
/** Build a field-link token. */
function ref(t: string, field: string): FieldRef {
  return { t, field }
}

// --- per-source builders -----------------------------------------------------

function explainPsa(p: PsaInputs, r: SourceResult): SourceExplanation {
  const runFr = p.psa_compressor_run_fraction
  const powFr = p.psa_compressor_power_fraction
  const util = p.psa_capacity_utilization
  const prodHours = p.psa_run_hours_monthly * runFr
  const amc = resolvePsaAmc(p)
  const dep = amountOf(r, 'depreciation')
  const rented = p.psa_ownership === 'rented'
  const plantCost = effectivePsaPlantCost(p)

  return {
    title: r.label,
    output: {
      label: 'Oxygen produced (cu m)',
      formula: [
        ref(`${n(p.psa_run_hours_monthly, 1)} run hrs`, 'psa_run_hours_monthly'),
        ' × ',
        ref(`${n(runFr, 2)} compressor-run`, 'psa_compressor_run_fraction'),
        ` = ${n(prodHours, 1)} production hrs × 60 × ${n(p.psa_capacity_lpm)} LPM × `,
        ref(`${n(util, 2)} utilization`, 'psa_capacity_utilization'),
        ' ÷ 1000',
      ],
      value: `${n(r.monthly_output_cu_m, 1)} cu m`,
    },
    components: [
      {
        label: 'Electricity (usage)',
        formula: [
          'compressor ',
          ref(`${n(p.psa_power_kw, 1)} KW`, 'psa_power_kw'),
          ' × ',
          ref(`${n(powFr, 2)} power share`, 'psa_compressor_power_fraction'),
          ` × ${n(prodHours, 1)} prod hrs + balance `,
          ref(`${n(p.psa_power_kw, 1)} KW`, 'psa_power_kw'),
          ' × ',
          ref(`${n(1 - powFr, 2)} rest`, 'psa_compressor_power_fraction'),
          ' × ',
          ref(`${n(p.psa_run_hours_monthly, 1)} run hrs`, 'psa_run_hours_monthly'),
          ', × ',
          ref(`₹${n(p.electricity_rate_per_kwh, 2)}/kWh`, 'electricity_rate_per_kwh'),
        ],
        value: inr(amountOf(r, 'electricity_usage')),
        variable: true,
      },
      {
        label: 'Electricity (fixed)',
        formula: [ref('Fixed monthly demand/contract charge', 'electricity_fixed_monthly')],
        value: inr(amountOf(r, 'electricity_fixed')),
      },
      {
        label: 'Maintenance (AMC/CMC)',
        formula: [ref(`${inr(amc)}`, 'psa_amc_annual'), ' per year ÷ 12'],
        value: inr(amountOf(r, 'maintenance')),
      },
      {
        label: 'Repairs',
        formula: [ref(`${inr(p.psa_repair_annual)}`, 'psa_repair_annual'), ' per year ÷ 12'],
        value: inr(amountOf(r, 'repairs')),
      },
      {
        label: 'Consumables / spares',
        formula: [
          ref(`${inr(p.psa_consumables_annual)}`, 'psa_consumables_annual'),
          ' per year ÷ 12',
        ],
        value: inr(amountOf(r, 'consumables')),
      },
      {
        label: 'Plant rental',
        formula: rented
          ? [ref('Fixed monthly rent (plant is rented, not owned)', 'psa_rental_monthly')]
          : ['Plant is owned — no rent'],
        value: inr(amountOf(r, 'rental')),
      },
      {
        label: 'Depreciation',
        formula: rented
          ? ['Plant is rented — no depreciation']
          : [
              ref(`${inr(plantCost)}`, 'psa_plant_cost'),
              ' ÷ ',
              ref(`${n(p.psa_plant_life_years)} yrs`, 'psa_plant_life_years'),
              ' ÷ 12',
            ],
        value: inr(dep),
      },
    ],
    totalValue: inr(r.total_monthly_cost),
    perUnit: psaPerUnit(r, dep, 'Electricity usage'),
  }
}

function explainLmo(l: LmoInputs, r: SourceResult): SourceExplanation {
  const v = l.lmo_monthly_cu_m
  const refillPerCuM = (l.lmo_refill_base_per_litre * (1 + l.lmo_refill_gst)) / LMO_EXPANSION
  const handlePerCuM =
    (l.lmo_handling_base_per_litre * (1 + l.lmo_handling_gst)) / LMO_EXPANSION
  const dep = amountOf(r, 'depreciation')
  const rented = l.lmo_ownership !== 'purchased'
  const loss = Math.min(0.95, Math.max(0, l.lmo_loss_pct))
  const lossNote: FormulaPart[] =
    loss > 0 ? [' ÷ (1 − ', ref(`${n(loss, 2)} boil-off`, 'lmo_loss_pct'), ')'] : []

  return {
    title: r.label,
    output: {
      label: 'Oxygen delivered (cu m)',
      formula: [
        'Equal to the monthly consumption entered (purchased volume is higher by the boil-off loss)',
      ],
      value: `${n(v, 1)} cu m`,
    },
    components: [
      {
        label: 'Tank rental',
        formula: rented
          ? [ref('Fixed monthly rental (incl. 18% GST)', 'lmo_rental_monthly')]
          : ['Tank is owned — no rent'],
        value: inr(amountOf(r, 'rental')),
      },
      {
        label: 'Refilling',
        formula: [
          ref(`₹${n(l.lmo_refill_base_per_litre, 2)}`, 'lmo_refill_base_per_litre'),
          ` × ${(1 + l.lmo_refill_gst).toFixed(2)} ÷ 0.861 = ${rate(refillPerCuM)}, × `,
          ref(`${n(v, 0)} cu m`, 'lmo_monthly_cu_m'),
          ...lossNote,
        ],
        value: inr(amountOf(r, 'refilling')),
        variable: true,
      },
      {
        label: 'Handling & transport',
        formula: [
          ref(`₹${n(l.lmo_handling_base_per_litre, 2)}`, 'lmo_handling_base_per_litre'),
          ` × ${(1 + l.lmo_handling_gst).toFixed(2)} ÷ 0.861 = ${rate(handlePerCuM)}, × `,
          ref(`${n(v, 0)} cu m`, 'lmo_monthly_cu_m'),
          ...lossNote,
        ],
        value: inr(amountOf(r, 'handling')),
        variable: true,
      },
      {
        label: 'Depreciation',
        formula: rented
          ? ['Tank is rented — no depreciation']
          : [
              ref(`${inr(l.lmo_tank_cost)}`, 'lmo_tank_cost'),
              ' ÷ ',
              ref(`${n(l.lmo_tank_life_years)} yrs`, 'lmo_tank_life_years'),
              ' ÷ 12',
            ],
        value: inr(dep),
      },
    ],
    totalValue: inr(r.total_monthly_cost),
    perUnit: [
      capexOpexStep(r),
      opexStep(r, dep),
      {
        label: 'Incremental / cu m',
        formula: [
          `(refilling ${rate(refillPerCuM)} + handling ${rate(handlePerCuM)})`,
          ...lossNote,
          ' — rent already sunk',
        ],
        value: rate(r.incremental_cost_per_cu_m),
      },
    ],
  }
}

function explainCylinder(c: CylinderInputs, r: SourceResult): SourceExplanation {
  const vol = CYL_VOLUME[c.cyl_type]
  const owned = c.cyl_owned_count ?? c.cyl_monthly_count
  const rotations = owned > 0 ? (c.cyl_monthly_count / owned) * 12 * c.cyl_lifetime_years : 0

  return {
    title: r.label,
    output: {
      label: 'Oxygen supplied (cu m)',
      formula: [
        ref(`${n(c.cyl_monthly_count, 1)} cylinders/mo`, 'cyl_monthly_count'),
        ` × ${vol} cu m each`,
      ],
      value: `${n(r.monthly_output_cu_m, 1)} cu m`,
    },
    components: [
      {
        label: 'Cylinder refills',
        formula: [
          ref(`${inr(c.cyl_refill_cost)}`, 'cyl_refill_cost'),
          ' × ',
          ref(`${n(c.cyl_monthly_count, 1)} cylinders`, 'cyl_monthly_count'),
        ],
        value: inr(amountOf(r, 'refills')),
        variable: true,
      },
      {
        label: 'Transport',
        formula: [
          ref(`${inr(c.cyl_transport_per_trip)}/trip`, 'cyl_transport_per_trip'),
          ' ÷ ',
          ref(`${n(c.cyl_cylinders_per_trip, 0)} per trip`, 'cyl_cylinders_per_trip'),
          ' × ',
          ref(`${n(c.cyl_monthly_count, 1)} cylinders`, 'cyl_monthly_count'),
        ],
        value: inr(amountOf(r, 'transport')),
        variable: true,
      },
      {
        label: 'Cylinder purchase (amortized)',
        formula: [
          ref(`${n(owned, 1)} owned`, 'cyl_owned_count'),
          ' × ',
          ref(`${inr(c.cyl_purchase_price)}`, 'cyl_purchase_price'),
          ' ÷ (',
          ref(`${n(c.cyl_lifetime_years)} yrs`, 'cyl_lifetime_years'),
          ` × 12)  [≈ ${n(rotations, 0)} refill rotations over life]`,
        ],
        value: inr(amountOf(r, 'capex')),
      },
      {
        label: 'Hydrostatic testing',
        formula: [
          ref(`${n(owned, 1)} owned`, 'cyl_owned_count'),
          ' × ',
          ref(`${inr(c.cyl_hydrotest_cost)}`, 'cyl_hydrotest_cost'),
          ' ÷ (',
          ref(`${n(c.cyl_hydrotest_interval_years)} yrs`, 'cyl_hydrotest_interval_years'),
          ' × 12)',
        ],
        value: inr(amountOf(r, 'hydrotest')),
      },
    ],
    totalValue: inr(r.total_monthly_cost),
    perUnit: [
      capexOpexStep(r),
      {
        label: 'Opex / cu m',
        formula: [`(refill + transport) ÷ ${vol} cu m + hydrotest share`],
        value: rate(r.per_cu_m_opex_only),
      },
      {
        label: 'Incremental / cu m',
        formula: [
          '(refill ',
          ref(`${inr(c.cyl_refill_cost)}`, 'cyl_refill_cost'),
          ` + transport) ÷ ${vol} cu m (every extra cylinder is a fresh refill)`,
        ],
        value: rate(r.incremental_cost_per_cu_m),
      },
    ],
  }
}

function explainOc(o: OcInputs, r: SourceResult): SourceExplanation {
  const deployed = o.oc_high_use_units + o.oc_low_use_units
  const dailyUnitHours =
    o.oc_high_use_units * o.oc_high_use_hours + o.oc_low_use_units * o.oc_low_use_hours
  const dep = amountOf(r, 'depreciation')

  return {
    title: r.label,
    output: {
      label: 'Oxygen produced (cu m)',
      formula: [
        '(',
        ref(`${n(o.oc_high_use_units)}`, 'oc_high_use_units'),
        '×',
        ref(`${n(o.oc_high_use_hours, 1)}h`, 'oc_high_use_hours'),
        ' + ',
        ref(`${n(o.oc_low_use_units)}`, 'oc_low_use_units'),
        '×',
        ref(`${n(o.oc_low_use_hours, 1)}h`, 'oc_low_use_hours'),
        `) = ${n(dailyUnitHours, 1)} unit-hrs/day × `,
        ref(`${n(o.oc_days_per_month)} days`, 'oc_days_per_month'),
        ` × ${n(o.oc_output_lpm)} LPM × 60 ÷ 1000`,
      ],
      value: `${n(r.monthly_output_cu_m, 1)} cu m`,
    },
    components: [
      {
        label: 'Electricity',
        formula: [
          `${n(dailyUnitHours, 1)} unit-hrs/day × `,
          ref(`${n(o.oc_days_per_month)} days`, 'oc_days_per_month'),
          ' × ',
          ref(`${n(o.oc_power_watts)} W`, 'oc_power_watts'),
          ' ÷ 1000 × ',
          ref(`₹${n(o.oc_electricity_rate, 2)}/kWh`, 'oc_electricity_rate'),
        ],
        value: inr(amountOf(r, 'electricity')),
        variable: true,
      },
      {
        label: 'Maintenance',
        formula: [
          `${n(deployed)} deployed units × `,
          ref(`${inr(o.oc_maintenance_per_unit)}/yr`, 'oc_maintenance_per_unit'),
          ' ÷ 12',
        ],
        value: inr(amountOf(r, 'maintenance')),
      },
      {
        label: 'Depreciation',
        formula: [
          `${n(deployed)} deployed units × `,
          ref(`${inr(o.oc_price_per_unit)}`, 'oc_price_per_unit'),
          ' ÷ (',
          ref(`${n(o.oc_life_years)} yrs`, 'oc_life_years'),
          ' × 12)',
        ],
        value: inr(dep),
      },
    ],
    totalValue: inr(r.total_monthly_cost),
    perUnit: psaPerUnit(r, dep, 'Electricity'),
  }
}

// Shared per-unit step builders -----------------------------------------------

function capexOpexStep(r: SourceResult): CalcStep {
  return {
    label: 'Capex + opex / cu m',
    formula: [`${inr(r.total_monthly_cost)} total ÷ ${n(r.monthly_output_cu_m, 1)} cu m`],
    value: rate(r.per_cu_m_capex_opex),
  }
}
function opexStep(r: SourceResult, dep: number): CalcStep {
  return {
    label: 'Opex / cu m',
    formula: [
      `(${inr(r.total_monthly_cost)} − ${inr(dep)} depreciation) ÷ ${n(r.monthly_output_cu_m, 1)} cu m`,
    ],
    value: rate(r.per_cu_m_opex_only),
  }
}
function psaPerUnit(r: SourceResult, dep: number, incrLabel: string): CalcStep[] {
  return [
    capexOpexStep(r),
    opexStep(r, dep),
    {
      label: 'Incremental / cu m',
      formula: [
        `${incrLabel} only ÷ ${n(r.monthly_output_cu_m, 1)} cu m (fixed costs already sunk)`,
      ],
      value: rate(r.incremental_cost_per_cu_m),
    },
  ]
}

/** Build a step-by-step explanation for one source instance's result. */
export function explainSource(
  source: SourceType,
  instance: InstanceInputs,
  result: SourceResult,
): SourceExplanation {
  switch (source) {
    case 'psa':
      return explainPsa(instance as PsaInputs, result)
    case 'lmo':
      return explainLmo(instance as LmoInputs, result)
    case 'cylinder':
      return explainCylinder(instance as CylinderInputs, result)
    case 'oc':
      return explainOc(instance as OcInputs, result)
  }
}
