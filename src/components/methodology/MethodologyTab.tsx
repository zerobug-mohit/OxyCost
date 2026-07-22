// Methodology — the technical reference. Organised so both tools get equal,
// parallel coverage: shared foundations (units, output lenses) → working out
// demand (shared) → costing a source (shared per-source maths) → how the
// FACILITY calculator uses them → how the DISTRICT/STATE planner uses them at
// scale → checks, data & Excel. Formulas are shown as cards; the prose is kept
// plain. (The step-by-step guide is GuideTab.)
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
        This page shows the maths behind the numbers, where the data comes from, and the checks we run
        — for <strong>both tools</strong>, so anyone can follow how a figure was worked out. It builds
        up in layers the two tools <em>share</em> — units, demand, and the cost of each source — then
        shows how the <strong>Facility calculator</strong> and the{' '}
        <strong>District / State planner</strong> use those pieces. For how to use the buttons and
        screens, see <strong>How to use this tool</strong>. Everything runs on your device and is
        tested automatically.
      </p>

      <Pipeline
        boxes={[
          { icon: '⌨️', label: 'What you enter', sub: 'demand, sources, rates (any unit)' },
          { icon: '⚙️', label: 'The maths', sub: 'everything in cu m of gas' },
          { icon: '💰', label: 'The answer', sub: 'facility: cost per unit · district: budget' },
        ]}
      />

      {/* ================================================================ */}
      <GroupHeading step="Basics" title="What every number rests on" sub="Things that are the same in both tools." />

      <Section n="1" icon="📏" title="Units & conversions" open>
        <p>
          Inside, the tool works in <strong>cubic metres (cu m) of oxygen gas</strong>. You can{' '}
          <strong>enter oxygen amounts in any unit</strong> (cu m / D-type cylinders / kg; LMO also
          Litre / KL / Nm³) and the tool converts them. You can also show results as cu m, per{' '}
          <strong>D-type cylinder</strong> (about 7 cu m each) or per kg (1 kg is about 0.700 cu m),
          using the switch at the top of the results. <strong>Enter every cost with GST included</strong>{' '}
          — the built-in values already include it. LMO refilling and handling also have a GST box (set
          to 0 by default, meaning the shown price already includes GST); use it if your quote is before
          GST.
        </p>
        <table>
          <thead>
            <tr><th>From</th><th>To</th><th>How</th></tr>
          </thead>
          <tbody>
            <tr><td>Litres of oxygen gas</td><td>cu m</td><td><code>cu_m = litres / 1000</code></td></tr>
            <tr><td>Litres of LMO (liquid)</td><td>cu m of gas</td><td><code>cu_m = lmo_litres × 0.861</code></td></tr>
            <tr><td>D-type cylinder</td><td>cu m</td><td><code>7 cu m each</code></td></tr>
            <tr><td>B-type cylinder</td><td>cu m</td><td><code>1.5 cu m each</code></td></tr>
            <tr><td>LPM (litres/min)</td><td>cu m / hr</td><td><code>cu_m_hr = lpm × 60 / 1000</code></td></tr>
            <tr><td>kg of oxygen</td><td>cu m</td><td><code>cu_m ≈ kg × 0.700</code></td></tr>
            <tr><td>Metric tonne (demand)</td><td>cu m</td><td><code>1 MT = 750 cu m</code></td></tr>
          </tbody>
        </table>
      </Section>

      <Section n="2" icon="🔎" title="Two ways to show cost">
        <p>The two tools answer different questions, so they show cost differently:</p>
        <DocCards cols={2}>
          <DocCard icon="🏥" title="Facility · cost per unit" chip="3 views">
            The facility tab shows ₹ per cu m for each source. A switch changes what that includes:{' '}
            <strong>Opex only</strong> = running cost, if you already own it; <strong>Capex + Opex</strong>{' '}
            = running plus the buying cost (spread over its life), for buying new; <strong>Incremental</strong>{' '}
            = just the cost of a bit more oxygen.
          </DocCard>
          <DocCard icon="🗺️" title="District · budget" chip="yearly / monthly">
            The planner adds everything up into a <strong>budget</strong>, shown by year or by month
            (monthly = yearly ÷ 12). One-off first-year costs (like initial training) are shown apart
            from the costs that repeat every year.
          </DocCard>
        </DocCards>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="Shared" title="Working out how much oxygen is needed" sub="The same maths feeds a facility’s Step 1 and the planner’s Step 1." />

      <Section n="3" icon="🩺" title="Working out demand">
        <p>
          Demand comes from a WJCF workbook. It is measured in metric tonnes (MT); 1 MT = 750 cu m.
        </p>
        <h4>3a. Ward by ward (facility)</h4>
        <p>
          For each of 18 wards, the oxygen patients in a month are split into three levels (low, medium,
          high). Each level has a flow rate, a number of days, and a share of patients:
        </p>
        <FormulaCard
          reads="For each ward: patients × their share × flow × days, turned into MT. Enter one month; the tool fills in the rest of the year using seasonal levels."
          code={DEMAND_CALC}
        />
        <Callout>
          The patient numbers you enter are for one month you choose. The other months are scaled up or
          down by season and added up for the year, so the month you entered stays exactly as typed.
          Pandemic multiplies the whole thing by a surge factor (default ×5).
        </Callout>
        <h4>3b. From admissions (facility archetype &amp; the district total)</h4>
        <p>
          Each facility falls into one of 25 <strong>groups</strong> (state × facility type × how many
          admissions). Each group has an <code>oxygen per admission</code> figure, so a facility’s
          demand is <code>monthly admissions × that figure</code>. The facility tab’s{' '}
          <strong>From admissions</strong> option uses this directly. The{' '}
          <strong>planner’s Step 1</strong> adds up the built-in demand for every facility in the state
          or district you pick, and you can open it down to each facility. Only the combined totals and
          the per-admission figures are built in.
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="Shared" title="Costing each oxygen source" sub="The maths for each source is used by both tools: the facility compares these costs; the planner adds them up across every facility." />

      <Section n="4" icon="🏭" title="PSA plant">
        <p>
          A PSA plant makes oxygen on site. It only makes oxygen while its compressor runs — about 90%
          of the hours the plant is on — and the compressor uses most of the power, while the rest of
          the plant uses the remainder for all the hours it is on. If the plant runs below its full
          rate, it makes less oxygen but uses about the same power, so the cost per unit goes up. A plant
          is either <strong>bought</strong> (its price spread over its life — counts only in the buying
          view) or <strong>rented</strong> (a fixed monthly fee).
        </p>
        <FormulaCard
          reads="Oxygen is made while the compressor runs. Electricity = compressor + the rest of the plant. Total monthly cost ÷ oxygen made = cost per cu m."
          code={PSA_CALC}
        />
      </Section>

      <Section n="5" icon="🛢️" title="LMO (liquid oxygen)">
        <p>
          Liquid oxygen is paid for partly by the amount used (refilling, handling) and partly by month
          (tank rent). The tank size (KL) is just for reference — the cost depends on how much you use.
          The <code>0.861</code> figure turns a price per litre of liquid into a price per cu m of gas. A{' '}
          <strong>boil-off loss %</strong> (default 0) raises the cost a little, because some is lost
          before use. The tank is <strong>rented</strong> or <strong>bought</strong> (price spread over
          its life).
        </p>
        <FormulaCard
          reads="Refilling & handling per cu m (a bit higher for boil-off) + rent or buying cost; ÷ the oxygen delivered = cost per cu m."
          code={LMO_CALC}
        />
        <Callout>
          The refill and handling GST boxes default to 0 (the built-in price already includes GST); the
          formula multiplies by (1 + that GST) so you can enter a before-GST quote instead.
        </Callout>
      </Section>

      <Section n="6" icon="🧯" title="Cylinders">
        <p>
          Most of a cylinder’s cost is the refill price divided by its size, plus{' '}
          <strong>transport</strong> (cost per trip ÷ cylinders per trip). If you own cylinders, the
          purchase price is spread over their life, and the safety test (every 5 years) is added in.
        </p>
        <FormulaCard
          reads="(Refill + transport) per cylinder ÷ cylinder size, plus the spread-out purchase and safety-test cost."
          code={CYL_CALC}
        />
      </Section>

      <Section n="7" icon="🛏️" title="Oxygen concentrators">
        <p>
          Only the units that are <strong>set up and working</strong> make oxygen, split into{' '}
          <strong>heavy use (8+ hrs/day)</strong> and <strong>light use (under 8 hrs/day)</strong>.
          Concentrators make lower-purity, low-flow oxygen, so the results always carry a note that they
          are for extra support only. Electricity is the only running cost.
        </p>
        <FormulaCard
          reads="Only working units make oxygen. Electricity + buying cost + upkeep ÷ oxygen made = cost per cu m."
          code={OC_CALC}
        />
      </Section>

      <Section n="8" icon="🧾" title="Shared costs">
        <p>
          Some costs are paid whichever source supplies the oxygen — the{' '}
          <strong>oxygen technician / staff pay</strong> and the <strong>pipeline (MGPS)</strong> upkeep.
          On the facility tab you enter these once and they are spread evenly across all the oxygen; in
          the planner they are their own budget lines.
        </p>
        <FormulaCard
          reads="Staff + pipeline costs spread evenly across all the oxygen — the same amount lands on every source."
          code={SHARED_CALC}
        />
        <Callout>
          Since the same amount lands on every source, it does not change which source is cheapest — but
          it does matter for the facility’s total cost.
        </Callout>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="Facility" title="The Facility calculator" sub="Putting the source costs together for one facility." />

      <Section n="9" icon="⚖️" title="Putting the comparison together">
        <p>
          Each source you enter is costed with the maths above, giving its{' '}
          <strong>oxygen per month</strong> and its <strong>₹ per cu m</strong>. The tool then:
        </p>
        <DocCards cols={3}>
          <DocCard icon="🏅" title="Ranks the sources">
            The sources that make oxygen are sorted by cost per unit, and the cheapest —{' '}
            <em>including the shared costs</em> — is shown as the bottom line.
          </DocCard>
          <DocCard icon="🎯" title="Checks the supply">
            The coverage bar adds up how much each source can supply and compares it with your Step-1
            demand (aim for about 100%), flagging a shortfall or spare.
          </DocCard>
          <DocCard icon="🧾" title="Adds the shared costs">
            The facility’s total = each source’s monthly cost + the shared staff / pipeline cost (§8),
            shown separately so it never affects the ranking.
          </DocCard>
        </DocCards>
        <p className="muted small">
          Scenarios save a full set of inputs and re-do these numbers on their own, so you can compare a
          few setups side by side.
        </p>
      </Section>

      <Section n="10" icon="📊" title="Reading the charts">
        <DocCards cols={3}>
          <DocCard icon="📉" title="Cost vs how much you use">
            Each line shows a source’s cost per unit if it supplied the amount on the bottom axis. Where
            lines cross is where the cheaper source changes. The dashed line is your demand; a line stops
            at the source’s limit.
          </DocCard>
          <DocCard icon="📊" title="Cost per unit, by source">
            The cost per unit for each source, as sorted bars.
          </DocCard>
          <DocCard icon="🧱" title="Where the money goes">
            What makes up each source’s monthly cost — a bar that is mostly fixed cost gets much cheaper
            per unit as you use more.
          </DocCard>
        </DocCards>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="District / State" title="The planner" sub="Using the same source costs across many facilities, and checking the supply meets the need." />

      <Section n="11" icon="🗺️" title="How the budget is built" id="state">
        <p>
          After Step 1 works out the need (§3b), Step 2 builds the budget. You either enter how many
          facilities you have of each <strong>size</strong> (<strong>from sizes</strong>) or your own{' '}
          <strong>equipment totals</strong> (<strong>direct</strong>). The budget uses combined data
          from all three surveyed states — it depends on size, and the state / district you picked in
          Step 1 sets the <em>need</em>, not the cost rates.
        </p>

        <h4>11a. Why size, not facility type</h4>
        <p>
          The survey didn’t always record facility type, but it did record oxygen-bed counts — a simple
          measure of <strong>size</strong> — so the tool uses that. Of 92 facilities,{' '}
          <strong>81</strong> had a usable bed count and are used here; the other 11 had none and can’t
          be placed by size (missing data, not poor data).
        </p>

        <h4 id="knn">11b. How the typical equipment is worked out</h4>
        <p>
          To fill in the equipment for a facility of a given size, the tool looks at the{' '}
          <strong>real surveyed facilities closest in size</strong> and takes what is typical among them
          — in three steps:
        </p>
        <FlowSteps
          steps={[
            { icon: '📏', title: 'Find similar-sized facilities', body: 'Match on oxygen-bed count — the surveyed facilities of about the same size, from all three states.' },
            { icon: '⚖️', title: 'Count the closer ones more', body: 'The closer a facility is in size, the more it counts. Very different sizes barely count.' },
            { icon: '📋', title: 'Take what is typical', body: 'How often each setup shows up (PSA, LMO, cylinders…) and the usual amounts — that becomes the filled-in size, added into the budget.' },
          ]}
        />
        <Callout>
          Nothing is made up — every filled-in value is “what similar-sized real facilities usually
          have”, and you can change any of it. This is the biggest thing that affects accuracy.
        </Callout>
        <p className="muted small">
          For reviewers: closeness uses a Gaussian weight on log bed-size, <code>w = exp(−(Δln(beds) / h)²)</code>{' '}
          (with <code>h ≈ 0.5</code>). Each size blends up to four setups (PSA+LMO · PSA only · LMO only ·
          cylinders/concentrators); how likely a source is = the weighted share of neighbours that have
          it, and its amount = the weighted middle value among those that do, so a size’s total is the
          average across its facilities. Amounts the survey couldn’t measure use size-based norms. This
          is a k-nearest-neighbours method.
        </p>

        <h4>11c. The rates</h4>
        <p>
          Rates the survey measured — cylinder refill prices (D/B) and technician pay — use the combined
          middle value across all three states. Rates it didn’t measure (electricity, equipment values,
          maintenance %, training and outreach) use national defaults. You can change all of them under{' '}
          <strong>State unit rates</strong>.
        </p>

        <h4>11d. Entering equipment directly</h4>
        <p>
          This costs the totals you enter, at those rates. PSA is entered by size (200 / 500 / 1000 /
          1500 LPM, plus custom sizes) with the <strong>total plants</strong>,{' '}
          <strong>how many work</strong> and hours per day. Only the working plants make oxygen and use
          electricity, while maintenance and repairs apply to <strong>all</strong> the plants. PSA power
          and equipment-value defaults match the facility calculator’s figures by size.
        </p>
      </Section>

      <Section n="12" icon="🧮" title="Adding up the budget & checking the supply">
        <h4>12a. Adding up the budget</h4>
        <p>
          Each cost line is worked out per typical facility (when you enter by size, each is weighted by
          how many facilities that size actually have the source), multiplied by the number of
          facilities, and added up. A contingency is added, and one-off first-year costs (initial
          training) are shown apart from the costs that repeat.
        </p>
        <FormulaCard
          reads="Cost per line × number of facilities, added up across sizes; + contingency; split into repeating vs one-off; ÷ working beds for a per-bed figure."
          code={BUDGET_CALC}
        />

        <h4>12b. Checking the supply covers the need</h4>
        <p>
          The <strong>coverage bar</strong> compares the area’s need (Step 1) with the oxygen the same
          equipment could actually make or deliver in a year — a quick check that there is enough. It is
          built from the same equipment the budget costs:
        </p>
        <FormulaCard
          reads="Yearly supply = PSA output + LMO turned into gas + cylinder refills + concentrator output; coverage = supply ÷ need."
          code={SUPPLY_CALC}
        />
        <p className="muted small">
          This is a rough yearly check (equipment running at the assumed hours), not a guarantee. The
          data is built in with no names or locations, and everything runs on your device.
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="Checks & data" title="Checks, assumptions & Excel" sub="How the numbers are tested, what we assume, and moving your work in and out — for both tools." />

      <Section n="13" icon="✅" title="Checks">
        <p>The maths is tested automatically against known answers. All currently <span className="badge-ok">pass</span>:</p>
        <table>
          <thead>
            <tr><th>Test</th><th>Expected</th><th /></tr>
          </thead>
          <tbody>
            <tr><td>PSA 1000 LPM / 300 run hrs / 0.90 compressor-run</td><td>16,200 cu m · ₹15.29 with buying · ₹11.43 running only</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>LMO refilling (base 15.22, +12% GST)</td><td>₹19.80 / cu m (15.22 × 1.12 ÷ 0.861)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>LMO handling (base 16.78, +18% GST)</td><td>₹23.00 / cu m (16.78 × 1.18 ÷ 0.861)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>Cylinder D-type @ ₹395 refill</td><td>₹56.43 / cu m (refill ÷ 7)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>Cylinder B-type @ ₹150 refill</td><td>₹100 / cu m (refill ÷ 1.5)</td><td><span className="badge-ok">pass</span></td></tr>
          </tbody>
        </table>
        <p className="muted small">
          The tests cover these formulas, the unit conversions, the cost-vs-use charts, the ranking and
          summary, the shared-cost split, the district budget and its supply check, the Excel save/load
          (inputs and scenarios), and tricky cases (zero run hours, supply gaps, no broken numbers).
        </p>
      </Section>

      <Section n="14" icon="⚠️" title="Assumptions, data & privacy">
        <ul>
          <li>
            Built-in values come from WJCF’s oxygen survey of{' '}
            <strong>92 facilities across three states in India</strong>: default LMO tank rent, the
            compressor running about 90% of the time, and cylinder refill prices. PSA power defaults come
            from published figures by size (200→30, 500→45, 1000→65, 1500→75 kW); concentrator prices are
            market estimates. Change any of them for your case.
          </li>
          <li>Buying costs are spread evenly over the equipment’s life. Costs are entered with GST included; LMO refilling/handling have a GST box.</li>
          <li>When a PSA plant runs below full rate, it makes less oxygen but uses about the same power, so the cost per unit rises. LMO boil-off loss is something you enter (1–5% a month is typical).</li>
          <li>The cost-vs-use chart assumes one source could grow to meet a given amount; in real life facilities use a mix. At very high demand, real use may be higher than assumed, so those figures are rough. Treat the crossovers as a guide, not instructions.</li>
          <li>The figures are estimates for planning, not a replacement for supplier quotes.</li>
          <li>
            A few technical numbers are compared with similar facilities and flagged if they look
            unusual — just a heads-up, never changing the result. Money and salary figures are not
            compared or shared. The data is combined across all three states, built in with no names or
            locations, and everything runs on your device.
          </li>
        </ul>
      </Section>

      <Section n="15" icon="📄" title="Save to Excel (and load it back)">
        <p>
          Each tab makes an Excel file with your inputs and the calculations together. The calculation
          cells are <strong>real Excel formulas</strong> that point at the input cells, so changing an
          input in Excel updates the totals there too. When you enter a district by size, the
          per-facility numbers come from the model, so those are fixed values while the totals stay live
          formulas. Any saved <strong>scenarios</strong> become extra sheets. Loading a file reads every
          sheet back in and fills the tool — inputs and scenarios. The save/load is tested for both tabs.
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
                (technician / staff pay is a SHARED cost — see §8)

per_cu_m (Capex + Opex) = total_monthly / o2_cu_m
per_cu_m (Opex only)       = (total_monthly − depreciation) / o2_cu_m
per_cu_m (Incremental)    = electricity_usage / o2_cu_m`

const LMO_CALC = `volume = delivered cu m (entered in cu m / Nm³ / Litre / KL / kg, auto-converted)
loss_factor = 1 / (1 − boil_off_loss)         (you buy more than you deliver)

refilling_per_cu_m = refill_base × (1 + refill_gst) / 0.861
handling_per_cu_m  = handling_base × (1 + handling_gst) / 0.861
total_refilling    = refilling_per_cu_m × volume × loss_factor
total_handling     = handling_per_cu_m × volume × loss_factor
rental             = monthly_rent              (if RENTED; else 0)
depreciation       = tank_cost / life_years / 12   (if OWNED; else 0)
total_monthly      = rental + total_refilling + total_handling + depreciation
                     (operator pay is a SHARED cost — see §8)

per_cu_m (Capex + Opex) = total_monthly / volume
per_cu_m (Opex only)       = (total_monthly − depreciation) / volume
per_cu_m (Incremental)    = (refilling_per_cu_m + handling_per_cu_m) × loss_factor`

const CYL_CALC = `volume_per_cylinder = 7 (D-type) or 1.5 (B-type)
monthly_volume      = count × volume_per_cylinder
transport_per_cyl   = transport_per_trip / cylinders_per_trip
running_per_cu_m    = (refill_cost + transport_per_cyl) / volume_per_cylinder
buying_monthly      = owned × purchase / (life_years × 12)
safety_test_monthly = owned × test_cost / (interval_years × 12)
total_monthly       = refills + transport + buying_monthly + safety_test_monthly

per_cu_m (Capex + Opex) = total_monthly / monthly_volume
per_cu_m (Opex only)       = (refills + transport + safety_test_monthly) / monthly_volume
per_cu_m (Incremental)    = running_per_cu_m   (each cylinder is a fresh refill + trip)`

const OC_CALC = `Only SET-UP & WORKING units make oxygen, split into heavy-use / light-use.
daily_unit_hours = heavy_units × heavy_hours + light_units × light_hours
monthly_unit_hrs = daily_unit_hours × days_per_month
o2_cu_m          = monthly_unit_hrs × output_LPM × 60 / 1000
electricity      = monthly_unit_hrs × (power_W / 1000) × rate
depreciation     = units × price / (life_years × 12)
maintenance      = units × maintenance_per_unit / 12
total_monthly    = electricity + depreciation + maintenance

per_cu_m (Capex + Opex) = total_monthly / o2_cu_m
per_cu_m (Opex only)       = (electricity + maintenance) / o2_cu_m
per_cu_m (Incremental)    = electricity / o2_cu_m`

const SHARED_CALC = `shared_monthly = staff_pay
                 + (MGPS_AMC_annual + MGPS_maintenance_annual) / 12
                 + other_shared
shared_per_cu_m = shared_monthly / total_oxygen_delivered

Total cost of any source = source_per_cu_m + shared_per_cu_m
(the same shared amount applies to every source, so it does NOT change which
source is cheapest — but it matters for the facility's total cost.)`

const BUDGET_CALC = `Per typical facility of a size, each cost line's yearly cost, e.g.
  electricity_PSA = (share with PSA) × plants × hrs/day × 365 × power_kWh × rate
  refill_cyl      = (share with cyl) × refills/mo × 12 × refill_rate
  ... (LMO refill, maintenance, repairs, staff, training, outreach) ...
size_total  = (Σ lines) × number_of_facilities_of_that_size   (direct: from your totals)
subtotal    = Σ over sizes
contingency = subtotal × contingency%
total       = subtotal + contingency
one_off     = first-year lines (initial training)
repeating   = total − one_off
cost_per_working_bed = total / Σ working_beds`

const SUPPLY_CALC = `Yearly oxygen SUPPLY (cu m/yr), added up over the equipment:
  PSA   = working_plants × capacity_LPM × 60 × hrs_per_day × 365 / 1000
  LMO   = yearly_KL × 1000 × 0.861            (liquid litres → cu m of gas)
  Cyl   = (D_refills×7 + B_refills×1.5 + A_refills×0.7) per month × 12
  OC    = unit_hours_per_day × 60 × 5 LPM × 365 / 1000
by size: each source × the share of facilities that have it, added over sizes.
supply_MT = supply_cu_m / 750
coverage%  = supply / need   (same % whether shown yearly or monthly)`
