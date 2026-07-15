// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DemandFacilityTab } from '../DemandFacilityTab'
import { DemandDistrictTab } from '../DemandDistrictTab'
import { DemandInput } from '../../components/inputs/DemandInput'
import { initialState } from '../../state'

describe('demand tabs render without crashing', () => {
  it('Facility demand tab renders its ward inputs', () => {
    const html = renderToStaticMarkup(<DemandFacilityTab />)
    expect(html).toContain('Monthly O₂ patients by ward')
    expect(html).toContain('Intensive Care Unit')
  })

  it('District demand tab renders the state picker and a demand figure', () => {
    const html = renderToStaticMarkup(<DemandDistrictTab />)
    expect(html).toContain('Annual oxygen demand')
    expect(html).toContain('MT/yr')
    expect(html).toContain('Demand by district') // whole-state breakdown
  })

  it('facility DemandInput renders the From-admissions form', () => {
    const s = { ...initialState, demandMode: 'admissions' as const, admissionsDemand: { month: 0, state: 'Punjab', facilityType: 'DH', ipd: 800 } }
    const html = renderToStaticMarkup(<DemandInput state={s} onPatch={() => {}} resolvedDemand={12345} />)
    expect(html).toContain('Estimate demand from admissions')
    expect(html).toContain('Avg monthly IPD')
    // The derived readout shows a matched strata band.
    expect(html).toContain('matched')
  })
})
