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
    target: '.field-legend',
    tab: 'calculator',
    openStep: 1,
    title: 'Presets are yours to change',
    body: 'A quick note on the field colours: green is a value you entered, yellow is a pre-filled default we provide so you can start quickly, and red is a required field still empty. Every yellow default is only a starting point — for any input you’re actually entering, type over it with your real value (it turns green). Wherever a section says “Customize” or “advanced”, you can open it to change deeper assumptions too.',
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
    body: 'Tell the tool how many of each oxygen source the facility has — PSA plants, LMO tanks, cylinders, concentrators. Each one you add becomes its own panel in Step 3. (We’ve added a sample PSA plant so you can see the details next.)',
  },
  {
    target: '#step-3',
    tab: 'calculator',
    openStep: 3,
    title: 'Step 3 · Fill in the details',
    body: 'Each source you added gets a panel here. Complete its required (red) fields; the yellow ones are pre-filled defaults. Let’s look at what a source panel contains.',
  },
  {
    target: '[data-tour="shared-costs"]',
    tab: 'calculator',
    openStep: 3,
    title: 'Shared facility costs',
    body: 'Costs paid regardless of source — the oxygen technician / HR salary and MGPS (pipeline) upkeep. You enter these once here, not inside each source.',
  },
  {
    target: '[data-field-scope="psa-0"]',
    tab: 'calculator',
    openStep: 3,
    title: 'A source panel',
    body: 'Each source has its own panel. The red fields are required (e.g. capacity, power, run hours); fill them from your plant. Hover any ⓘ for what a field means.',
  },
  {
    target: '[data-tour="source-ownership"]',
    tab: 'calculator',
    openStep: 3,
    title: 'Purchased vs on rent',
    body: 'For a PSA plant or LMO tank, pick Purchased (a capital cost, depreciated) or On rent (a fixed monthly fee) — only the one you choose is counted.',
  },
  {
    target: '[data-field-scope="psa-0"] .subpanel',
    tab: 'calculator',
    openStep: 3,
    title: 'Customize the presets',
    body: 'Every source has a “Customize (presets)” tray. Open it to see and change the pre-filled defaults for that source — plant cost, life, AMC, electricity rate, and so on. They’re only starting values; replace any with your real figures for an accurate cost.',
  },
  {
    target: '[data-tour="coverage-bar"]',
    tab: 'calculator',
    openStep: 3,
    title: 'Coverage bar',
    body: 'This tracks how much of your monthly demand the sources you entered actually supply — aim for about 100%.',
  },
  {
    target: '[data-tour="cost-output"]',
    tab: 'calculator',
    openStep: null,
    title: 'Your cost result',
    body: 'With the steps complete, the results unlock: the plain-language bottom line and the cheapest way to supply your demand.',
  },
  {
    target: '[data-tour="cost-views"]',
    tab: 'calculator',
    openStep: null,
    title: 'The three cost views',
    body: 'Switch between Opex only, Capex + opex and Incremental to reframe every figure for the question you’re asking (running a source you own, buying new, or the cost of extra volume).',
  },
  {
    target: '#calc-detail',
    tab: 'calculator',
    openStep: null,
    title: 'Trace any number',
    body: 'The Calculation section shows every formula with your inputs substituted in. The highlighted values are clickable — they jump back to the exact field, so nothing is a black box.',
  },
  {
    target: '[data-tour="scenario-bar"]',
    tab: 'calculator',
    openStep: null,
    title: 'Compare scenarios',
    body: 'Save up to 3 versions (different sources, demand or rates) and compare them side by side — including the demand each assumes.',
  },
  {
    target: '[data-tour="io-toolbar"]',
    tab: 'calculator',
    openStep: null,
    title: 'Export & import (Excel)',
    body: 'Save everything — inputs, calculations and your saved scenarios — to an Excel workbook, and import it back later. Handy for sharing or continuing offline.',
  },
  {
    title: 'You’re set!',
    body: 'That’s the full facility flow. We filled a sample facility so you could see each feature — change the numbers to your own, or clear the sample source in Step 2. Turn the Tutorial toggle off to work normally; your inputs are kept.',
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
    title: 'Step 2 · Cost inputs (presets are editable)',
    body: 'Enter how many facilities you have by size, or your district’s equipment totals directly. The yellow figures — rates, equipment counts, hours, plant costs — are pre-filled defaults we provide so you can start quickly, but they’re yours to change. For anything you actually know, type over the default with your real value for a more accurate budget.',
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
