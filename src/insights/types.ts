// Types for the anonymized facility knowledge base (built by
// scripts/build_facilities.py from the WJCF survey) and the benchmarking layer.

export type BulkSource = 'psa' | 'lmo' | 'cylinder'

export interface PeerFacility {
  id: string
  state: string
  facilityType: string
  oxBeds: number | null
  bedBand: string | null
  sources: { psa: boolean; lmo: boolean; cylinder: boolean; oc: boolean }
  output: { psa: number; lmo: number; cylinder: number; oc: number; total: number }
  /** Dominant bulk source (PSA / LMO / cylinders). OC is supplementary, excluded. */
  primary: BulkSource | null
  perCuM: { cylinder: number | null; lmo: number | null; psa: number | null }
  metrics: {
    psaPowerPerLpm: number | null
    cylRefillD: number | null
    cylRefillB: number | null
    hrSalary: number | null
  }
}

export interface BenchmarkData {
  meta: {
    cohortLabel: string
    period: string
    facilityCount: number
    states: Record<string, number>
    psaPlants: { total: number; nonFunctional: number; nonFunctionalPct: number }
  }
  facilities: PeerFacility[]
  distributions: {
    psaPowerPerLpm: number[]
    cylRefillD: number[]
    cylRefillB: number[]
    hrSalary: number[]
    lmoRental: number[]
    perCuM: { psa: number[]; lmo: number[]; cylinder: number[] }
  }
}
