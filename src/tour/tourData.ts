// Interactive tutorial ("coach-mark") scripts. Each track is an ordered list of
// steps; a step spotlights a target element (CSS selector) and shows a bubble.
// Declarative prep fields (tab / openStep / demandMode) are applied by the App
// before the step is shown so the right screen/section is visible.
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
    body: 'We’ll estimate this facility’s monthly oxygen demand, add your sources, and read the cost per unit. Use Back / Next to move through the steps — you can leave the tutorial any time with the toggle at the top.',
    tab: 'calculator',
    openStep: 1,
  },
  {
    target: '#step-1',
    tab: 'calculator',
    openStep: 1,
    title: 'Step 1 · Monthly demand',
    body: 'Everything is costed against a monthly oxygen demand. You set that here in Step 1.',
  },
  {
    target: '[data-tour="demand-methods"]',
    tab: 'calculator',
    openStep: 1,
    title: 'Three ways to set demand',
    body: 'Enter it directly if you already know it, estimate it from your Facility archetype (state + type + admissions), or build it up Ward-by-ward. In the archetype and ward methods the flow rates, durations and seasonality are pre-filled defaults shown in yellow — you’re encouraged to review and override them with your real values.',
  },
  {
    target: '[data-tour="demand-output"]',
    tab: 'calculator',
    title: 'Your demand estimate',
    body: 'The estimated demand and its full breakdown appear here. Switch the unit (cu m / D-type cylinders / kg) or the period any time — nothing you enter is lost.',
  },
  {
    target: '#step-2',
    tab: 'calculator',
    openStep: 2,
    title: 'Step 2 · Add your sources',
    body: 'Tell the tool how many of each oxygen source the facility has — PSA plants, LMO tanks, cylinders, concentrators.',
  },
  {
    target: '#step-3',
    tab: 'calculator',
    openStep: 3,
    title: 'Step 3 · Fill in the details',
    body: 'Complete each source’s required (red) fields. The yellow fields are pre-filled defaults — it’s worth opening them and replacing with your actual quotation values (enter all costs inclusive of GST) for an accurate estimate.',
  },
  {
    target: '[data-tour="cost-output"]',
    tab: 'calculator',
    openStep: null,
    title: 'Your cost result',
    body: 'Once the three steps are complete this unlocks: the cheapest source, a full per-unit comparison, charts, and the exact calculation with every input linked back to where you set it.',
  },
  {
    target: '[data-tour="scenario-bar"]',
    tab: 'calculator',
    title: 'Compare scenarios',
    body: 'Save up to 3 versions (different sources, demand or rates) and compare them side by side — including the demand each assumes.',
  },
  {
    title: 'You’re set!',
    body: 'That’s the facility flow. Turn the Tutorial toggle off to work normally — your inputs are kept. You can restart the tutorial any time.',
    tab: 'calculator',
  },
]

const STATE: TourStep[] = [
  {
    title: 'District / State walkthrough',
    body: 'We’ll first estimate how much oxygen a district or state needs, then plan the annual budget to supply it. Use Back / Next to move; leave any time with the toggle at the top.',
    tab: 'state',
  },
  {
    target: '[data-tour="state-demand"]',
    tab: 'state',
    title: 'Step 1 · Estimate demand',
    body: 'Pick a state, and optionally a district. The tool sums the baked per-facility oxygen demand for that area. Choose Normal or Pandemic (a surge multiple).',
  },
  {
    target: '[data-tour="state-demand-output"]',
    tab: 'state',
    title: 'Demand, drilled down',
    body: 'See the total, then expand any district → facility type → individual facility. Every value is an editable pill: override one and the total above updates (an override replaces the breakdown beneath it).',
  },
  {
    target: '[data-tour="state-cost-inputs"]',
    tab: 'state',
    title: 'Step 2 · Cost inputs',
    body: 'Enter how many facilities you have by size, or your district’s equipment totals directly. The pre-filled rates and equipment defaults are editable — update them to your state’s actual figures where known.',
  },
  {
    target: '[data-tour="state-budget"]',
    tab: 'state',
    title: 'Your annual budget',
    body: 'The estimated budget and its breakdown by source and facility size appear here. Toggle Yearly / Monthly at the top of this panel.',
  },
  {
    target: '[data-tour="state-scenario"]',
    tab: 'state',
    title: 'Compare scenarios',
    body: 'Save up to 3 plans (different states, facility mixes or rates) and compare their demand and annual budget side by side.',
  },
  {
    title: 'You’re set!',
    body: 'That’s the district / state flow. Turn the Tutorial toggle off to work normally — your inputs are kept.',
    tab: 'state',
  },
]

export const TOURS: Record<TourTrack, TourStep[]> = { facility: FACILITY, state: STATE }
