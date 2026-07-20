// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DemandOutput } from '../DemandOutput'
import { DemandInput } from '../../components/inputs/DemandInput'
import { WardDemandFields } from '../../components/inputs/WardDemandFields'
import { DistrictDemandInputs, initialDistrictDemand } from '../../state-app/DistrictDemandInputs'
import { DemandSummaryCard } from '../../components/results/DemandSummaryCard'
import { FacilityCalc, DistrictCalc } from '../DemandCalc'
import { computeDistrictDemand, defaultAssumptions, defaultFactors } from '../../demand-engine'
import { initialState } from '../../state'

describe('demand UI renders without crashing', () => {
  it('WardDemandFields renders the ward inputs and month picker', () => {
    const html = renderToStaticMarkup(<WardDemandFields value={initialState.wardsDemand} onChange={() => {}} />)
    expect(html).toContain('These patient counts are for')
    expect(html).toContain('Intensive Care Unit')
    expect(html).toContain('data-field-scope="demand"') // calc pills can jump back here
  })

  it('District demand inputs render the state/district picker', () => {
    const html = renderToStaticMarkup(<DistrictDemandInputs value={initialDistrictDemand()} onChange={() => {}} />)
    expect(html).toContain('State')
    expect(html).toContain('Whole state')
    expect(html).toContain('data-field-scope="demand-state"') // pills jump back here
  })

  it('District demand output renders the figure, breakdown and calc pills', () => {
    const sel = initialDistrictDemand()
    const result = computeDistrictDemand({ state: sel.state, district: null }, defaultFactors(), sel.seasonality, 'normal', sel.surge)
    const html = renderToStaticMarkup(
      <DemandOutput
        result={result}
        breakdownTitle={`Demand by district — ${sel.state}`}
        emptyHint=""
        calc={<DistrictCalc selection={{ state: sel.state, district: null }} factors={defaultFactors()} seasonality={sel.seasonality} scenario="normal" surge={sel.surge} />}
      />,
    )
    expect(html).toContain('Annual oxygen demand')
    expect(html).toContain('MT/yr')
    expect(html).toContain('Demand by district') // whole-state breakdown
    expect(html).toContain('Full calculation') // calc drill-down present
    expect(html).toContain('calc-ref') // clickable pills present
  })

  it('FacilityCalc renders per-ward rows with clickable pills', () => {
    const html = renderToStaticMarkup(<FacilityCalc wardPatients={{ icu: 20, hdu: 10 }} assumptions={defaultAssumptions()} scenario="normal" month={0} />)
    expect(html).toContain('MT/yr') // annual line
    expect(html).toContain('calc-ref') // pills
    expect(html).toContain('patients') // per-ward header
  })

  it('facility DemandInput renders the Facility-archetype form', () => {
    const s = { ...initialState, demandMode: 'admissions' as const, admissionsDemand: { month: 0, state: 'Punjab', facilityType: 'DH', ipd: 800, scenario: 'normal' as const } }
    const html = renderToStaticMarkup(<DemandInput state={s} onPatch={() => {}} resolvedDemand={12345} />)
    expect(html).toContain('Estimate demand from admissions')
    expect(html).toContain('Avg monthly IPD')
    expect(html).toContain('Pandemic') // Normal/Pandemic scenario toggle
    // The derived readout shows a matched strata band.
    expect(html).toContain('matched')
  })

  it('facility DemandInput renders the Ward-by-ward form (no pandemic toggle)', () => {
    const s = { ...initialState, demandMode: 'wards' as const }
    const html = renderToStaticMarkup(<DemandInput state={s} onPatch={() => {}} resolvedDemand={0} />)
    expect(html).toContain('Estimate demand ward-by-ward')
    expect(html).toContain('These patient counts are for')
    expect(html).not.toContain('Pandemic') // pandemic eliminated for the ward method
  })

  it('DemandSummaryCard renders the ward-mode demand output', () => {
    const s = { ...initialState, demandMode: 'wards' as const, wardsDemand: { ...initialState.wardsDemand, wardPatients: { icu: 20 } as typeof initialState.wardsDemand.wardPatients } }
    const html = renderToStaticMarkup(<DemandSummaryCard state={s} demand={1000} />)
    expect(html).toContain('Annual oxygen demand')
    expect(html).toContain('Demand by ward')
  })
})
