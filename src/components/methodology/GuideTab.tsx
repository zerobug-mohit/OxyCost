// "How to use this tool" — a visual, step-by-step user guide. A hero flow shows
// the three-step journey; sections are grouped into a reading flow (getting
// started → using the facility calculator → the district/state planner → data)
// with cards, a colour legend and callouts so it scans easily. The Methodology
// tab holds the formulas.
import type { ReactNode } from 'react'
import { Collapsible } from '../shared/Collapsible'
import { FlowSteps, DocCards, DocCard, LegendCards, Callout, GroupHeading } from './DocBits'

function Section({ n, icon, title, children, open }: { n: string; icon: string; title: string; children: ReactNode; open?: boolean }) {
  return (
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
  )
}

export function GuideTab() {
  return (
    <div className="methodology">
      <p className="doc-lead">
        <strong>OxyCost</strong> helps a public-health facility understand the cost of supplying
        medical oxygen. Describe what you have — demand and oxygen sources — and the tool shows a
        clear, side-by-side <strong>cost per unit of oxygen</strong> for each source, plus a
        plain-language summary. It is a <strong>planning aid to support your own decisions</strong> —
        not a recommendation, and not a substitute for vendor quotations. Everything runs in your
        browser; no data is sent anywhere.
      </p>

      <FlowSteps
        steps={[
          { icon: '💧', title: '1 · Set your demand', body: 'How much oxygen the facility needs each month — type it in, estimate from admissions, or build it ward-by-ward.' },
          { icon: '🏭', title: '2 · Add your sources', body: 'PSA plants, LMO tanks, cylinders, concentrators — how many of each you run.' },
          { icon: '💰', title: '3 · Read the cost', body: 'A clear per-unit cost for each source, and the cheapest way to supply your demand.' },
        ]}
      />
      <Callout icon="🎓">
        New here? Turn on <strong>Tutorial</strong> (top-right) for an interactive, step-by-step
        walkthrough that points at each control as you go.
      </Callout>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading title="Getting started" sub="What the tool is, the two tools inside it, and the sources it compares." />

      <Section n="1" icon="🎯" title="What OxyCost is (and isn't)" open>
        <p>
          The tool answers one question: <em>at my facility, what does each way of supplying oxygen
          actually cost per unit?</em> You feed in a scenario; it returns figures. The accuracy of the
          output depends entirely on the inputs you enter — and{' '}
          <strong>every underlying assumption is visible and editable</strong>.
        </p>
        <DocCards cols={3}>
          <DocCard icon="✏️" title="Pre-filled, not fixed">
            Many fields come with sensible defaults to save you effort. Wherever you know the real
            value, you’re encouraged to replace the default.
          </DocCard>
          <DocCard icon="🧭" title="Informs, never dictates">
            The tool never tells you what to do — it surfaces information so you can make a data-driven
            decision. The output is not a recommendation.
          </DocCard>
          <DocCard icon="🔒" title="Stays on your device">
            Nothing leaves your browser. The anonymized reference data ships as static files and every
            calculation runs locally.
          </DocCard>
        </DocCards>
      </Section>

      <Section n="2" icon="🧰" title="The two tools">
        <DocCards cols={2}>
          <DocCard icon="🏥" title="Facility calculator" chip="one facility">
            Compare the per-unit cost of each oxygen source for a single facility and see which is most
            cost-effective for your demand and equipment.
          </DocCard>
          <DocCard icon="🗺️" title="District / State planner" chip="many facilities">
            Enter how many facilities you have (by size, or as district equipment totals) and roll up
            an annual budget across every expense head — electricity, refilling, AMC, repairs, HR,
            training, IEC, contingency.
          </DocCard>
        </DocCards>
        <p className="muted small">Switch between them with the tabs at the top. Each has its own inputs, outputs and Excel export/import.</p>
      </Section>

      <Section n="3" icon="🔀" title="The four oxygen sources">
        <DocCards cols={2}>
          <DocCard icon="🏭" title="PSA plant" chip="cheap when run hard">
            On-site generation from ambient air. High fixed cost, very low cost per cu m at high utilisation.
          </DocCard>
          <DocCard icon="🛢️" title="LMO" chip="best at steady volume">
            Bulk liquid oxygen in a cryogenic tank, tanker-delivered. Economical at high, steady volume.
          </DocCard>
          <DocCard icon="🧯" title="Cylinders" chip="flexible / backup">
            Portable compressed-gas cylinders, supplier-refilled. Flat per-unit cost — suits low or backup demand.
          </DocCard>
          <DocCard icon="🛏️" title="Concentrators" chip="supplementary only">
            Bedside devices concentrating O₂ from air. Low-purity, low-flow — supplementary use only.
          </DocCard>
        </DocCards>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading title="Using the facility calculator" sub="Cost a single facility, in order — inputs, the three steps, and reading the result." />

      <Section n="4" icon="🎨" title="Reading the input fields">
        <p>Every input is colour-coded, so you can see at a glance what still needs your attention:</p>
        <LegendCards />
        <DocCards cols={2}>
          <DocCard icon="ℹ️" title="Hover for help">
            Every field, column and chart carries an info marker — hover it for what the value does and
            how changing it moves the result.
          </DocCard>
          <DocCard icon="🔗" title="Unit-economics hints">
            Under many inputs a small line shows the cost that input drives (e.g. “+1 kW ≈ ₹2,256/mo
            more electricity”). The highlighted amounts are clickable — they jump to the rate or field
            they depend on.
          </DocCard>
        </DocCards>
        <p className="muted small">
          As you type, a few technical inputs are quietly compared with similar facilities and flagged
          inline if they look unusual — context only, never changing the cost. Financial and salary
          figures are never benchmarked or broadcast.
        </p>
      </Section>

      <Section n="5" icon="🧭" title="The three steps">
        <ol>
          <li>
            <strong>Step 1 — Demand.</strong> Set the monthly oxygen demand three ways:{' '}
            <em>Enter directly</em> (in cu m, D-type cylinders or kg); <em>Facility archetype</em>{' '}
            (month + state + facility type + monthly IPD → matched strata → auto-estimated demand); or{' '}
            <em>Ward-by-ward</em> (the full case-mix). The estimate and its clickable breakdown show
            under <em>Demand output</em> on the right. (More on demand just below.)
          </li>
          <li>
            <strong>Step 2 — How many of each source.</strong> Pick the variant and count: PSA by
            capacity (200 / 500 / 1000 / 1500 LPM or custom), LMO by tank size (KL), cylinders by type
            (D / B), concentrators by per-unit flow. Each unit becomes its own panel in Step 3.
          </li>
          <li>
            <strong>Step 3 — Source details.</strong> Fill each unit’s required (red) fields; open{' '}
            <em>Customize</em> to adjust presets. For a PSA plant or LMO tank, choose{' '}
            <strong>purchased</strong> (a depreciated capital cost) or <strong>on rent</strong> (a fixed
            monthly fee). Give duplicate units an <em>identifier</em>. <em>Shared facility costs</em>{' '}
            (technician/HR, MGPS) are entered once at the top. The <strong>coverage bar</strong> tracks
            how much of your demand the entered sources cover — aim for ~100%.
          </li>
          <li>
            <strong>Output.</strong> Once inputs are complete the right column unlocks: the cost summary,
            the cost comparison (table + charts + click-through calculations) and the shared overhead.
          </li>
        </ol>
      </Section>

      <Section n="6" icon="🩺" title="Estimating demand — how much oxygen is needed">
        <p>
          Demand is Step 1 above; here’s what each method does. Demand is shown in{' '}
          <strong>MT and cu m</strong>, from a case-mix method (per ward, O₂ patients split by severity,
          each with a flow rate, duration and share) or a per-admission extrapolation.
        </p>
        <DocCards cols={3}>
          <DocCard icon="⌨️" title="Enter directly">
            Type the monthly demand in any unit if you already know it.
          </DocCard>
          <DocCard icon="🏷️" title="Facility archetype">
            State + facility type + monthly IPD admissions → matched to the closest demand strata →
            admissions × O₂-per-admission factor.
          </DocCard>
          <DocCard icon="🛏️" title="Ward-by-ward">
            O₂ patients per ward for a chosen month; case profiles, seasonality and scalars are editable
            in trays. The year is extrapolated by seasonality.
          </DocCard>
        </DocCards>
        <p className="muted small">
          The district/state tab estimates demand the same way at scale — pick a state (and optionally a
          district) and it sums the baked per-facility demand, drillable to each facility.
        </p>
      </Section>

      <Section n="7" icon="🔎" title="The three cost views">
        <p>The toggle above the results reframes every figure. Pick the one that matches your question:</p>
        <DocCards cols={3}>
          <DocCard icon="🏃" title="Opex only">You already own the equipment and want the cheapest to run.</DocCard>
          <DocCard icon="🏗️" title="Capex + opex">You are deciding whether to acquire a source from scratch.</DocCard>
          <DocCard icon="➕" title="Incremental">Fixed costs are covered — “which source is cheapest for more volume?”</DocCard>
        </DocCards>
      </Section>

      <Section n="8" icon="📏" title="Units — enter and read in any unit">
        <p>
          Work in whichever oxygen unit suits you. Every oxygen-volume field —{' '}
          <strong>Monthly demand</strong> and <strong>LMO consumption</strong> — has a unit dropdown
          (cu m, D-type cylinders, kg; LMO also Litre/KL/Nm³). Enter the value in that unit and the tool
          converts it internally (the engine always works in cu m of gas). A{' '}
          <strong>D-type cylinder</strong> holds ≈ 7 cu m of gaseous oxygen.
        </p>
        <p>
          At the <strong>top of the output</strong> a <strong>“Show cost per”</strong> toggle switches
          every per-unit figure between cu m, D-type cylinders and kg instantly. Picking a unit on an
          input also sets this toggle, and you can re-toggle the output any time. (Charts stay in ₹/cu m.)
        </p>
      </Section>

      <Section n="9" icon="🔬" title="Comparing scenarios">
        <p>
          Save up to three input combinations as <strong>scenarios</strong> and compare them
          side-by-side. The compare table lists each source’s per-unit cost per scenario, then a totals
          block: <strong>Total supply</strong>, <strong>total monthly cost</strong>,{' '}
          <strong>shared costs</strong>, <strong>total cost</strong> and{' '}
          <strong>average cost per unit across all sources</strong>. Load a saved scenario back to edit,
          update or remove it.
        </p>
      </Section>

      <Section n="10" icon="📊" title="Reading the output">
        <DocCards cols={3}>
          <DocCard icon="✅" title="Cost summary">The plain-language bottom line: the cheapest way to supply oxygen at your demand.</DocCard>
          <DocCard icon="📈" title="Cost comparison">
            The highlighted column is your active view; the cheapest cell is green. Charts show cost by
            source, how cost changes with volume, and where the money goes. Click anything for its full
            calculation, with pills that jump back to the inputs.
          </DocCard>
          <DocCard icon="🧾" title="Shared overhead">HR and MGPS costs paid regardless of source, shown separately and added for the total cost.</DocCard>
        </DocCards>
        <p className="muted small">
          A note under the comparison flags that at <strong>very large demand</strong> these estimates
          are approximate — sources may run at higher, steadier utilisation than assumed, so real cost
          per cu m can be a little lower than shown.
        </p>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading title="The District / State planner" sub="Budget oxygen across many facilities at once." />

      <Section n="11" icon="🗺️" title="How the planner works">
        <p>
          The planner budgets oxygen across many facilities, using the aggregate of the whole assessment
          (all three states) — <strong>there is no state to choose</strong>. Two ways to describe your
          district:
        </p>
        <DocCards cols={2}>
          <DocCard icon="📐" title="Estimate from facility sizes">
            Enter only how many facilities fall in each size band (by oxygen beds). A model fills in each
            band’s typical equipment — every predicted value is shown and editable.
          </DocCard>
          <DocCard icon="🧮" title="Enter equipment (district totals)">
            Type your actual totals and the tool costs them directly.
          </DocCard>
        </DocCards>
        <p>
          In the direct mode the sections are ordered by cost weight: <strong>PSA → LMO → concentrators
          → cylinders → MGPS → staff/training</strong>, with IEC / facilities-by-type last.
        </p>
        <Callout>
          <strong>PSA plants — total vs functional.</strong> Each capacity row asks for <strong># total
          plants</strong>, <strong># functional</strong> and <strong>hrs/day for functional plants</strong>;
          the <strong># non-functional</strong> is computed for you. Only functional plants produce
          oxygen and draw electricity, but all owned plants still carry AMC &amp; repair costs. Presets
          are 200 / 500 / 1000 / 1500 LPM, and you can add a custom capacity.
        </Callout>
        <p className="muted small">Full model details are in the Methodology tab.</p>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <GroupHeading title="Data, export & privacy" sub="Moving data in and out, and where the numbers come from." />

      <Section n="12" icon="📄" title="Export & import (Excel)">
        <p>
          Both tabs have <strong>Export to Excel</strong> and <strong>Import from Excel</strong> buttons
          above the inputs. Export produces a single, well-formatted workbook with your inputs{' '}
          <em>and</em> the calculations in one sheet:
        </p>
        <ul>
          <li>Inputs are grouped and <strong>colour-coded</strong> (green / amber / red, like the tool).</li>
          <li>
            The calculation cells are <strong>live Excel formulas</strong> — change an input in Excel and
            the components, sub-totals and grand total recompute there. (In the planner’s estimate mode
            the per-facility figures are seeded from the model while the totals stay live.)
          </li>
          <li>
            <strong>Import</strong> reads the workbook back and autofills the tool, so you can edit in
            Excel or in the tool and round-trip either way. Only files exported by OxyCost are accepted.
          </li>
        </ul>
      </Section>

      <Section n="13" icon="🔒" title="Where the defaults come from & privacy">
        <p>
          Data-derived defaults come from a WJCF facility-level oxygen assessment of{' '}
          <strong>92 facilities across three states in India</strong>. Values are pooled across all three
          states — the tool never singles out or broadcasts any state’s figures, and salary and price
          figures are never benchmarked between facilities.
        </p>
        <p>
          The reference dataset ships as anonymized static data (source mix · size band — no names or
          locations) and everything runs in your browser. For the exact formulas, data sources and
          validation cases, see the <strong>Methodology</strong> tab.
        </p>
      </Section>
    </div>
  )
}
