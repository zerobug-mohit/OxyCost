// "How to use this tool" — a visual, step-by-step user guide. It is organised so
// the two tools get equal, parallel coverage: shared basics first, then a
// walkthrough of the Facility calculator, then a matching walkthrough of the
// District / State planner, then data/export/privacy. The Methodology tab holds
// the formulas.
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
        <strong>OxyCost</strong> helps you understand the cost of supplying medical oxygen — for a{' '}
        <strong>single facility</strong> or for a <strong>whole district / state</strong>. Describe
        the oxygen demand and how it is (or would be) supplied, and the tool returns a clear,
        side-by-side <strong>cost per unit</strong> for a facility, or a rolled-up{' '}
        <strong>budget</strong> for a district — with a plain-language summary either way. It is a{' '}
        <strong>planning aid to support your own decisions</strong>, not a substitute for vendor
        quotations. Everything runs in your browser; no data is sent anywhere.
      </p>

      <FlowSteps
        steps={[
          { icon: '💧', title: '1 · Estimate demand', body: 'How much oxygen is needed — for a facility each month, or for every facility in a district / state.' },
          { icon: '🏭', title: '2 · Describe the supply', body: 'The oxygen sources: PSA plants, LMO tanks, cylinders, concentrators — for one facility, or across many.' },
          { icon: '💰', title: '3 · Read the cost', body: 'A per-unit cost for each source at a facility, or an annual / monthly budget for the district.' },
        ]}
      />
      <Callout icon="🎓">
        New here? Turn on <strong>Tutorial</strong> (top-right) for an interactive, step-by-step
        walkthrough of either tool that points at each control as you go.
      </Callout>

      {/* ================================================================ */}
      <GroupHeading title="Getting started" sub="What the tool is, the two tools inside it, the sources it compares, and conventions shared by both tabs." />

      <Section n="1" icon="🎯" title="What OxyCost is (and isn't)" open>
        <p>
          The tool answers one question: <em>what does supplying oxygen actually cost here?</em> You
          feed in a scenario; it returns figures. The accuracy of the output depends entirely on the
          inputs you enter — and <strong>every underlying assumption is visible and editable</strong>.
        </p>
        <DocCards cols={3}>
          <DocCard icon="✏️" title="Pre-filled, not fixed">
            Many fields come with sensible defaults so you can start quickly. Wherever you know the real
            value, replace the default — the presets are advanced &amp; optional.
          </DocCard>
          <DocCard icon="🧭" title="Informs, never dictates">
            The tool surfaces information so you can make a data-driven decision. The output is a
            planning estimate, not a recommendation.
          </DocCard>
          <DocCard icon="🔒" title="Stays on your device">
            Nothing leaves your browser. The anonymized reference data ships as static files and every
            calculation runs locally.
          </DocCard>
        </DocCards>
      </Section>

      <Section n="2" icon="🧰" title="The two tools — which do I use?">
        <DocCards cols={2}>
          <DocCard icon="🏥" title="Facility calculator" chip="one facility">
            For a single facility. Compare the <strong>per-unit cost</strong> of each oxygen source and
            see which is most cost-effective for your demand and equipment. Answers “how should this
            facility supply oxygen most cheaply?”
          </DocCard>
          <DocCard icon="🗺️" title="District / State planner" chip="many facilities">
            For a group of facilities. Estimate the area’s oxygen <strong>demand</strong>, then roll up
            an annual <strong>budget</strong> across every expense head — electricity, refilling, AMC,
            repairs, HR, training, IEC, contingency. Answers “what will oxygen cost across my district?”
          </DocCard>
        </DocCards>
        <p className="muted small">
          Switch with the tabs at the top. Each tool has the same shape — <strong>Inputs</strong> on the
          left in numbered steps, <strong>Output</strong> on the right that updates live — its own
          scenarios, and its own Excel export / import.
        </p>
      </Section>

      <Section n="3" icon="🔀" title="The four oxygen sources">
        <p>Both tools compare the same four ways of supplying oxygen:</p>
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

      <Section n="4" icon="🎨" title="Reading the screen (both tabs)">
        <p>A few conventions are shared by both tools, so once you learn them the second tool feels familiar:</p>
        <LegendCards />
        <DocCards cols={2}>
          <DocCard icon="🧩" title="Presets are advanced & optional">
            Yellow fields are pre-filled defaults that already work. Only open a{' '}
            <em>“Customize / advanced”</em> tray if you want to fine-tune the deeper assumptions — most
            users can leave them as-is.
          </DocCard>
          <DocCard icon="ℹ️" title="Hover for help & cost hints">
            Every field, column and chart carries an <strong>ⓘ</strong> marker — hover it for what the
            value does. Under many inputs a small line shows the cost that input drives (e.g. the
            electricity a kW adds), with clickable amounts that jump to the rate they depend on.
          </DocCard>
          <DocCard icon="🔢" title="Numbered steps + Reset all">
            Inputs are laid out as numbered steps with a progress tracker and Back / Next. Each step has
            a <strong>Reset all</strong> button to clear just that step.
          </DocCard>
          <DocCard icon="📏" title="Choose your unit">
            A <strong>“Show demand in”</strong> toggle at the top of the output switches oxygen volumes
            between <strong>cu m</strong>, <strong>D-type cylinders</strong> (≈ 7 cu m each) and{' '}
            <strong>kg</strong>. Oxygen-volume inputs carry their own unit dropdown too.
          </DocCard>
        </DocCards>
        <p className="muted small">
          On the facility tab, a few technical inputs are quietly compared with similar facilities and
          flagged inline if they look unusual — context only, never changing the cost. Financial and
          salary figures are never benchmarked or broadcast.
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading title="Using the Facility calculator" sub="Cost a single facility, in order — its three input steps and how to read the result." />

      <Section n="5" icon="💧" title="Step 1 · Estimate the facility’s demand">
        <p>
          Everything is costed against a <strong>monthly oxygen demand</strong>. Set it three ways — the
          estimate and its clickable breakdown appear under <em>Demand output</em> on the right (in MT
          and your chosen unit):
        </p>
        <DocCards cols={3}>
          <DocCard icon="⌨️" title="Enter directly">
            Type the monthly demand in any unit if you already know it.
          </DocCard>
          <DocCard icon="🏷️" title="Facility archetype">
            Month + state + facility type + monthly IPD admissions → matched to the closest demand strata
            → admissions × O₂-per-admission factor. Normal or Pandemic (a surge multiple).
          </DocCard>
          <DocCard icon="🛏️" title="Ward-by-ward">
            O₂ patients per ward for a chosen month (the full case-mix). Case profiles, seasonality and
            scalars sit in optional advanced trays; the year is extrapolated by seasonality.
          </DocCard>
        </DocCards>
      </Section>

      <Section n="6" icon="🏭" title="Step 2 · How many of each source">
        <p>
          Tell the tool how many of each source the facility runs — pick the variant and count. Each unit
          you add becomes its own panel in Step 3.
        </p>
        <p className="muted small">
          PSA by capacity (200 / 500 / 1000 / 1500 LPM or custom), LMO by tank size (KL), cylinders by
          type (D / B), concentrators by per-unit flow.
        </p>
      </Section>

      <Section n="7" icon="🔧" title="Step 3 · Source details & shared costs">
        <p>
          Each unit gets a panel. Fill its required (red) fields — capacity, run hours, and so on; the
          power rating and other presets come pre-filled. For a PSA plant or LMO tank, choose{' '}
          <strong>purchased</strong> (a depreciated capital cost) or <strong>on rent</strong> (a fixed
          monthly fee). Give duplicate units an <em>identifier</em>.
        </p>
        <DocCards cols={2}>
          <DocCard icon="🧾" title="Shared facility costs">
            The oxygen technician / HR salary and MGPS (pipeline) upkeep are entered once at the top of
            Step 3 — paid regardless of source, so they sit outside each panel.
          </DocCard>
          <DocCard icon="🎯" title="Coverage of demand">
            On the output side, a bar tracks how much of your demand the entered sources actually supply —
            aim for about 100%.
          </DocCard>
        </DocCards>
      </Section>

      <Section n="8" icon="📊" title="Reading the facility result">
        <p>Once the steps are complete the output unlocks. Read it top to bottom:</p>
        <DocCards cols={2}>
          <DocCard icon="✅" title="Cost summary">
            The plain-language bottom line: the cheapest way to supply oxygen at your demand.
          </DocCard>
          <DocCard icon="📈" title="Cost comparison">
            Each source costed per unit, as a table + charts. The highlighted column is your active view;
            the cheapest cell is green. Click anything for its full calculation, with pills that jump back
            to the inputs.
          </DocCard>
          <DocCard icon="🔎" title="Three cost views">
            A toggle reframes every figure — <strong>Opex only</strong> (you own it, cheapest to run),{' '}
            <strong>Capex + opex</strong> (buying from scratch), <strong>Incremental</strong> (cost of
            extra volume once fixed costs are covered).
          </DocCard>
          <DocCard icon="🧾" title="Shared overhead">
            HR and MGPS costs shown separately and added for the facility’s total cost (they don’t change
            which source is cheapest).
          </DocCard>
        </DocCards>
        <p>
          Save up to three input combinations as <strong>scenarios</strong> (top of the output) and
          compare their sources, demand and per-unit costs side by side.
        </p>
        <p className="muted small">
          A note under the comparison flags that at <strong>very large demand</strong> these estimates are
          approximate — sources may run at higher, steadier utilisation than assumed.
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading title="Using the District / State planner" sub="Budget oxygen across many facilities — the same two-step shape, at scale." />

      <Section n="9" icon="💧" title="Step 1 · Estimate the area’s demand">
        <p>
          Pick a <strong>state</strong>, then a <strong>district</strong> (or the whole state). The tool
          sums the baked per-facility oxygen demand for that area and shows it under{' '}
          <em>Demand output</em>. Choose <strong>Normal</strong> or <strong>Pandemic</strong> (a surge
          multiple). Step 1 ticks complete once you’ve chosen an area.
        </p>
        <Callout icon="🔬">
          The breakdown drills down: <strong>district → facility type → individual facility</strong>.
          Every value is an editable pill — override one and the total above updates (an override
          replaces the breakdown beneath it).
        </Callout>
      </Section>

      <Section n="10" icon="🧮" title="Step 2 · Cost inputs — two ways">
        <DocCards cols={2}>
          <DocCard icon="📐" title="Estimate from facility sizes">
            Enter only how many facilities fall in each <strong>typical size</strong> (by oxygen beds). A
            model fills in each size’s typical equipment — every predicted value is shown and editable.
          </DocCard>
          <DocCard icon="🧮" title="Enter equipment (district totals)">
            Type your actual district-wide totals and the tool costs them directly, no modelling in
            between.
          </DocCard>
        </DocCards>
        <p className="muted small">
          The rates and per-facility assumptions are pre-filled presets that already work — opening the{' '}
          <em>“advanced”</em> sections to change them is optional.
        </p>
        <Callout>
          <strong>PSA plants — total vs functional.</strong> In direct mode each capacity row asks for{' '}
          <strong># total plants</strong>, <strong># functional</strong> and{' '}
          <strong>hrs/day for functional plants</strong> (# non-functional is computed). Only functional
          plants produce oxygen and draw electricity, but all owned plants carry AMC &amp; repair costs.
        </Callout>
      </Section>

      <Section n="11" icon="📊" title="Reading the planner result">
        <p>The output mirrors the facility tab’s layout, sized for a whole area:</p>
        <DocCards cols={2}>
          <DocCard icon="🎯" title="Coverage of demand">
            Stacks the oxygen your plan can actually supply (PSA output, LMO, cylinder refills,
            concentrators) against the Step-1 demand — aim for about 100% to know the infrastructure meets
            the need.
          </DocCard>
          <DocCard icon="🩺" title="Demand output">
            The estimated demand for the area with the full drill-down (see Step 1).
          </DocCard>
          <DocCard icon="💰" title="Costing output">
            The estimated budget broken down by source and facility size, with an expense table (annual +
            monthly). It stays <strong>locked</strong> until both steps are done.
          </DocCard>
          <DocCard icon="🗓️" title="Period toggle">
            At the top of the output, a <strong>Period</strong> toggle switches every budget figure (and
            the coverage bar) between <strong>Yearly</strong> and <strong>Monthly</strong>.
          </DocCard>
        </DocCards>
        <p>
          As on the facility tab, save up to three plans as <strong>scenarios</strong> and compare their
          demand and budget side by side.
        </p>
        <p className="muted small">
          Demand is estimated for the state / district you pick; the budget model is size-based and uses
          the pooled all-states reference data. Full model details are in the <strong>Methodology</strong> tab.
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading title="Data, export & privacy" sub="Moving data in and out — the same on both tabs — and where the numbers come from." />

      <Section n="12" icon="📄" title="Export & import (Excel)">
        <p>
          Both tabs have <strong>Export to Excel</strong> and <strong>Import from Excel</strong> buttons
          above the inputs. Export produces one well-formatted workbook with your inputs <em>and</em> the
          calculations:
        </p>
        <ul>
          <li>Inputs are grouped and <strong>colour-coded</strong> (green / amber / red, like the tool).</li>
          <li>
            Calculation cells are <strong>live Excel formulas</strong> — change an input in Excel and the
            components, sub-totals and grand total recompute there. (In the planner’s estimate mode the
            per-facility figures are seeded from the model while the totals stay live.)
          </li>
          <li>
            Any <strong>scenarios</strong> you saved are written as their own sheets, and{' '}
            <strong>Import</strong> reads the whole workbook back — inputs and scenarios — to refill the
            tool. Only files exported by OxyCost are accepted.
          </li>
        </ul>
      </Section>

      <Section n="13" icon="🔒" title="Where the defaults come from & privacy">
        <p>
          Data-derived defaults come from a WJCF facility-level oxygen assessment of{' '}
          <strong>92 facilities across three states in India</strong>. For the planner’s budget model,
          values are pooled across all three states — the tool never singles out or broadcasts any
          state’s figures, and salary and price figures are never benchmarked between facilities.
        </p>
        <p>
          The reference dataset ships as anonymized static data (source mix · facility size — no names or
          locations) and everything runs in your browser. For the exact formulas, data sources and
          validation cases, see the <strong>Methodology</strong> tab.
        </p>
      </Section>
    </div>
  )
}
