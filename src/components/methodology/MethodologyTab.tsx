// Methodology — the technical reference: every formula, the data sources, and the
// validation cases, as intuitive collapsible sections so a reviewer can trace any
// number without scrolling a wall of text. (The non-technical guide is GuideTab.)
import type { ReactNode } from 'react'
import { Collapsible } from '../shared/Collapsible'
import { KnnSankey } from '../../state-app/KnnSankey'

function Section({ n, title, id, children, open }: { n: string; title: string; id?: string; children: ReactNode; open?: boolean }) {
  return (
    <div id={id}>
      <Collapsible
        className="doc-section"
        defaultOpen={open}
        summary={
          <span className="doc-section-title">
            <span className="doc-num">{n}</span>
            {title}
          </span>
        }
      >
        {children}
      </Collapsible>
    </div>
  )
}

export function MethodologyTab() {
  return (
    <div className="methodology">
      <p className="doc-lead">
        This page documents every formula behind the numbers, the data sources and the
        validation cases — so a reviewer can trace any figure the tool produces. For how to
        operate the dashboard, see <strong>How to use this tool</strong>. Everything runs in
        your browser and is unit-tested.
      </p>

      <Section n="1" title="Units & conversions" open>
        <p>
          All internal calculations use <strong>cubic metres (cu m) of gaseous oxygen</strong> at
          standard conditions. Oxygen-volume inputs (monthly demand, LMO consumption) can be{' '}
          <strong>entered in any unit</strong> (cu m / Nm³ / kg) and are converted to cu m; results
          can likewise be displayed per cu m, per Nm³ (≈ cu m) or per kg (1 kg ≈ 0.700 cu m) via the
          toggle at the top of the output. <strong>Enter every cost inclusive of GST</strong> — the pre-filled
          defaults are already GST-inclusive. LMO refilling &amp; handling additionally expose an
          editable GST % (default 0, i.e. the shown rate already includes GST); set it if your
          quotation is pre-GST.
        </p>
        <table>
          <thead>
            <tr><th>From</th><th>To</th><th>Formula</th></tr>
          </thead>
          <tbody>
            <tr><td>Litres of gaseous O₂</td><td>cu m</td><td><code>cu_m = litres / 1000</code></td></tr>
            <tr><td>Litres of LMO (liquid)</td><td>cu m of gas</td><td><code>cu_m = lmo_litres × 0.861</code></td></tr>
            <tr><td>D-type cylinder</td><td>cu m</td><td><code>7 cu m each</code></td></tr>
            <tr><td>B-type cylinder</td><td>cu m</td><td><code>1.5 cu m each</code></td></tr>
            <tr><td>LPM</td><td>cu m / hr</td><td><code>cu_m_hr = lpm × 60 / 1000</code></td></tr>
            <tr><td>kg of O₂</td><td>cu m</td><td><code>cu_m ≈ kg × 0.700</code></td></tr>
          </tbody>
        </table>
      </Section>

      <Section n="2" title="The three cost views">
        <p>The toggle above the results reframes every number. Choosing the right view matters more than any single input.</p>
        <table>
          <thead>
            <tr><th>View</th><th>Includes</th><th>Use it when…</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Opex only</strong></td><td>All running costs; excludes depreciation/capex</td><td>You already own the equipment and are deciding how to run it.</td></tr>
            <tr><td><strong>Capex + opex</strong></td><td>Running costs + straight-line depreciation</td><td>You are deciding whether to acquire a source from scratch.</td></tr>
            <tr><td><strong>Incremental</strong></td><td>Only the variable cost of one more cu m</td><td>Fixed costs are already covered and you ask &quot;which is cheapest for more volume?&quot;</td></tr>
          </tbody>
        </table>
      </Section>

      <Section n="3" title="PSA calculations">
        <p>
          PSA generates oxygen on site. Oxygen is produced only while the <em>compressor</em> runs — a
          fraction (~0.90) of total plant run hours — and the compressor draws ~90% of the power, while
          the balance-of-plant draws the rest for all run hours. A plant may run below rated capacity
          (<em>utilization</em>): output falls but compressor energy stays roughly flat, so per-unit cost
          rises. A plant is either <strong>purchased</strong> (depreciated — capex+opex view only) or{' '}
          <strong>rented</strong> (a fixed monthly rent counted as opex); the ownership toggle picks one.
        </p>
        <div className="calc-block">{PSA_CALC}</div>
      </Section>

      <Section n="4" title="LMO calculations">
        <p>
          Liquid oxygen is billed partly per volume (refilling, handling) and partly per month (tank
          rental). Tank capacity (KL) is descriptive only — cost is driven by monthly consumption, entered
          in cu m, Nm³, Litre LMO, KL or kg (all converted to cu m gas). The <code>0.861</code> factor
          converts a per-litre-of-LMO price to a per-cu-m-of-gas price. A <strong>boil-off loss %</strong>{' '}
          (default 0) scales the variable cost by 1/(1 − loss), since you purchase more than you deliver.
          The tank is <strong>rented</strong> (fixed monthly rent, no depreciation) or{' '}
          <strong>purchased</strong> (depreciated, no rent).
        </p>
        <div className="calc-block">{LMO_CALC}</div>
        <p className="muted small">
          Refill &amp; handling GST are editable (default 0 — the pre-filled base already includes GST);
          the formula multiplies by (1 + that GST) so a pre-GST quotation can be grossed up in place.
        </p>
      </Section>

      <Section n="5" title="Cylinder calculations">
        <p>
          Cylinder cost is dominated by the refill price divided by cylinder size, plus a{' '}
          <strong>transport</strong> component (per-trip cost ÷ cylinders per trip). Capital is amortised
          over refill rotations across the cylinder&apos;s life; hydrostatic testing (every 5 years) is a
          periodic cost.
        </p>
        <div className="calc-block">{CYL_CALC}</div>
      </Section>

      <Section n="6" title="Oxygen concentrator calculations">
        <p>
          Only <strong>deployed &amp; functional</strong> units produce, split into{' '}
          <strong>high-use (≥8 h/day)</strong> and <strong>low-use (&lt;8 h/day)</strong> groups.
          Concentrators produce low-purity (90–96%), low-flow oxygen; electricity is the only variable cost,
          and OC results always carry a clinical-limitations banner (supplementary use only).
        </p>
        <div className="calc-block">{OC_CALC}</div>
      </Section>

      <Section n="7" title="Shared facility costs">
        <p>
          Some costs are paid regardless of which source supplies oxygen — the{' '}
          <strong>oxygen technician / HR salary</strong> and <strong>MGPS</strong> (pipeline) AMC and
          maintenance. Entered once in <em>Shared facility costs</em> (Step 3), reported separately and
          spread evenly across all delivered oxygen.
        </p>
        <div className="calc-block">{SHARED_CALC}</div>
        <p className="muted small">
          Because the same shared amount lands on every source, it does not change which source is
          cheapest — but it matters for the facility&apos;s total budget.
        </p>
      </Section>

      <Section n="8" title="Reading the charts">
        <ul>
          <li>
            <strong>Cost per cu m vs volume.</strong> Each line recomputes a source&apos;s cost as if it
            supplied the volume on the x-axis; crossovers mark the demand at which the cheaper source
            changes. The dashed vertical line is your current demand. A line stops at the source&apos;s
            capacity ceiling.
          </li>
          <li><strong>Cost per cu m, by source.</strong> The active view&apos;s per-unit costs as sorted bars.</li>
          <li><strong>Monthly cost composition.</strong> Where each source&apos;s money goes — a bar dominated by fixed costs gets much cheaper per cu m at higher volume.</li>
        </ul>
      </Section>

      <Section n="9" title="Validation scenarios">
        <p>The engine is unit-tested against reference values. All currently <span className="badge-ok">pass</span>:</p>
        <table>
          <thead>
            <tr><th>Scenario</th><th>Expected</th><th /></tr>
          </thead>
          <tbody>
            <tr><td>PSA 1000 LPM / 300 run hrs / 0.90 compressor-run</td><td>16,200 cu m · ₹15.29 capex+opex · ₹11.43 opex</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>LMO refilling (base 15.22, +12% GST)</td><td>₹19.80 / cu m (15.22 × 1.12 ÷ 0.861)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>LMO handling (base 16.78, +18% GST)</td><td>₹23.00 / cu m (16.78 × 1.18 ÷ 0.861)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>Cylinder D-type @ ₹395 refill</td><td>₹56.43 / cu m (refill ÷ 7)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>Cylinder B-type @ ₹150 refill</td><td>₹100 / cu m (refill ÷ 1.5)</td><td><span className="badge-ok">pass</span></td></tr>
          </tbody>
        </table>
        <p className="muted small">
          Automated tests cover these formulas, the conversions, the volume-sweep curves, the ranking/summary
          logic, shared-overhead allocation, the state engine, the Excel export/import round-trip, and edge
          cases (zero run hours, supply gaps, no NaN/Infinity).
        </p>
      </Section>

      <Section n="10" title="Assumptions & caveats">
        <ul>
          <li>
            Data-derived presets come from WJCF&apos;s facility-level oxygen assessment of{' '}
            <strong>92 facilities across three states in India</strong>: default LMO tank rental,
            compressor-run fraction ≈0.90, and cylinder refill costs. PSA power defaults are secondary-research
            benchmarks by capacity (200→30, 500→45, 1000→65, 1500→75 kW); concentrator per-unit costs are
            market estimates. Override any of them for your facility.
          </li>
          <li>Depreciation is straight-line. Costs are entered GST-inclusive; LMO refilling/handling expose an editable GST %.</li>
          <li>PSA part-load: output scales with utilization but compressor energy stays roughly flat, so per-unit cost rises at low load. LMO boil-off loss is a user input (1–5%/month typical).</li>
          <li>The volume-sweep chart assumes a single source could scale to meet a given volume; real facilities usually run a mix. At very large demand, real utilisation may exceed the assumptions, so figures there are approximate. Treat crossovers as guidance, not procurement instructions.</li>
          <li>Figures are planning estimates, not a substitute for vendor quotations.</li>
          <li>
            A few technical inputs are compared with similar facilities and flagged inline when they look
            unusual — context only, never changing the calculation. Financial and salary figures are not
            compared or broadcast. The anonymized dataset (source mix · size band) is bundled as static JSON;
            everything runs in your browser.
          </li>
        </ul>
      </Section>

      <Section n="11" title="District / State planner & its model" id="state">
        <p>
          A second tool for budgeting across many facilities. The user enters facility counts by size band
          (estimate mode) <em>or</em> district equipment totals (direct mode); the engine rolls up an annual
          budget across the standard expense heads (electricity, refilling, AMC/CAMC, repairs, HR, training,
          IEC, contingency). It uses the <strong>pooled aggregate of all three states</strong> — there is no
          state to select, and every surveyed facility is weighted purely by size similarity.
        </p>

        <h4>11a. Why bed bands (not facility type)</h4>
        <p>
          The assessment did not reliably record facility type, but it did record oxygen-bed counts — a clean,
          continuous size proxy — so the model keys off <strong>oxygen beds</strong>. Of 92 facilities,{' '}
          <strong>81</strong> recorded a usable bed count and form the training set; the other 11 recorded no
          bed count and cannot be placed on the size axis (a data-completeness exclusion, not a quality one).
        </p>

        <h4 id="knn">11b. The prediction model (distance-weighted k-NN + sub-band mixture)</h4>
        <p>
          The planner&apos;s pre-populated values come from a k-nearest-neighbours estimator over the survey,
          resolving a facility of a given size into its likely infrastructure sub-bands, which roll up into the
          budget:
        </p>
        <KnnSankey />
        <ul>
          <li>Each band is a mixture of up to four sub-bands: PSA + LMO · PSA (no LMO) · LMO (no PSA) · cylinders/concentrators. Each sub-band&apos;s share is the kernel-weighted fraction of similar facilities of that type (user-editable — the main accuracy lever).</li>
          <li>Every survey facility gets a weight that <strong>decays with how different its oxygen-bed size is</strong>, on a log scale — a Gaussian kernel, <code>w = exp(−(Δln(beds) / h)²)</code>, bandwidth <code>h ≈ 0.5</code>. All three states&apos; facilities are pooled and weighted the same way — size similarity is the only weighting.</li>
          <li><strong>Presence</strong> of each source is the weighted share of neighbours that have it; <strong>quantities</strong> are the weighted median among neighbours that have that source. Each source&apos;s cost is multiplied by its presence probability, so a band total is the <strong>expected</strong> cost across its facilities.</li>
        </ul>
        <p className="muted small">
          Why k-NN: with ~81 facilities an instance-based estimator is robust, avoids overfitting and is fully
          interpretable. Quantities the survey could not measure (PSA production hours, pulse oximeters, staff
          to train) use documented size-scaled norms. Every predicted value is shown and editable.
        </p>

        <h4>11c. Unit rates</h4>
        <p>
          Rates the survey observed — cylinder refill prices (D/B) and per-technician salary — use the{' '}
          <strong>pooled all-states median</strong>. Rates it did not capture (electricity tariff, asset values,
          AMC %, training and IEC norms) use national Assumptions defaults. All are editable under{' '}
          <strong>State unit rates</strong>.
        </p>

        <h4>11d. Direct mode (district equipment totals)</h4>
        <p>
          Costs the totals you enter directly at those rates. PSA is entered by capacity (200 / 500 / 1000 / 1500
          LPM, plus custom sizes) with <strong># total plants</strong>, <strong># functional</strong> and
          hrs/day: electricity &amp; output come from the <strong>functional</strong> plants only, while AMC and
          repairs apply to <strong>all owned</strong> plants (functional + non-functional). PSA power and asset
          defaults are aligned with the facility calculator&apos;s secondary-research benchmarks by capacity.
        </p>

        <h4>11e. Confidence score</h4>
        <p>Each band&apos;s prediction carries a 0–100 confidence; the output shows a cost-weighted overall score (High ≥ 70, Moderate 45–69, Low &lt; 45):</p>
        <div className="calc-block">{STATE_CONF}</div>
        <p className="muted small">
          Damped by the share of the budget from norm-based heads (oximeters, training, IEC) the survey did not
          observe. The model ships as an anonymized static dataset and runs entirely in your browser.
        </p>
      </Section>

      <Section n="12" title="Demand estimation (case-mix method)">
        <p>
          The two <strong>demand</strong> tabs estimate how much oxygen is needed, from a WJCF
          workbook&apos;s case-mix model. All demand is in metric tonnes (MT); 1 MT = 750 cu m.
        </p>
        <h4>12a. Facility — case-mix</h4>
        <p>
          For each of 18 wards the monthly O₂ patients are split across three severity classes, each
          with its own flow rate, duration and case-mix share:
        </p>
        <div className="calc-block">{DEMAND_CALC}</div>
        <p className="muted small">
          The entered patient count is a typical (average) month; seasonality reshapes the 12-month
          profile (centred on 1.0) without changing the annual, so annual = 12 × average month.
          Pandemic multiplies by the surge factor (default ×5). Base assumptions are the workbook&apos;s{' '}
          <em>Scalar Input</em> sheet.
        </p>
        <h4>12b. District / State — per-admission extrapolation</h4>
        <p>
          Each facility is placed in one of 25 <strong>strata</strong> (State × facility type ×
          admission band; <em>Facility strata</em> sheet), each carrying an <code>O₂ demand /
          admission</code> factor. A facility&apos;s demand = <code>monthly admissions × factor</code>;
          a district/state total sums its facilities (baked from <em>Total Facility Output</em> —
          matches the workbook Dashboard at default factors). Editing a factor rescales its stratum
          proportionally. The Facility cost calculator&apos;s <strong>From admissions</strong> mode
          uses the same match (closest band for the state × type) → <code>admissions × factor × 750</code>
          → cu m. Only aggregated district×stratum demand + factors ship (no facility names).
        </p>
      </Section>

      <Section n="13" title="Excel export / import">
        <p>
          Each tab exports a single-sheet workbook with inputs and calculations together. Calculation cells are{' '}
          <strong>live Excel formulas</strong> that reference the input cells (mirroring the engine head-for-head),
          so editing an input in Excel recomputes the totals there. In the planner&apos;s estimate mode the
          per-facility figures come from the k-NN model, so head amounts are seeded values while the sub-totals,
          contingency and grand total stay live formulas. Import reads the workbook back via a hidden machine-key
          column and autofills the tool; a round-trip is unit-tested for both tabs.
        </p>
      </Section>
    </div>
  )
}

const DEMAND_CALC = `For each ward w (monthly O2 patients_w), per severity c ∈ {low, moderate, high}:
  wardMonthlyMT = Σ_c  patients_w × mix%_{w,c} × flow_{w,c}(LPM) × duration_{w,c}(days) × minsPerDay
                  ÷ mtConversion            (minsPerDay = 1440, mtConversion = 750,000)
facility avg month = Σ_w wardMonthlyMT        (× pandemicSurge if scenario = Pandemic)
month m  = avg month × seasonFactor[m] / mean(seasonFactor)     (Σ over 12 months = 12)
annual   = avg month × 12
cu m     = MT × 750`

const STATE_CONF = `confidence = 100 × sampleFactor × decisivenessFactor × extrapolationFactor

sampleFactor        effective neighbours near this size (Kish n_eff):
                    ≥12 → 1.0 · ≥6 → 0.85 · ≥3 → 0.65 · else 0.45
decisivenessFactor  0.7 + 0.3 × (how close presence probabilities are to 0 or 1)
extrapolationFactor 1.0 inside the observed bed range; lower beyond it

overall = cost-weighted mean of band scores × (1 − 0.4 × norm-based cost share)`

const PSA_CALC = `production_hours = run_hours × compressor_run_fraction   (default 0.90)
o2_cu_m          = production_hours × 60 × capacity_LPM × utilization / 1000

compressor_kW = power_KW × compressor_power_fraction        (default 0.90)
bop_kW        = power_KW × (1 − compressor_power_fraction)
electricity_kWh = compressor_kW × production_hours + bop_kW × run_hours
electricity_usage = electricity_kWh × rate_per_kWh          (variable)

maintenance   = AMC_annual / 12     (AMC defaults to 3.27% × plant cost)
consumables   = consumables_annual / 12
rental        = monthly_rent              (if RENTED; else 0)
depreciation  = plant_cost / life_years / 12   (if OWNED; else 0)
total_monthly = electricity_usage + electricity_fixed
                + maintenance + repairs + consumables + rental + depreciation
                (technician HR is a SHARED facility cost — see §7)

per_cu_m (capex+opex) = total_monthly / o2_cu_m
per_cu_m (opex only)  = (total_monthly − depreciation) / o2_cu_m
per_cu_m (incremental)= electricity_usage / o2_cu_m`

const LMO_CALC = `volume = delivered cu m (entered in cu m / Nm³ / Litre / KL / kg, auto-converted)
loss_factor = 1 / (1 − boil_off_loss)         (purchased > delivered)

refilling_per_cu_m = refill_base × (1 + refill_gst) / 0.861
handling_per_cu_m  = handling_base × (1 + handling_gst) / 0.861
total_refilling    = refilling_per_cu_m × volume × loss_factor
total_handling     = handling_per_cu_m × volume × loss_factor
rental             = monthly_rent              (if RENTED; else 0)
depreciation       = tank_cost / life_years / 12   (if OWNED; else 0)
total_monthly      = rental + total_refilling + total_handling + depreciation
                     (operator HR is a SHARED facility cost — see §7)

per_cu_m (capex+opex) = total_monthly / volume
per_cu_m (opex only)  = (total_monthly − depreciation) / volume
per_cu_m (incremental)= (refilling_per_cu_m + handling_per_cu_m) × loss_factor`

const CYL_CALC = `volume_per_cylinder = 7 (D-type) or 1.5 (B-type)
monthly_volume      = count × volume_per_cylinder
transport_per_cyl   = transport_per_trip / cylinders_per_trip
opex_per_cu_m       = (refill_cost + transport_per_cyl) / volume_per_cylinder
capex_monthly       = owned × purchase / (life_years × 12)
hydrotest_monthly   = owned × hydrotest_cost / (interval_years × 12)
total_monthly       = refills + transport + capex_monthly + hydrotest_monthly

per_cu_m (capex+opex) = total_monthly / monthly_volume
per_cu_m (opex only)  = (refills + transport + hydrotest_monthly) / monthly_volume
per_cu_m (incremental)= opex_per_cu_m   (each cylinder is a fresh refill + trip)`

const OC_CALC = `Only DEPLOYED & FUNCTIONAL units produce, split into high-use / low-use.
daily_unit_hours = high_units × high_hours + low_units × low_hours
monthly_unit_hrs = daily_unit_hours × days_per_month
o2_cu_m          = monthly_unit_hrs × output_LPM × 60 / 1000
electricity      = monthly_unit_hrs × (power_W / 1000) × rate
depreciation     = deployed_units × price / (life_years × 12)
maintenance      = deployed_units × maintenance_per_unit / 12
total_monthly    = electricity + depreciation + maintenance

per_cu_m (capex+opex) = total_monthly / o2_cu_m
per_cu_m (opex only)  = (electricity + maintenance) / o2_cu_m
per_cu_m (incremental)= electricity / o2_cu_m`

const SHARED_CALC = `shared_monthly = HR_salary
                 + (MGPS_AMC_annual + MGPS_maintenance_annual) / 12
                 + other_shared
shared_per_cu_m = shared_monthly / total_delivered_oxygen

Total cost of any source = source_per_cu_m + shared_per_cu_m
(the same shared amount applies to every source, so it does NOT change which
source is cheapest — but it matters for the facility's total budget.)`
