// Methodology — the technical reference: every formula, the data sources, and
// the validation cases. Mirrors the calculation engine so a reviewer can trace
// any number. (The non-technical user guide lives in GuideTab.)

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
        <a href="#benchmarks">11. Peer benchmarking</a>
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
        for the decision matters more than any single input.
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
        cost per delivered cu m is scaled by 1/(1 − loss).
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
        69 automated tests cover these formulas, the conversions, the volume-sweep
        curves, the ranking/recommendation logic, shared-overhead allocation, and
        edge cases (zero run hours, supply gaps, no NaN/Infinity).
      </p>

      {/* 11 ---------------------------------------------------------------- */}
      <h2 id="caveats">10. Assumptions &amp; caveats</h2>
      <ul>
        <li>
          Data-derived presets come from WJCF&apos;s facility-level oxygen
          assessment of <strong>92 facilities across Madhya Pradesh, Chhattisgarh
          and Punjab</strong> (Nov 2025–Jan 2026): LMO tank rental ₹67,260/mo,
          compressor-run fraction ≈0.90, cylinder refill medians (D ₹350, B ₹165),
          HR salary median ₹13,000/mo. Power ratings are industry benchmarks
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
      </ul>

      {/* 12 ---------------------------------------------------------------- */}
      <h2 id="benchmarks">11. Peer benchmarking</h2>
      <p>
        The <strong>Benchmarks</strong> panel (appended to the results) compares your
        inputs and costs against an <strong>anonymized</strong> knowledge base built
        from the same WJCF assessment — 92 facilities across Madhya Pradesh,
        Chhattisgarh and Punjab. Each facility is reduced to{' '}
        <em>type · bed-band · state</em>; names and districts are dropped. It is
        contextual guidance, not a cost calculation.
      </p>
      <ul>
        <li>
          <strong>Facilities like yours.</strong> Finds the 5 nearest facilities by
          oxygen-bed count (or demand, if beds aren&apos;t entered) and source-mix
          overlap, and shows their <em>primary bulk source</em> (PSA / LMO / cylinders
          — concentrators are supplementary and excluded) and per-cu-m where reported.
        </li>
        <li>
          <strong>How your inputs compare.</strong> Flags inputs beyond the 90th (or
          below the 10th) percentile of peers — e.g. a refill price in the top decile —
          with the peer median for context.
        </li>
        <li>
          <strong>Where your cost stands.</strong> Places your per-cu-m on the peer
          distribution (cylinders and LMO, where enough facilities reported actual
          spend; PSA cost was not captured, so it is omitted). Sample size is shown.
        </li>
        <li>
          <strong>What facilities your size do.</strong> The primary-source split by
          bed band, with your band highlighted, plus a reliability note —{' '}
          {/* value injected at runtime in the panel */}
          a large share of surveyed PSA plants were non-functional, so plan backup.
        </li>
      </ul>
      <p className="muted small">
        Volume/mix and refill-price benchmarks rest on well-sampled fields; cost
        percentiles and PSA run-hours are thinner and always show their sample size.
        The dataset is rebuilt from the survey data by{' '}
        <code>scripts/build_facilities.py</code> and bundled as static, anonymized JSON
        — everything runs in your browser.
      </p>
    </div>
  )
}

const PSA_CALC = `production_hours = run_hours × compressor_run_fraction   (default 0.90)
o2_cu_m          = production_hours × 60 × capacity_LPM × utilization / 1000

compressor_kW = power_KW × compressor_power_fraction        (default 0.90)
bop_kW        = power_KW × (1 − compressor_power_fraction)
electricity_kWh = compressor_kW × production_hours + bop_kW × run_hours
electricity_usage = electricity_kWh × rate_per_kWh          (variable)

maintenance   = AMC_annual / 12     (AMC defaults to 3.27% × plant cost)
consumables   = consumables_annual / 12
depreciation  = plant_cost / life_years / 12
total_monthly = electricity_usage + electricity_fixed
                + maintenance + repairs + consumables + depreciation
                (technician HR is a SHARED facility cost — see §11)

per_cu_m (capex+opex) = total_monthly / o2_cu_m
per_cu_m (opex only)  = (total_monthly − depreciation) / o2_cu_m
per_cu_m (incremental)= electricity_usage / o2_cu_m`

const LMO_CALC = `volume = delivered cu m (entered in cu m / Nm³ / L / KL / kg, auto-converted)
loss_factor = 1 / (1 − boil_off_loss)         (purchased > delivered)

refilling_per_cu_m = refill_base × (1 + 0.12) / 0.861
handling_per_cu_m  = handling_base × (1 + 0.18) / 0.861
total_refilling    = refilling_per_cu_m × volume × loss_factor
total_handling     = handling_per_cu_m × volume × loss_factor
depreciation       = tank_cost / life_years / 12
total_monthly      = rental + total_refilling + total_handling + depreciation
                     (operator HR is a SHARED facility cost — see §11)

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
