// Interactive tutorial ("coach-mark") scripts. Each track is a SHORT ordered
// list — only the essentials a first-time user needs — with "presets are
// optional, you can change them" folded in as notes rather than separate steps.
// A step spotlights a target element (CSS selector) and shows a bubble.
import type { TabKey } from '../components/layout/Header'
import type { DemandMode } from '../state'

export type TourTrack = 'facility' | 'state'

export interface TourStep {
  /** CSS selector to spotlight. Omit for a centered, targetless card. */
  target?: string
  title: string
  body: string
  /** Prep applied before showing the step. */
  tab?: TabKey
  /** Facility left-accordion step to open (1/2/3), or null to collapse. */
  openStep?: number | null
  /** Facility Step-1 demand method to switch to (for the demo). */
  demandMode?: DemandMode
}

export const TRACK_LABELS: Record<TourTrack, string> = {
  facility: 'Facility-level demand & costing',
  state: 'District / State-level',
}

const FACILITY: TourStep[] = [
  {
    title: 'Facility walkthrough',
    body: 'A quick tour: set the demand, add your sources, and read the cost per unit. Use Back / Next; leave any time with the toggle at the top. Each step has a Reset all button.',
    tab: 'calculator',
    openStep: 1,
  },
  {
    target: '#step-1',
    tab: 'calculator',
    openStep: 1,
    title: 'Step 1 · Monthly demand',
    body: 'Set the facility’s monthly oxygen demand — type it in, or estimate it from admissions or ward-by-ward. The yellow figures are starting points you can change; your estimate shows under Demand output on the right.',
  },
  {
    target: '#step-2',
    tab: 'calculator',
    openStep: 2,
    title: 'Step 2 · Add your sources',
    body: 'Add how many of each source the facility has — PSA plants, LMO tanks, cylinders, concentrators. Each one becomes its own panel in Step 3.',
  },
  {
    target: '#step-3',
    tab: 'calculator',
    openStep: 3,
    title: 'Step 3 · Fill in the details',
    body: 'Fill the red (required) fields for each source. The yellow ones are optional presets — open a source’s Customize tray only if you want to change them. Shared costs (technician, MGPS) are entered once at the top.',
  },
  {
    target: '[data-tour="cost-output"]',
    tab: 'calculator',
    openStep: null,
    title: 'Your cost result',
    body: 'Once the steps are done, the result unlocks: the cheapest way to meet your demand. A switch gives three cost views (Opex only, Capex + Opex, Incremental), and the coverage bar checks your sources cover about 100% of demand.',
  },
  {
    title: 'You’re set!',
    body: 'That’s it. Save up to 3 scenarios to compare, and export or import everything as Excel. Turn the Tutorial toggle off to work normally — your inputs are kept.',
    tab: 'calculator',
  },
]

const STATE: TourStep[] = [
  {
    title: 'District / State walkthrough',
    body: 'A quick tour: estimate the area’s oxygen need, then plan the budget. Use Back / Next; leave any time with the toggle at the top. Each step has a Reset all button.',
    tab: 'state',
  },
  {
    target: '[data-tour="state-demand"]',
    tab: 'state',
    title: 'Step 1 · Estimate demand',
    body: 'Pick a state, then a district (or the whole state). The tool sums the built-in oxygen need for that area — open it down to each facility and edit any value. Choose Normal or Pandemic.',
  },
  {
    target: '[data-tour="state-cost-inputs"]',
    tab: 'state',
    title: 'Step 2 · Cost inputs',
    body: 'Enter how many facilities you have by size, or your district’s equipment totals directly. The yellow figures are working defaults — change them only if you want to.',
  },
  {
    target: '[data-tour="state-budget"]',
    tab: 'state',
    title: 'Your budget',
    body: 'Once both steps are done, the budget unlocks — split by source and facility size. Use the Period toggle (Yearly / Monthly) at the top; the coverage bar checks the supply meets the need. Save up to 3 plans to compare.',
  },
  {
    title: 'You’re set!',
    body: 'That’s the district / state flow. Export or import everything as Excel any time. Turn the Tutorial toggle off to work normally — your inputs are kept.',
    tab: 'state',
  },
]

export const TOURS: Record<TourTrack, TourStep[]> = { facility: FACILITY, state: STATE }
