// Methodology — the technical reference, ordered the way a user actually moves
// through the tool: basics → estimate demand (Step 1) → cost each source
// (Steps 2–3) → read results → the district/state planner → trust, data & Excel.
// Group dividers segment the flow; formulas are shown as cards. (The non-
// technical guide is GuideTab.)
import type { ReactNode } from 'react'
import { Collapsible } from '../shared/Collapsible'
import { Pipeline, DocCards, DocCard, Callout, FormulaCard, GroupHeading, FlowSteps } from './DocBits'

function Section({ n, icon, title, id, children, open }: { n: string; icon: string; title: string; id?: string; children: ReactNode; open?: boolean }) {
  return (
    <div id={id}>
      <Collapsible
        className="doc-section"
        defaultOpen={open}
        summary={
          <span className="doc-section-title">
            <span className="doc-num">{n}</span>
            <span className="doc-ico" aria-hidden>{icon}</span>
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
        This page documents every formula behind the numbers, the data sources and the validation
        cases — for <strong>both tools</strong>, so a reviewer can trace any figure either produces.
        It’s laid out in the order you use the tool: shared basics → estimating demand →
        costing a source → reading a facility’s result → the district / state planner → trust &amp;
        data. For how to operate the dashboard, see <strong>How to use this tool</strong>. Everything
        runs in your browser and is unit-tested.
      </p>

      <Pipeline
        boxes={[
          { icon: '⌨️', label: 'Your inputs', sub: 'demand, sources, rates (any unit)' },
          { icon: '⚙️', label: 'Engine', sub: 'everything in cu m of gas' },
          { icon: '💰', label: 'Cost', sub: 'facility: per unit · district: budget' },
        ]}
      />

      {/* ---------------------------------------------------------------- */}
      <GroupHeading step="Basics" title="How the tool works" sub="The two things every number depends on." />

      <Section n="1" icon="📏" title="Units & conversions" open>
        <p>
          All internal calculations use <strong>cubic metres (cu m) of gaseous oxygen</strong> at
          standard conditions. Oxygen-volume inputs (monthly demand, LMO consumption) can be{' '}
          <strong>entered in any unit</strong> (cu m / D-type cylinders / kg; LMO also Litre / KL /
          Nm³) and are converted to cu m; results can likewise be displayed per cu m, per{' '}
          <strong>D-type cylinder</strong> (≈ 7 cu m each) or per kg (1 kg ≈ 0.700 cu m) via the
          toggle at the top of the output. <strong>Enter every cost inclusive of GST</strong> — the
          pre-filled defaults are already GST-inclusive. LMO refilling &amp; handling additionally
          expose an editable GST % (default 0, i.e. the shown rate already includes GST); set it if
          your quotation is pre-GST.
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

      <Section n="2" icon="🔎" title="The three cost views (facility)">
        <p>
          On the <strong>facility</strong> tab a toggle above the results reframes every per-unit
          number — choosing the right view matters more than any single input. (The{' '}
          <strong>district / state</strong> planner instead reports a budget, shown Yearly or Monthly.)
        </p>
        <DocCards cols={3}>
          <DocCard icon="🏃" title="Opex only" chip="running costs">
            All running costs; excludes depreciation / capex. Use when you already own the equipment
            and are deciding how to run it.
          </DocCard>
          <DocCard icon="🏗️" title="Capex + opex" chip="running + depreciation">
            Running costs plus straight-line depreciation. Use when deciding whether to acquire a
            source from scratch.
          </DocCard>
          <DocCard icon="➕" title="Incremental" chip="one more cu m">
            Only the variable cost of one more cu m. Use when fixed costs are covered and you ask
            “which is cheapest for more volume?”
          </DocCard>
        </DocCards>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading step="Step 1" title="Estimating demand" sub="How much oxygen a facility (or a district/state) needs." />

      <Section n="3" icon="🩺" title="Demand estimation (case-mix method)">
        <p>
          The <strong>demand</strong> estimates (facility Step 1 and the district/state demand) come from
          a WJCF workbook’s case-mix model. All demand is in metric tonnes (MT); 1 MT = 750 cu m.
        </p>
        <h4>3a. Facility — case-mix</h4>
        <p>
          For each of 18 wards the monthly O₂ patients are split across three severity classes, each with
          its own flow rate, duration and case-mix share:
        </p>
        <FormulaCard
          reads="Per ward: patients × case-mix% × flow × duration ÷ conversion → MT; the chosen month is extrapolated across the year by seasonality."
          code={DEMAND_CALC}
        />
        <Callout>
          The entered patient counts are for a month you choose; the other months are scaled from it by
          seasonality and the annual is their sum, so the chosen month reads back exactly (mirroring the
          workbook’s Nov–Jan measurement extrapolated across the year). Pandemic multiplies by the surge
          factor (default ×5).
        </Callout>
        <h4>3b. District / State — per-admission extrapolation</h4>
        <p>
          Each facility is placed in one of 25 <strong>strata</strong> (State × facility type × admission
          band), each carrying an <code>O₂ demand / admission</code> factor. A facility’s demand ={' '}
          <code>monthly admissions × factor</code>; a district/state total sums its facilities (baked from
          the workbook’s <em>Total Facility Output</em> — matches its Dashboard at default factors). The
          Facility cost calculator’s <strong>Facility archetype</strong> mode uses the same match →{' '}
          <code>admissions × factor × 750</code> → cu m. Only aggregated demand + factors ship.
        </p>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading step="Both tools" title="Costing each oxygen source" sub="The per-source economics behind both tools: the facility tab compares these ₹-per-unit figures; the planner sums the same expense heads across every facility." />

      <Section n="4" icon="🏭" title="PSA calculations">
        <p>
          PSA generates oxygen on site. Oxygen is produced only while the <em>compressor</em> runs — a
          fraction (~0.90) of total plant run hours — and the compressor draws ~90% of the power, while
          the balance-of-plant draws the rest for all run hours. A plant may run below rated capacity
          (<em>utilization</em>): output falls but compressor energy stays roughly flat, so per-unit
          cost rises. A plant is either <strong>purchased</strong> (depreciated — capex+opex view only)
          or <strong>rented</strong> (a fixed monthly rent counted as opex).
        </p>
        <FormulaCard
          reads="Oxygen made while the compressor runs; electricity = compressor + balance-of-plant; monthly total ÷ output = cost per cu m."
          code={PSA_CALC}
        />
      </Section>

      <Section n="5" icon="🛢️" title="LMO calculations">
        <p>
          Liquid oxygen is billed partly per volume (refilling, handling) and partly per month (tank
          rental). Tank capacity (KL) is descriptive only — cost is driven by monthly consumption. The{' '}
          <code>0.861</code> factor converts a per-litre-of-LMO price to a per-cu-m-of-gas price. A{' '}
          <strong>boil-off loss %</strong> (default 0) scales the variable cost by 1/(1 − loss), since
          you purchase more than you deliver. The tank is <strong>rented</strong> or{' '}
          <strong>purchased</strong> (depreciated).
        </p>
        <FormulaCard
          reads="Refilling & handling per cu m (grossed up for boil-off) + rent or depreciation; ÷ delivered volume = cost per cu m."
          code={LMO_CALC}
        />
        <Callout>
          Refill &amp; handling GST are editable (default 0 — the pre-filled base already includes GST);
          the formula multiplies by (1 + that GST) so a pre-GST quotation can be grossed up in place.
        </Callout>
      </Section>

      <Section n="6" icon="🧯" title="Cylinder calculations">
        <p>
          Cylinder cost is dominated by the refill price divided by cylinder size, plus a{' '}
          <strong>transport</strong> component (per-trip cost ÷ cylinders per trip). Capital is
          amortised over refill rotations across the cylinder’s life; hydrostatic testing (every 5
          years) is a periodic cost.
        </p>
        <FormulaCard
          reads="(Refill + transport) per cylinder ÷ cylinder size, plus amortised purchase & hydrotest."
          code={CYL_CALC}
        />
      </Section>

      <Section n="7" icon="🛏️" title="Oxygen concentrator calculations">
        <p>
          Only <strong>deployed &amp; functional</strong> units produce, split into{' '}
          <strong>high-use (≥8 h/day)</strong> and <strong>low-use (&lt;8 h/day)</strong> groups.
          Concentrators produce low-purity (90–96%), low-flow oxygen; electricity is the only variable
          cost, and OC results always carry a clinical-limitations banner (supplementary use only).
        </p>
        <FormulaCard
          reads="Only deployed units produce; electricity + depreciation + maintenance ÷ output = cost per cu m."
          code={OC_CALC}
        />
      </Section>

      <Section n="8" icon="🧾" title="Shared facility costs">
        <p>
          Some costs are paid regardless of which source supplies oxygen — the{' '}
          <strong>oxygen technician / HR salary</strong> and <strong>MGPS</strong> (pipeline) AMC and
          maintenance. Entered once in <em>Shared facility costs</em> (Step 3), reported separately and
          spread evenly across all delivered oxygen.
        </p>
        <FormulaCard
          reads="HR + MGPS spread evenly across all delivered oxygen — the same amount lands on every source."
          code={SHARED_CALC}
        />
        <Callout>
          Because the same shared amount lands on every source, it does not change which source is
          cheapest — but it matters for the facility’s total budget.
        </Callout>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading title="Reading a facility’s results" sub="What the charts on the facility output side mean." />

      <Section n="9" icon="📊" title="Reading the charts">
        <DocCards cols={3}>
          <DocCard icon="📉" title="Cost per cu m vs volume">
            Each line recomputes a source’s cost as if it supplied the volume on the x-axis; crossovers
            mark the demand at which the cheaper source changes. The dashed line is your demand; a line
            stops at the source’s capacity ceiling.
          </DocCard>
          <DocCard icon="📊" title="Cost per cu m, by source">
            The active view’s per-unit costs as sorted bars.
          </DocCard>
          <DocCard icon="🧱" title="Monthly cost composition">
            Where each source’s money goes — a bar dominated by fixed costs gets much cheaper per cu m
            at higher volume.
          </DocCard>
        </DocCards>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading step="District / State" title="The planner" sub="Estimating an area’s demand, budgeting its oxygen, and checking supply covers demand." />

      <Section n="10" icon="🗺️" title="The planner’s model" id="state">
        <p>
          The planner has two steps. <strong>Step 1 — demand:</strong> pick a state (and optionally a
          district) and it sums the baked per-facility demand for that area (the per-admission
          extrapolation of §3b, drillable to each facility). <strong>Step 2 — budget:</strong> enter
          facility counts by typical size (estimate mode) <em>or</em> district equipment totals (direct
          mode); the engine rolls up a budget across the standard expense heads (electricity, refilling,
          AMC/CAMC, repairs, HR, training, IEC, contingency), shown Yearly or Monthly.
        </p>
        <p>
          The <strong>budget model is size-based</strong>: it uses the pooled aggregate of all three
          states and weights every surveyed facility purely by size similarity — the demand step’s
          state / district choice sizes the <em>need</em>, not the cost rates.
        </p>

        <h4>10a. Why facility size (not facility type)</h4>
        <p>
          The assessment did not reliably record facility type, but it did record oxygen-bed counts — a
          clean, continuous measure of <strong>facility size</strong> — so the model keys off that. Of 92
          facilities, <strong>81</strong> recorded a usable bed count and form the training set; the
          other 11 recorded no bed count and cannot be placed on the size axis (a data-completeness
          exclusion, not a quality one).
        </p>

        <h4 id="knn">10b. How the typical equipment is predicted</h4>
        <p>
          To pre-fill the equipment for a facility of a given size, the tool simply looks at the{' '}
          <strong>real surveyed facilities closest to it in size</strong> and takes what’s typical
          among them — in three plain steps:
        </p>
        <FlowSteps
          steps={[
            { icon: '📏', title: 'Find similar-sized facilities', body: 'Match on oxygen-bed count — the surveyed facilities of about the same size, pooled across all three states.' },
            { icon: '⚖️', title: 'Weight by closeness', body: 'The closer a facility is in size, the more it counts. Very different sizes barely count.' },
            { icon: '📋', title: 'Take what’s typical', body: 'How often each setup appears (PSA, LMO, cylinders…) and the typical quantities — that becomes the pre-filled band, rolled up into the budget.' },
          ]}
        />
        <Callout>
          This is a <strong>k-nearest-neighbours</strong> estimate: nothing is invented — every
          pre-filled value is “what similar-sized real facilities typically have”, and you can override
          any of it. It’s the main accuracy lever.
        </Callout>
        <p className="muted small">
          For reviewers: closeness uses a Gaussian kernel on log-bed-size, <code>w = exp(−(Δln(beds) / h)²)</code>{' '}
          (bandwidth <code>h ≈ 0.5</code>). Each band is a mixture of up to four sub-bands (PSA+LMO · PSA
          only · LMO only · cylinders/concentrators); a source’s <strong>presence</strong> is the
          weighted share of neighbours that have it and its <strong>quantity</strong> the weighted
          median among those that do, so a band total is the <em>expected</em> cost across its
          facilities. With ~81 facilities this instance-based approach is robust and interpretable;
          quantities the survey couldn’t measure use documented size-scaled norms.
        </p>

        <h4>10c. Unit rates</h4>
        <p>
          Rates the survey observed — cylinder refill prices (D/B) and per-technician salary — use the{' '}
          <strong>pooled all-states median</strong>. Rates it did not capture (electricity tariff, asset
          values, AMC %, training and IEC norms) use national Assumptions defaults. All are editable
          under <strong>State unit rates</strong>.
        </p>

        <h4>10d. Direct mode (district equipment totals)</h4>
        <p>
          Costs the totals you enter directly at those rates. PSA is entered by capacity (200 / 500 /
          1000 / 1500 LPM, plus custom sizes) with <strong># total plants</strong>,{' '}
          <strong># functional</strong> and hrs/day: electricity &amp; output come from the{' '}
          <strong>functional</strong> plants only, while AMC and repairs apply to <strong>all owned</strong>{' '}
          plants (functional + non-functional). PSA power and asset defaults are aligned with the facility
          calculator’s secondary-research benchmarks by capacity.
        </p>

        <h4>10e. Coverage — does the supply meet the demand?</h4>
        <p>
          The <strong>coverage bar</strong> compares the area’s estimated demand (Step 1) with the oxygen
          the same equipment could actually deliver in a year, so a planner can sanity-check whether the
          infrastructure is enough. Supply is built from the same equipment the budget costs — weighted by
          band presence in estimate mode, or read straight from the totals in direct mode:
        </p>
        <FormulaCard
          reads="Annual supply = PSA output + LMO expanded to gas + cylinder refills + concentrator output; coverage = supply ÷ demand."
          code={SUPPLY_CALC}
        />
        <p className="muted small">
          It is an annual-capacity sanity-check (equipment at the assumed hours / flows), not a metered
          guarantee. The model ships as an anonymized static dataset and runs entirely in your browser.
        </p>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading title="Trust, data & Excel" sub="How the numbers are validated, what’s assumed, and moving data in/out." />

      <Section n="11" icon="✅" title="Validation scenarios">
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
          Automated tests cover these formulas, the conversions, the volume-sweep curves, the
          ranking/summary logic, shared-overhead allocation, the state engine, the Excel export/import
          round-trip, and edge cases (zero run hours, supply gaps, no NaN/Infinity).
        </p>
      </Section>

      <Section n="12" icon="⚠️" title="Assumptions, data sources & privacy">
        <ul>
          <li>
            Data-derived presets come from WJCF’s facility-level oxygen assessment of{' '}
            <strong>92 facilities across three states in India</strong>: default LMO tank rental,
            compressor-run fraction ≈0.90, and cylinder refill costs. PSA power defaults are
            secondary-research benchmarks by capacity (200→30, 500→45, 1000→65, 1500→75 kW);
            concentrator per-unit costs are market estimates. Override any of them for your facility.
          </li>
          <li>Depreciation is straight-line. Costs are entered GST-inclusive; LMO refilling/handling expose an editable GST %.</li>
          <li>PSA part-load: output scales with utilization but compressor energy stays roughly flat, so per-unit cost rises at low load. LMO boil-off loss is a user input (1–5%/month typical).</li>
          <li>The volume-sweep chart assumes a single source could scale to meet a given volume; real facilities usually run a mix. At very large demand, real utilisation may exceed the assumptions, so figures there are approximate. Treat crossovers as guidance, not procurement instructions.</li>
          <li>Figures are planning estimates, not a substitute for vendor quotations.</li>
          <li>
            A few technical inputs are compared with similar facilities and flagged inline when they look
            unusual — context only, never changing the calculation. Financial and salary figures are not
            compared or broadcast. Values are pooled across all three states and the anonymized dataset
            (source mix · facility size — no names or locations) is bundled as static JSON; everything runs
            in your browser.
          </li>
        </ul>
      </Section>

      <Section n="13" icon="📄" title="Excel export / import">
        <p>
          Each tab exports a workbook with inputs and calculations together. Calculation cells are{' '}
          <strong>live Excel formulas</strong> that reference the input cells (mirroring the engine
          head-for-head), so editing an input in Excel recomputes the totals there. In the planner’s
          estimate mode the per-facility figures come from the k-NN model, so head amounts are seeded
          values while the sub-totals, contingency and grand total stay live formulas. Any saved{' '}
          <strong>scenarios</strong> are written as additional sheets. Import reads every sheet back via a
          hidden machine-key column and autofills the tool — inputs and scenarios; a round-trip is
          unit-tested for both tabs.
        </p>
      </Section>
    </div>
  )
}

const DEMAND_CALC = `For each ward w (O2 patients_w for the CHOSEN month), per severity c ∈ {low, mod, high}:
  wardMT = Σ_c  patients_w × mix%_{w,c} × flow_{w,c}(LPM) × duration_{w,c}(days) × minsPerDay
                ÷ mtConversion              (minsPerDay = 1440, mtConversion = 750,000)
chosen-month demand = Σ_w wardMT            (× pandemicSurge if scenario = Pandemic)
annual  = chosen-month × (Σ seasonFactor ÷ seasonFactor[chosen month])
month m = annual × seasonFactor[m] ÷ Σ seasonFactor   (chosen month reads back exactly)
cu m    = MT × 750`

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
                (technician HR is a SHARED facility cost — see §8)

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
                     (operator HR is a SHARED facility cost — see §8)

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

const SUPPLY_CALC = `Annual oxygen SUPPLY (cu m/yr), summed over the equipment:
  PSA   = functional_plants × capacity_LPM × 60 × prod_hrs_per_day × 365 / 1000
  LMO   = annual_KL × 1000 × 0.861            (liquid litres → cu m of gas)
  Cyl   = (D_refills×7 + B_refills×1.5 + A_refills×0.7) per month × 12
  OC    = unit_hours_per_day × 60 × 5 LPM × 365 / 1000
estimate mode: each source × its band presence probability, summed over sizes.
supply_MT = supply_cu_m / 750
coverage%  = supply / demand   (period-invariant; shown vs the Step-1 demand)`

const SHARED_CALC = `shared_monthly = HR_salary
                 + (MGPS_AMC_annual + MGPS_maintenance_annual) / 12
                 + other_shared
shared_per_cu_m = shared_monthly / total_delivered_oxygen

Total cost of any source = source_per_cu_m + shared_per_cu_m
(the same shared amount applies to every source, so it does NOT change which
source is cheapest — but it matters for the facility's total budget.)`
