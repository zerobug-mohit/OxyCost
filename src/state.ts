// App-level UI state shape and its initial value.
// The engine stays pure; this holds the editable inputs as a fleet of source
// instances (zero or more of each type) plus the active cost view and the
// demand entry (spec sections 5, 9a).
import {
  CYLINDER_DEFAULTS,
  LMO_DEFAULTS,
  OC_DEFAULTS,
  PSA_DEFAULTS,
  SHARED_DEFAULTS,
} from './engine'
import type {
  CostView,
  CylinderInputs,
  LmoInputs,
  OcInputs,
  PsaInputs,
  SharedInputs,
  SourceType,
} from './engine'

export type DemandMode = 'direct' | 'beds'

export interface BedDemandInputs {
  beds: number
  lpmPerBed: number
  hoursPerDay: number
}

/** A fleet: arrays of per-unit inputs. Array length = number of that unit. */
export interface Fleet {
  psa: PsaInputs[]
  lmo: LmoInputs[]
  cylinder: CylinderInputs[]
  oc: OcInputs[]
}

export interface AppState {
  demandMode: DemandMode
  demandDirect: number
  bedDemand: BedDemandInputs
  /** Oxygen beds — optional, powers peer benchmarking (0 = not provided). */
  oxBeds: number
  costView: CostView
  shared: SharedInputs
  fleet: Fleet
}

// First open: no sources yet — the user picks counts in Step 2, which spawns
// instances with blank required fields (so Step 3 isn't auto-complete).
const initialFleet: Fleet = { psa: [], lmo: [], cylinder: [], oc: [] }

export const initialState: AppState = {
  // First open: demand and oxygen beds are blank — the user fills them in. The
  // output sections stay locked until the required inputs are provided.
  demandMode: 'direct',
  demandDirect: 0,
  bedDemand: { beds: 0, lpmPerBed: 5, hoursPerDay: 12 },
  oxBeds: 0,
  costView: 'capex_opex',
  shared: { ...SHARED_DEFAULTS },
  fleet: initialFleet,
}

const IDENT_DEFAULT = { item_id_type: 'Manufacturer', item_id_value: '' }

/** A fresh default input object for a given source type. */
export function defaultsFor(source: SourceType): PsaInputs | LmoInputs | CylinderInputs | OcInputs {
  switch (source) {
    case 'psa':
      return { ...IDENT_DEFAULT, ...PSA_DEFAULTS }
    case 'lmo':
      return { ...IDENT_DEFAULT, ...LMO_DEFAULTS }
    case 'cylinder':
      return { ...IDENT_DEFAULT, ...CYLINDER_DEFAULTS }
    case 'oc':
      return { ...IDENT_DEFAULT, ...OC_DEFAULTS }
  }
}

/**
 * "Reset all" for one source instance: optional (preset) fields go back to their
 * defaults, and the required fields (and the identifier) are cleared so the user
 * re-enters them. Required = the red fields that have no preset default.
 */
export function resetInstance(source: SourceType): PsaInputs | LmoInputs | CylinderInputs | OcInputs {
  switch (source) {
    case 'psa':
      return {
        ...(defaultsFor('psa') as PsaInputs),
        item_id_value: '',
        psa_capacity_lpm: 0,
        psa_power_kw: 0,
        psa_run_hours_monthly: 0,
        psa_plant_cost: 0,
      }
    case 'lmo':
      return {
        ...(defaultsFor('lmo') as LmoInputs),
        item_id_value: '',
        lmo_monthly_cu_m: 0,
      }
    case 'cylinder':
      return {
        ...(defaultsFor('cylinder') as CylinderInputs),
        item_id_value: '',
        cyl_refill_cost: 0,
        cyl_monthly_count: 0,
      }
    case 'oc':
      return {
        ...(defaultsFor('oc') as OcInputs),
        item_id_value: '',
        oc_high_use_units: 0,
        oc_low_use_units: 0,
      }
  }
}
