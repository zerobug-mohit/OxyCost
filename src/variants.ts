// Step-2 "variant" model: each source is configured by choosing a variant
// (capacity / type / output) and how many units of it. The variant is stored on
// the instance and drives the calculation (PSA capacity, cylinder type, OC LPM);
// LMO capacity is descriptive only. Remaining details are filled per unit in Step 3.
import {
  LMO_CAPACITY_OPTIONS,
  OC_OUTPUT_OPTIONS,
  PSA_COMMON_CAPACITIES,
} from './engine'
import type { CylinderType, SourceType } from './engine'

export type VariantValue = number | string

/** The variant value carried by an instance (capacity / KL / LPM / cyl type). */
export function variantValueOf(source: SourceType, inst: unknown): VariantValue {
  const i = inst as Record<string, VariantValue>
  switch (source) {
    case 'psa':
      return i.psa_capacity_lpm
    case 'lmo':
      return i.lmo_capacity_kl
    case 'cylinder':
      return i.cyl_type
    case 'oc':
      return i.oc_output_lpm
  }
}

/** Set the variant value on an instance. */
export function withVariant<T>(inst: T, source: SourceType, value: VariantValue): T {
  switch (source) {
    case 'psa':
      return { ...inst, psa_capacity_lpm: value as number }
    case 'lmo':
      return { ...inst, lmo_capacity_kl: value as number }
    case 'cylinder':
      return { ...inst, cyl_type: value as CylinderType }
    case 'oc':
      return { ...inst, oc_output_lpm: value as number }
  }
}

export interface VariantOption {
  value: VariantValue
  label: string
  short: string
}

export interface SourceVariantConfig {
  options: VariantOption[]
  custom: boolean
  unit: string
}

export const SOURCE_VARIANTS: Record<SourceType, SourceVariantConfig> = {
  psa: {
    options: PSA_COMMON_CAPACITIES.map((c) => ({ value: c, label: `${c} LPM`, short: `${c} LPM` })),
    custom: true,
    unit: 'LPM',
  },
  lmo: {
    options: LMO_CAPACITY_OPTIONS.map((c) => ({ value: c, label: `${c} KL`, short: `${c} KL` })),
    custom: true,
    unit: 'KL',
  },
  cylinder: {
    options: [
      { value: 'd_type', label: 'D-type (Jumbo · 7 cu m)', short: 'D-type' },
      { value: 'b_type', label: 'B-type (1.5 cu m)', short: 'B-type' },
    ],
    custom: false,
    unit: '',
  },
  oc: {
    options: OC_OUTPUT_OPTIONS.map((c) => ({ value: c, label: `${c} LPM`, short: `${c} LPM` })),
    custom: true,
    unit: 'LPM',
  },
}

/** True if a value is one of the source's preset variant options. */
export function isPreset(source: SourceType, value: VariantValue): boolean {
  return SOURCE_VARIANTS[source].options.some((o) => o.value === value)
}

/** Short label for a variant value, for instance headers and Step 2 rows. */
export function variantLabel(source: SourceType, value: VariantValue): string {
  const opt = SOURCE_VARIANTS[source].options.find((o) => o.value === value)
  if (opt) return opt.short
  if (source === 'cylinder') return String(value)
  const unit = SOURCE_VARIANTS[source].unit
  return value ? `${value} ${unit}`.trim() : `custom ${unit}`.trim()
}
