// "How to use this tool" — a plain, step-by-step user guide. Shared basics first,
// then a walkthrough of the Facility calculator, then a matching walkthrough of
// the District / State planner, then data/export/privacy. The Methodology tab
// holds the formulas.
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
        <strong>OxyCost</strong> helps you work out what medical oxygen costs — for a{' '}
        <strong>single facility</strong>, or for a <strong>whole district or state</strong>. You tell
        it how much oxygen is needed and how it is supplied, and it shows the{' '}
        <strong>cost per unit</strong> for a facility, or a <strong>total budget</strong> for a
        district. It is there to help you plan — it does not replace real supplier quotes. Everything
        runs on your own device; nothing is sent anywhere.
      </p>

      <FlowSteps
        steps={[
          { icon: '💧', title: '1 · How much oxygen', body: 'How much oxygen is needed — for one facility each month, or for all the facilities in a district or state.' },
          { icon: '🏭', title: '2 · How it is supplied', body: 'The oxygen sources: PSA plants, LMO tanks, cylinders, concentrators — how many of each.' },
          { icon: '💰', title: '3 · What it costs', body: 'The cost per unit for each source at a facility, or the yearly / monthly budget for a district.' },
        ]}
      />
      <Callout icon="🎓">
        New here? Turn on <strong>Tutorial</strong> (top-right) for a step-by-step walkthrough of
        either tool that points at each control as you go.
      </Callout>

      {/* ================================================================ */}
      <GroupHeading title="Getting started" sub="What the tool is, the two tools inside it, the sources it compares, and a few things that work the same on both tabs." />

      <Section n="1" icon="🎯" title="What OxyCost does" open>
        <p>
          The tool answers one question: <em>what does supplying oxygen cost here?</em> You enter the
          details; it gives you numbers. The answer is only as good as what you type in — and{' '}
          <strong>you can see and change every number the tool uses</strong>.
        </p>
        <DocCards cols={3}>
          <DocCard icon="✏️" title="Filled in, but yours to change">
            Many fields start with a suggested value so you can get going quickly. Where you know the
            real value, type it in.
          </DocCard>
          <DocCard icon="🧭" title="It informs, you decide">
            The tool shows you the numbers so you can decide. It does not tell you what to do, and the
            result is an estimate.
          </DocCard>
          <DocCard icon="🔒" title="Stays on your device">
            Nothing leaves your browser. The reference data is built in, and every calculation runs on
            your device.
          </DocCard>
        </DocCards>
      </Section>

      <Section n="2" icon="🧰" title="The two tools — which one do I use?">
        <DocCards cols={2}>
          <DocCard icon="🏥" title="Facility calculator" chip="one facility">
            For one facility. It compares the <strong>cost per unit</strong> of each oxygen source and
            shows which is cheapest for your demand and equipment. Use it to answer “how should this
            facility supply oxygen most cheaply?”
          </DocCard>
          <DocCard icon="🗺️" title="District / State planner" chip="many facilities">
            For a group of facilities. It works out the area’s oxygen <strong>need</strong>, then adds
            up a yearly <strong>budget</strong> covering electricity, refilling, maintenance, repairs,
            staff, training and more. Use it to answer “what will oxygen cost across my district?”
          </DocCard>
        </DocCards>
        <p className="muted small">
          Switch with the tabs at the top. Both tools look the same — <strong>inputs</strong> on the
          left in numbered steps, <strong>results</strong> on the right that update as you type — and
          each can save comparisons and export to Excel.
        </p>
      </Section>

      <Section n="3" icon="🔀" title="The four oxygen sources">
        <p>Both tools compare the same four ways of supplying oxygen:</p>
        <DocCards cols={2}>
          <DocCard icon="🏭" title="PSA plant" chip="cheap when run a lot">
            Makes oxygen on site from the air. Costs a lot to set up, but very little per unit when it
            runs most of the time.
          </DocCard>
          <DocCard icon="🛢️" title="LMO" chip="good for steady, high use">
            Liquid oxygen delivered by tanker into a tank. Good value when you use a lot, steadily.
          </DocCard>
          <DocCard icon="🧯" title="Cylinders" chip="flexible / backup">
            Gas cylinders refilled by a supplier. The cost per unit stays flat — handy for low use or backup.
          </DocCard>
          <DocCard icon="🛏️" title="Concentrators" chip="extra help only">
            Small bedside machines that pull oxygen from the air. Low purity and low flow — for extra
            support, not the main supply.
          </DocCard>
        </DocCards>
      </Section>

      <Section n="4" icon="🎨" title="Things that work the same on both tabs">
        <p>A few things behave the same in both tools, so once you learn them the second tool feels familiar:</p>
        <LegendCards />
        <DocCards cols={2}>
          <DocCard icon="🧩" title="The extra settings are optional">
            Yellow fields already have a working value. You only need to open a{' '}
            <em>“Customize / advanced”</em> box if you want to change the finer details — most people
            can leave them alone.
          </DocCard>
          <DocCard icon="ℹ️" title="Hover for help">
            Every field, column and chart has an <strong>ⓘ</strong> icon — hover it to see what the
            value means. Under many fields a small line shows what that field adds to the cost.
          </DocCard>
          <DocCard icon="🔢" title="Steps and Reset">
            Inputs are laid out as numbered steps with a progress bar and Back / Next. Each step has a{' '}
            <strong>Reset all</strong> button to clear just that step.
          </DocCard>
          <DocCard icon="📏" title="Pick your unit">
            A <strong>“Show demand in”</strong> switch at the top of the results shows oxygen as{' '}
            <strong>cu m</strong>, <strong>D-type cylinders</strong> (about 7 cu m each) or{' '}
            <strong>kg</strong>. Some inputs let you pick a unit too.
          </DocCard>
        </DocCards>
        <p className="muted small">
          On the facility tab, a few technical numbers are compared with similar facilities and marked
          if they look unusual — this is just a heads-up and never changes the cost. Money and salary
          figures are never compared or shared.
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading title="Using the Facility calculator" sub="Work out the cost for one facility, in order — three input steps and how to read the result." />

      <Section n="5" icon="💧" title="Step 1 · How much oxygen the facility needs">
        <p>
          Everything is costed against the <strong>oxygen used per month</strong>. You can set it three
          ways — the number and its breakdown show under <em>Demand output</em> on the right:
        </p>
        <DocCards cols={3}>
          <DocCard icon="⌨️" title="Type it in">
            Enter the monthly amount if you already know it.
          </DocCard>
          <DocCard icon="🏷️" title="From admissions">
            Pick the month, state, facility type and monthly admissions — the tool matches a similar
            group of facilities and estimates the oxygen. Choose Normal or Pandemic (a higher level).
          </DocCard>
          <DocCard icon="🛏️" title="Ward by ward">
            Enter the number of oxygen patients in each ward for a month. Finer settings sit in optional
            boxes; the tool fills in the rest of the year for you.
          </DocCard>
        </DocCards>
      </Section>

      <Section n="6" icon="🏭" title="Step 2 · How many of each source">
        <p>
          Tell the tool how many of each source the facility has — pick the type and the number. Each
          one you add gets its own panel in Step 3.
        </p>
        <p className="muted small">
          PSA by size (200 / 500 / 1000 / 1500 LPM or a custom size), LMO by tank size (KL), cylinders
          by type (D / B), concentrators by flow rate.
        </p>
      </Section>

      <Section n="7" icon="🔧" title="Step 3 · The details for each source">
        <p>
          Each one gets a panel. Fill in the required (red) fields — like size and run hours; the power
          rating and other values are already filled in. For a PSA plant or LMO tank, choose whether it
          is <strong>bought</strong> (a one-off cost spread over its life) or <strong>rented</strong> (a
          fixed monthly fee). If you have two of the same, give each a name.
        </p>
        <DocCards cols={2}>
          <DocCard icon="🧾" title="Shared costs">
            The oxygen technician / staff pay and the pipeline (MGPS) upkeep are entered once at the top
            of Step 3, because they are paid whichever source you use.
          </DocCard>
          <DocCard icon="🎯" title="Does the supply cover the need?">
            On the right, a bar shows how much of your demand the sources you entered can actually
            supply — aim for about 100%.
          </DocCard>
        </DocCards>
      </Section>

      <Section n="8" icon="📊" title="Reading the facility result">
        <p>Once the steps are done, the results open up. Read them top to bottom:</p>
        <DocCards cols={2}>
          <DocCard icon="✅" title="The bottom line">
            A short, plain summary of the cheapest way to supply oxygen at your demand.
          </DocCard>
          <DocCard icon="📈" title="Cost comparison">
            Each source’s cost per unit, as a table and charts. The cheapest is highlighted. Click
            anything to see how it was worked out, with links back to the inputs.
          </DocCard>
          <DocCard icon="🔎" title="Three ways to look at cost">
            A switch changes what the cost includes: <strong>Opex only</strong> = running cost, if you
            already own it; <strong>Capex + Opex</strong> = running plus the buying cost, for buying
            new; <strong>Incremental</strong> = just the cost of a bit more once the fixed costs are paid.
          </DocCard>
          <DocCard icon="🧾" title="Shared costs">
            Staff and pipeline costs are shown on their own and added to the facility’s total (they
            don’t change which source is cheapest).
          </DocCard>
        </DocCards>
        <p>
          You can save up to three versions as <strong>scenarios</strong> (top of the results) and
          compare their sources, demand and cost side by side.
        </p>
        <p className="muted small">
          A note under the comparison points out that at <strong>very high demand</strong> the numbers
          are rough — a source may run harder and steadier than assumed, so the real cost per unit can
          be a little lower.
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading title="Using the District / State planner" sub="Budget oxygen for many facilities at once — the same two-step shape, at a larger scale." />

      <Section n="9" icon="💧" title="Step 1 · How much oxygen the area needs">
        <p>
          Pick a <strong>state</strong>, then a <strong>district</strong> (or the whole state). The tool
          adds up the built-in oxygen need for every facility in that area and shows it under{' '}
          <em>Demand output</em>. Choose <strong>Normal</strong> or <strong>Pandemic</strong> (a higher
          level). Step 1 is ticked done once you pick an area.
        </p>
        <Callout icon="🔬">
          You can open up the total: <strong>district → facility type → each facility</strong>. Every
          number can be edited — change one and the total above updates (your change replaces the
          numbers under it).
        </Callout>
      </Section>

      <Section n="10" icon="🧮" title="Step 2 · The cost inputs — two ways">
        <DocCards cols={2}>
          <DocCard icon="📐" title="From facility sizes">
            Just enter how many facilities you have of each <strong>size</strong> (by oxygen beds). The
            tool fills in the typical equipment for each size — and you can change any of it.
          </DocCard>
          <DocCard icon="🧮" title="From your own equipment totals">
            Enter your actual totals across the district, and the tool costs them directly.
          </DocCard>
        </DocCards>
        <p className="muted small">
          The rates and other values are already filled in and work as-is — you only need to open the{' '}
          <em>“advanced”</em> boxes if you want to change them.
        </p>
        <Callout>
          <strong>PSA plants — total vs working.</strong> If you enter equipment directly, each size
          asks for the <strong>total number of plants</strong>, <strong>how many work</strong>, and{' '}
          <strong>hours per day for the working ones</strong>. Only working plants make oxygen and use
          electricity, but all of them still cost money to maintain.
        </Callout>
      </Section>

      <Section n="11" icon="📊" title="Reading the planner result">
        <p>The results look like the facility tab, but for a whole area:</p>
        <DocCards cols={2}>
          <DocCard icon="🎯" title="Does the supply cover the need?">
            A bar shows how much oxygen the equipment in your plan can make or deliver in a year,
            against the need from Step 1 — aim for about 100%.
          </DocCard>
          <DocCard icon="🩺" title="Demand output">
            The oxygen need for the area, with the full breakdown (see Step 1).
          </DocCard>
          <DocCard icon="💰" title="Costing output">
            The budget, split by source and by facility size, with a table showing yearly and monthly
            figures. It stays <strong>locked</strong> until both steps are done.
          </DocCard>
          <DocCard icon="🗓️" title="Yearly / Monthly">
            A switch at the top of the results shows every budget figure (and the coverage bar) by year
            or by month.
          </DocCard>
        </DocCards>
        <p>
          As on the facility tab, you can save up to three plans as <strong>scenarios</strong> and
          compare their need and budget side by side.
        </p>
        <p className="muted small">
          The need is worked out for the state / district you pick; the budget uses combined data from
          all the surveyed states. More detail is in the <strong>Methodology</strong> tab.
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading title="Saving, sharing & privacy" sub="Moving your work in and out — the same on both tabs — and where the numbers come from." />

      <Section n="12" icon="📄" title="Save to Excel (and load it back)">
        <p>
          Both tabs have <strong>Export to Excel</strong> and <strong>Import from Excel</strong> buttons
          above the inputs. Export makes one Excel file with your inputs and the calculations together:
        </p>
        <ul>
          <li>Inputs are grouped and colour-coded (green / amber / red, like in the tool).</li>
          <li>
            The calculations are <strong>real Excel formulas</strong> — change an input in Excel and the
            totals update there too.
          </li>
          <li>
            Any <strong>scenarios</strong> you saved become their own sheets, and{' '}
            <strong>Import</strong> reads the whole file back in — inputs and scenarios. Only files made
            by OxyCost can be loaded.
          </li>
        </ul>
      </Section>

      <Section n="13" icon="🔒" title="Where the numbers come from, and privacy">
        <p>
          The built-in values come from a WJCF oxygen survey of{' '}
          <strong>92 facilities across three states in India</strong>. For the district budget, the data
          is combined across all three states — the tool never singles out one state, and money and
          salary figures are never compared between facilities.
        </p>
        <p>
          The survey data is built in with no names or locations, and everything runs on your device.
          For the exact formulas and data sources, see the <strong>Methodology</strong> tab.
        </p>
      </Section>
    </div>
  )
}
