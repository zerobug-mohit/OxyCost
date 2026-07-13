// Methodology — the technical reference: every formula, the data sources, and
// the validation cases. Mirrors the calculation engine so a reviewer can trace
// any number. (The non-technical user guide lives in GuideTab.)
import { KnnSankey } from '../../state-app/KnnSankey'

export function MethodologyTab() {
  return (
    <div className="methodology">
      <p className="muted">
        This page documents every formula behind the numbers, the data sources, and
        the validation cases — so a reviewer can trace any figure the tool produces.
        For how to operate the dashboard, see{' '}
        <strong>How to use this model</strong>. Every figure runs in your browser and
        is unit-tested.
      </p>

      <div className="toc">
        <strong>On this page</strong>
        <a href="#units">1. Units &amp; conversions</a>
        <a href="#views">2. The three cost views</a>
        <a href="#psa">3. PSA calculations</a>
        <a href="#lmo">4. LMO calculations</a>
        <a href="#cyl">5. Cylinder calculations</a>
        <a href="#oc">6. Oxygen concentrator calculations</a>
        <a href="#shared">7. Shared facility costs</a>
        <a href="#charts">8. Reading the charts</a>
        <a href="#validation">9. Validation scenarios</a>
        <a href="#caveats">10. Assumptions &amp; caveats</a>
        <a href="#state">11. District / State planner &amp; its model</a>
      </div>

      {/* 1 ----------------------------------------------------------------- */}
      <h2 id="units">1. Units &amp; conversions</h2>
      <p>
        All internal calculations use <strong>cubic metres (cu m) of gaseous
        oxygen</strong> at standard conditions. <strong>All costs shown are
        inclusive of GST</strong> — LMO rental &amp; handling carry 18% GST and
        refilling 12% (applied automatically); PSA, cylinder and concentrator prices
        are taken as GST-inclusive, so adjust the preset if your quotation is pre-GST.
      </p>
      <table>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Formula</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Litres of gaseous O₂</td>
            <td>cu m</td>
            <td>
              <code>cu_m = litres / 1000</code>
            </td>
          </tr>
          <tr>
            <td>Litres of LMO (liquid)</td>
            <td>cu m of gas</td>
            <td>
              <code>cu_m = lmo_litres × 0.861</code>
            </td>
          </tr>
          <tr>
            <td>D-type cylinder</td>
            <td>cu m</td>
            <td>
              <code>7 cu m each</code>
            </td>
          </tr>
          <tr>
            <td>B-type cylinder</td>
            <td>cu m</td>
            <td>
              <code>1.5 cu m each</code>
            </td>
          </tr>
          <tr>
            <td>LPM</td>
            <td>cu m / hr</td>
            <td>
              <code>cu_m_hr = lpm × 60 / 1000</code>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3 ----------------------------------------------------------------- */}
      <h2 id="views">2. The three cost views</h2>
      <p>
        The toggle above the results reframes every number. Choosing the right view
        for your question matters more than any single input.
      </p>
      <table>
        <thead>
          <tr>
            <th>View</th>
            <th>Includes</th>
            <th>Use it when…</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Opex only</strong>
            </td>
            <td>All running costs; excludes depreciation/capex</td>
            <td>You already own the equipment and are deciding how to run it.</td>
          </tr>
          <tr>
            <td>
              <strong>Capex + opex</strong>
            </td>
            <td>Running costs + straight-line depreciation</td>
            <td>You are deciding whether to acquire a source from scratch.</td>
          </tr>
          <tr>
            <td>
              <strong>Incremental</strong>
            </td>
            <td>Only the variable cost of one more cu m</td>
            <td>Fixed costs are sunk and you ask &quot;which to use next?&quot;</td>
          </tr>
        </tbody>
      </table>

      {/* 4 ----------------------------------------------------------------- */}
      <h2 id="psa">3. PSA calculations</h2>
      <p>
        PSA generates oxygen on site. Its defining feature is the gap between{' '}
        <em>run time</em> and <em>production time</em>: the plant needs ~0.5h to
        stabilise after each startup, so frequent restarts eat into output.
      </p>
      <div className="calc-block">{PSA_CALC}</div>
      <p className="muted">
        Two survey-driven refinements: (1) oxygen is produced only while the
        <em> compressor</em> runs — a fraction (~0.90) of total plant run hours — and
        the compressor draws ~90% of the power, while the balance-of-plant draws the
        rest for all run hours; (2) a plant may run below rated capacity
        (<em>utilization</em>) to match demand — output then falls but compressor
        energy stays roughly flat, so per-unit cost rises. Fixed costs
        (depreciation, AMC, fixed electricity) fall per cu m as run hours rise.
        A plant is either <strong>purchased</strong> (a capital cost depreciated
        over its life — affects the capex+opex view only) or <strong>rented</strong>
        (a fixed monthly rent that counts as opex, with no depreciation). The
        ownership toggle in Step 3 picks one; the other figure is treated as zero.
      </p>

      {/* 5 ----------------------------------------------------------------- */}
      <h2 id="lmo">4. LMO calculations</h2>
      <p>
        Liquid oxygen is billed partly per volume (refilling, handling — both with
        GST) and partly per month (tank rental incl. 18% GST). Tank capacity (KL),
        chosen in Step 2, is descriptive only — it identifies the tank but does{' '}
        <em>not</em> enter the cost; LMO cost is driven by monthly consumption. The{' '}
        <code>0.861</code> factor converts a per-litre-of-LMO price to a
        per-cu-m-of-gas price.
        Consumption can be entered in <strong>cu m, Nm³, litres, KL or kg</strong> —
        all converted to cu m gas. A <strong>boil-off loss %</strong> accounts for
        cryogenic evaporation: you purchase more than you deliver, so the variable
        cost per delivered cu m is scaled by 1/(1 − loss). The cryogenic tank is
        either <strong>rented</strong> (the usual arrangement — a fixed monthly
        rent counted as opex, no depreciation) or <strong>purchased</strong> (a
        capital cost depreciated over its life, no rent). The ownership toggle in
        Step 3 picks one; the other figure is treated as zero.
      </p>
      <div className="calc-block">{LMO_CALC}</div>

      {/* 6 ----------------------------------------------------------------- */}
      <h2 id="cyl">5. Cylinder calculations</h2>
      <p>
        Cylinder cost is dominated by the refill price divided by cylinder size,
        plus a <strong>transport</strong> component (per-trip cost ÷ cylinders per
        trip). Capital is amortised over refill rotations across the
        cylinder&apos;s life; hydrostatic testing (every 5 years) is an optional
        periodic cost.
      </p>
      <div className="calc-block">{CYL_CALC}</div>

      {/* 7 ----------------------------------------------------------------- */}
      <h2 id="oc">6. Oxygen concentrator calculations</h2>
      <p>
        Only <strong>deployed &amp; functional</strong> units produce — units in
        storage or non-functional are excluded. Deployed units are split into
        <strong> high-use (≥8 h/day)</strong> and <strong>low-use (&lt;8 h/day)</strong>{' '}
        groups with their own run hours. Concentrators produce low-purity (90–96%),
        low-flow oxygen; electricity is the only variable cost.
      </p>
      <div className="calc-block">{OC_CALC}</div>
      <p className="muted">
        OC results always carry a clinical-limitations banner: not for ventilators
        or high-flow needs, no storage, supplementary use only.
      </p>

      {/* 8 ----------------------------------------------------------------- */}
      <h2 id="shared">7. Shared facility costs</h2>
      <p>
        Some costs are paid by the facility regardless of which source supplies
        oxygen — the <strong>oxygen technician / HR salary</strong> and{' '}
        <strong>MGPS</strong> (pipeline) AMC and maintenance. The survey collects
        these once at facility level, so the tool does too: enter them in{' '}
        <em>Shared facility costs</em> at the top of Step 3. They are reported
        separately and spread evenly across all delivered oxygen.
      </p>
      <div className="calc-block">{SHARED_CALC}</div>
      <p className="muted">
        Because the same shared amount lands on every source, it does not change
        which source is cheapest — but it is essential for the facility&apos;s all-in
        budget. This is why technician/operator salaries are no longer inside the
        PSA or LMO panels.
      </p>

      {/* 9 ----------------------------------------------------------------- */}
      <h2 id="charts">8. Reading the charts</h2>
      <ul>
        <li>
          <strong>Cost per cu m vs volume.</strong> Each line recomputes a
          source&apos;s cost as if it supplied the volume on the x-axis. Where two
          lines cross is the demand level at which the cheaper source changes — the
          key planning insight. The dashed vertical line is your current demand. A
          line stops where the source hits its capacity ceiling (PSA at 720 run
          hours; OC at 24 h/day).
        </li>
        <li>
          <strong>Cost per cu m, by source.</strong> The active view&apos;s per-unit
          costs as sorted bars — the same figures as the highlighted table column.
        </li>
        <li>
          <strong>Monthly cost composition.</strong> Where each source&apos;s money
          goes. A bar dominated by fixed costs (rent, depreciation) is one that gets
          much cheaper per cu m at higher volume.
        </li>
      </ul>

      {/* 10 ---------------------------------------------------------------- */}
      <h2 id="validation">9. Validation scenarios</h2>
      <p>
        The engine is unit-tested against reference values; the PSA case reflects
        the new compressor-split model. All currently{' '}
        <span className="badge-ok">pass</span>:
      </p>
      <table>
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Expected</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>PSA 1000 LPM / 300 run hrs / 0.90 compressor-run</td>
            <td>16,200 cu m · ₹15.29 capex+opex · ₹11.43 opex</td>
            <td>
              <span className="badge-ok">pass</span>
            </td>
          </tr>
          <tr>
            <td>LMO refilling rate</td>
            <td>₹19.80 / cu m (15.22 × 1.12 ÷ 0.861)</td>
            <td>
              <span className="badge-ok">pass</span>
            </td>
          </tr>
          <tr>
            <td>LMO handling rate</td>
            <td>₹23.00 / cu m (16.78 × 1.18 ÷ 0.861)</td>
            <td>
              <span className="badge-ok">pass</span>
            </td>
          </tr>
          <tr>
            <td>LMO @ 5,100 cu m (excl. shared HR)</td>
            <td>₹55.98 / cu m opex (rental + refill + handling)</td>
            <td>
              <span className="badge-ok">pass</span>
            </td>
          </tr>
          <tr>
            <td>Cylinder D-type @ ₹395 refill</td>
            <td>₹56.43 / cu m (refill ÷ 7)</td>
            <td>
              <span className="badge-ok">pass</span>
            </td>
          </tr>
          <tr>
            <td>Cylinder B-type @ ₹150 refill</td>
            <td>₹100 / cu m (refill ÷ 1.5)</td>
            <td>
              <span className="badge-ok">pass</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="muted small">
        Automated tests cover these formulas, the conversions, the volume-sweep
        curves, the ranking/summary logic, shared-overhead allocation, and edge
        cases (zero run hours, supply gaps, no NaN/Infinity).
      </p>

      {/* 11 ---------------------------------------------------------------- */}
      <h2 id="caveats">10. Assumptions &amp; caveats</h2>
      <ul>
        <li>
          Data-derived presets come from WJCF&apos;s facility-level oxygen
          assessment of <strong>92 facilities across Madhya Pradesh, Chhattisgarh
          and Punjab</strong> (Nov 2025–Jan 2026): LMO tank rental ₹67,260/mo,
          compressor-run fraction ≈0.90, cylinder refill medians (D ₹350, B ₹165).
          Power ratings are industry benchmarks
          (≈0.07–0.15 kW/LPM observed), the electricity tariff is a state default
          (metered values ranged ₹8–21/kWh), and concentrator per-unit costs are
          market estimates (not captured by the assessment). Override any of them
          for your facility.
        </li>
        <li>
          Depreciation is straight-line. GST is applied per regulation (LMO rental
          &amp; handling 18%, refilling 12%); PSA and cylinder prices are assumed
          GST-inclusive unless you adjust them.
        </li>
        <li>
          PSA part-load: output scales with utilization but compressor energy stays
          roughly flat, so per-unit cost rises at low load. LMO boil-off loss is a
          user input (the survey could not isolate it); 1–5%/month is typical. The
          kg→cu m factor uses 1.429 kg/Nm³ (≈0.700 cu m/kg).
        </li>
        <li>
          The volume-sweep chart assumes a single source could scale to meet a given
          volume; real facilities usually run a mix. Treat crossovers as guidance,
          not procurement instructions.
        </li>
        <li>
          Figures are planning estimates, not a substitute for vendor quotations.
        </li>
        <li>
          <strong>Inline peer reality-checks.</strong> As you type, key inputs (cylinder
          refill price, PSA power per LPM, LMO rental) are compared
          to the WJCF facility assessment and flagged inline when they fall outside the
          typical peer range — context only, never changing the calculation. Salary
          figures are deliberately excluded — pay is sensitive, so it is never
          benchmarked or disclosed. The
          anonymized peer dataset (type · bed-band · state) is bundled as static JSON;
          everything runs in your browser.
        </li>
      </ul>

      {/* 11 ---------------------------------------------------------------- */}
      <h2 id="state">11. District / State planner &amp; its model</h2>
      <p>
        The <strong>District / State planner</strong> is a second tool for budgeting
        across many facilities at once. Instead of describing every facility, the user
        enters only <strong>how many facilities fall in each oxygen-bed band</strong>{' '}
        (and, optionally, each band&apos;s typical size and the state). The engine
        predicts each facility&apos;s likely oxygen infrastructure, applies state unit
        rates, and rolls up an annual budget across the same expense heads as the
        national NHM cost tool (electricity, refilling, AMC/CAMC, repairs, HR, training,
        IEC, contingency).
      </p>

      <h3>11a. Why bed bands (not facility type)</h3>
      <p>
        The 92-facility assessment did <em>not</em> reliably record facility type, but it
        did record oxygen-bed counts — a clean, continuous size proxy. So the model keys
        off <strong>oxygen beds</strong>. Each band still shows the facility level it
        usually maps to (PHC / CHC / SDH / DH-scale) as a bridge for planners who think
        in levels.
      </p>
      <p>
        Of the 92 facilities, <strong>81</strong> recorded a usable oxygen-bed count and
        form the model&apos;s training set — <strong>Madhya Pradesh 40, Punjab 27,
        Chhattisgarh 14</strong>. The other <strong>11 were excluded only because they
        recorded no oxygen-bed count</strong> (9 reported zero, 2 left it unknown) — with
        nothing to place them on the size axis, they cannot anchor a prediction. It is a
        data-completeness exclusion, not a quality one. Selecting a state weights that
        state&apos;s facilities most heavily, so predictions and confidence reflect local
        patterns; smaller-sample states therefore carry a bit more uncertainty.
      </p>

      <h3 id="knn">11b. The prediction model (distance-weighted k-NN + sub-band mixture)</h3>
      <p>
        The planner&apos;s pre-populated values come from this model. In outline: your
        selected state&apos;s survey facilities feed a k-nearest-neighbours estimator,
        which resolves a facility of a given size into its likely infrastructure
        sub-bands, which roll up into the annual budget:
      </p>
      <KnnSankey />
      <p>
        Facilities of the same size are not identical — their biggest cost difference is
        their <strong>infrastructure signature</strong>: whether they run a PSA plant, an
        LMO tank, both, or rely on cylinders. So each band is modelled as a{' '}
        <strong>mixture of up to four sub-bands</strong>:
      </p>
      <ul>
        <li><strong>PSA + LMO</strong> — the largest hubs</li>
        <li><strong>PSA (no LMO)</strong></li>
        <li><strong>LMO (no PSA)</strong></li>
        <li><strong>Cylinders / concentrators</strong> — no bulk generation</li>
      </ul>
      <p>
        The <strong>share</strong> of each sub-band is the kernel-weighted fraction of
        similar facilities of that type in the survey (and is user-editable — the main
        accuracy lever). Each sub-band&apos;s own profile is predicted the same way, but
        restricting the neighbours to facilities of that signature — so a &quot;PSA + LMO&quot;
        sub-band reflects real PSA + LMO facilities of that size. A band&apos;s cost is the
        share-weighted sum of its sub-band costs.
      </p>
      <p>
        Each sub-band&apos;s profile comes from <strong>distance-weighted
        k-nearest-neighbours</strong> (kernel / local regression) over the survey:
      </p>
      <ul>
        <li>
          Every survey facility gets a weight that <strong>decays with how different its
          oxygen-bed size is</strong>, on a log scale — a Gaussian kernel,{' '}
          <code>w = exp(−(Δln(beds) / h)²)</code>, bandwidth <code>h ≈ 0.5</code>. Nearby
          facilities dominate; distant ones fade to near-zero, so a few large outliers
          can&apos;t skew a small facility&apos;s estimate.
        </li>
        <li>
          Choosing a <strong>state</strong> multiplies the distance of same-state
          facilities by 0.6, biasing the estimate toward local patterns.
        </li>
        <li>
          <strong>Presence</strong> of each source (PSA, LMO, cylinders, concentrators,
          MGPS, dedicated technician) is the weighted share of neighbours that have it.
          <strong> Quantities</strong> (plants, tanks, refills/month, deployed
          concentrators, bed-head units, technicians) are the weighted median among
          neighbours that have that source.
        </li>
        <li>
          Each source&apos;s cost is multiplied by its presence probability, so a band
          total is the <strong>expected</strong> cost across its facilities — the correct
          basis for budgeting a population (e.g. if 62% of large facilities have LMO, LMO
          contributes 0.62× its full cost).
        </li>
      </ul>
      <p>
        Why k-NN and not a heavier ML model: with ~81 usable facilities, an instance-based
        estimator is robust, avoids overfitting, and is fully interpretable — every number
        traces to &quot;the most similar real facilities&quot;. A few quantities the survey
        could not measure reliably (PSA <em>production hours</em>) or at all (pulse
        oximeters, clinical staff to train, booster compressors) use{' '}
        <strong>documented size-scaled norms</strong> rather than the survey. Every
        predicted value — presence %, quantities, rates and norms — is shown and editable.
      </p>

      <h3>11c. State-specific rates</h3>
      <p>
        Only the rates the survey actually observed vary by state — <strong>cylinder
        refill prices (D/B) and per-technician salary</strong> — set to each state&apos;s
        median (or the pooled median for &quot;All states&quot;). Rates the survey did not
        capture (electricity tariff, asset values, AMC %, training and IEC norms) stay at
        the workbook&apos;s national Assumptions defaults and are editable under{' '}
        <strong>State unit rates</strong>.
      </p>

      <h3>11d. Confidence score</h3>
      <p>
        Each band&apos;s prediction carries a 0–100 confidence, combining three factors,
        and the output shows a cost-weighted overall score (High ≥ 70, Moderate 45–69,
        Low &lt; 45):
      </p>
      <div className="calc-block">{STATE_CONF}</div>
      <p>
        The overall score is additionally damped by the share of the budget that comes
        from <strong>norm-based heads</strong> (oximeters, training, IEC) that the survey
        did not observe — a large norm-based share caps how confident the whole estimate
        can be. Treat the planner as a <strong>budgeting aid</strong>: confident on the
        overall shape and the big drivers, less so on any single facility.
      </p>
      <p className="muted small">
        The model ships as an anonymized static dataset (state · oxygen beds · equipment
        counts — no names or districts) and runs entirely in your browser.
      </p>
    </div>
  )
}

const STATE_CONF = `confidence = 100 × sampleFactor × decisivenessFactor × extrapolationFactor

sampleFactor        effective neighbours near this size (Kish n_eff):
                    ≥12 → 1.0 · ≥6 → 0.85 · ≥3 → 0.65 · else 0.45
decisivenessFactor  0.7 + 0.3 × (how close presence probabilities are to 0 or 1)
extrapolationFactor 1.0 inside the observed bed range; lower when the entered
                    size is above the largest / below the smallest surveyed facility

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
                (a plant is EITHER purchased → depreciation, OR rented → rent;
                 only one is non-zero — see the ownership toggle in Step 3)

per_cu_m (capex+opex) = total_monthly / o2_cu_m
per_cu_m (opex only)  = (total_monthly − depreciation) / o2_cu_m
per_cu_m (incremental)= electricity_usage / o2_cu_m`

const LMO_CALC = `volume = delivered cu m (entered in cu m / Nm³ / L / KL / kg, auto-converted)
loss_factor = 1 / (1 − boil_off_loss)         (purchased > delivered)

refilling_per_cu_m = refill_base × (1 + 0.12) / 0.861
handling_per_cu_m  = handling_base × (1 + 0.18) / 0.861
total_refilling    = refilling_per_cu_m × volume × loss_factor
total_handling     = handling_per_cu_m × volume × loss_factor
rental             = monthly_rent              (if RENTED; else 0)
depreciation       = tank_cost / life_years / 12   (if OWNED; else 0)
total_monthly      = rental + total_refilling + total_handling + depreciation
                     (operator HR is a SHARED facility cost — see §7)
                     (a tank is EITHER rented → rent, OR purchased → depreciation;
                      only one is non-zero — see the ownership toggle in Step 3)

per_cu_m (capex+opex) = total_monthly / volume
per_cu_m (opex only)  = (total_monthly − depreciation) / volume
per_cu_m (incremental)= (refilling_per_cu_m + handling_per_cu_m) × loss_factor`

const CYL_CALC = `volume_per_cylinder = 7 (D-type) or 1.5 (B-type)
monthly_volume      = count × volume_per_cylinder
transport_per_cyl   = transport_per_trip / cylinders_per_trip
opex_per_cu_m       = (refill_cost + transport_per_cyl) / volume_per_cylinder
rotations_over_life = (count / owned) × 12 × life_years
capex_per_cu_m      = (purchase / rotations_over_life) / volume_per_cylinder
hydrotest_monthly   = owned × hydrotest_cost / (interval_years × 12)

per_cu_m (capex+opex) = opex_per_cu_m + capex_per_cu_m + hydrotest_per_cu_m
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

All-in cost of any source = source_per_cu_m + shared_per_cu_m
(the same shared amount applies to every source, so it does NOT change which
source is cheapest — but it matters for the facility's total budget.)`
