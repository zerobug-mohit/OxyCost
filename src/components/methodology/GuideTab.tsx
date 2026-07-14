// "How to use this tool" — the comprehensive, non-technical user guide, built as
// intuitive collapsible sections. Covers every feature: the two calculators,
// the input colour-code and unit-economics hints, the cost views, the display-
// unit toggle, scenarios, reading the output, the state planner, and Excel
// export/import. The Methodology tab holds the formulas.
import type { ReactNode } from 'react'
import { Collapsible } from '../shared/Collapsible'

function Section({ n, title, children, open }: { n: string; title: string; children: ReactNode; open?: boolean }) {
  return (
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
  )
}

export function GuideTab() {
  return (
    <div className="methodology">
      <p className="doc-lead">
        <strong>OxyCost</strong> helps a public-health facility understand the cost of
        supplying medical oxygen. Describe what you have — demand and oxygen sources — and
        the tool shows a clear, side-by-side <strong>cost per cubic metre (cu m)</strong> for
        each source, plus a plain-language summary. It is a <strong>planning aid to support
        your own decisions</strong> — not a recommendation, and not a substitute for vendor
        quotations. Everything runs in your browser; no data is sent anywhere.
      </p>

      <Section n="1" title="What OxyCost is (and isn't)" open>
        <p>
          The tool answers one question: <em>at my facility, what does each way of supplying
          oxygen actually cost per cu m?</em> You feed in a scenario; it returns figures. The
          accuracy of the output depends entirely on the inputs you enter — and{' '}
          <strong>every underlying assumption is visible and editable</strong>.
        </p>
        <ul>
          <li>
            Many fields come <strong>pre-filled with sensible defaults</strong> to save you
            effort. Wherever you know the real value, you are encouraged to replace the default.
          </li>
          <li>
            The tool never tells you what to do. It surfaces information so you can make a
            data-driven decision; a footer note reminds you the output is not a recommendation.
          </li>
          <li>
            <strong>Nothing leaves your browser.</strong> The anonymized reference dataset ships
            as static data and all calculation happens locally.
          </li>
        </ul>
      </Section>

      <Section n="2" title="The two tools">
        <ul>
          <li>
            <strong>Facility calculator</strong> — for a single facility. Compare the per-cu-m
            cost of each oxygen source and use the insights to see which is most cost-effective
            for your demand and equipment.
          </li>
          <li>
            <strong>District / State planner</strong> — for budgeting across many facilities.
            Enter how many facilities you have (by size, or as district equipment totals) and the
            tool rolls up an annual budget across every expense head (electricity, refilling, AMC,
            repairs, HR, training, IEC, contingency).
          </li>
        </ul>
        <p className="muted small">
          Switch between them with the tabs at the top. Each has its own inputs, outputs and Excel
          export/import.
        </p>
      </Section>

      <Section n="3" title="The four oxygen sources">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>What it is</th>
              <th>Cost pattern</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>PSA plant</strong></td>
              <td>On-site generation from ambient air.</td>
              <td>High fixed cost; very cheap per cu m when run hard.</td>
            </tr>
            <tr>
              <td><strong>LMO</strong></td>
              <td>Bulk liquid oxygen in a cryogenic tank, tanker-delivered.</td>
              <td>Economical at high, steady volume.</td>
            </tr>
            <tr>
              <td><strong>Cylinders</strong></td>
              <td>Portable compressed-gas cylinders, supplier-refilled.</td>
              <td>Flexible; flat per-unit cost — suits low or backup demand.</td>
            </tr>
            <tr>
              <td><strong>Concentrators</strong></td>
              <td>Bedside devices concentrating O₂ from air.</td>
              <td>Low-purity, low-flow — supplementary use only.</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section n="4" title="Reading the input fields">
        <p>
          Every input is colour-coded so you can see at a glance what still needs your attention:
        </p>
        <ul>
          <li>
            <span className="doc-pill req">red</span> — a <strong>required</strong> field that is
            still empty. Enter a value. Its <em>reset</em> clears it back to empty.
          </li>
          <li>
            <span className="doc-pill opt">amber</span> — a <strong>pre-filled default</strong>.
            It works as-is, but update it with your actual value if you have one. Its <em>reset</em>{' '}
            restores that default.
          </li>
          <li>
            <span className="doc-pill entered">green</span> — <strong>your value</strong>: a figure
            you have entered or changed from the default.
          </li>
        </ul>
        <h4>Hover for help (the <span className="badge-ok">i</span> marker)</h4>
        <p>
          Every field, column and chart carries an info marker. Hover it for what the value does
          and how changing it moves the result.
        </p>
        <h4>Unit-economics hints</h4>
        <p>
          Under many inputs you&apos;ll see a small line showing the cost that input drives — e.g.
          on the state planner, a facility count shows{' '}
          <em>&quot;each ≈ ₹8,000/yr (IEC)&quot;</em>; on the facility calculator, PSA power shows{' '}
          <em>&quot;+1 kW ≈ ₹2,256/mo more electricity&quot;</em>. The highlighted amounts are{' '}
          <strong>clickable</strong> — they jump straight to the rate or field they depend on, so
          you can trace and edit it. (This mirrors the output side, where every figure links back to
          its inputs.)
        </p>
        <p className="muted small">
          As you type, a few technical inputs are quietly compared with similar facilities and flagged
          inline if they look unusual — context only, never changing the cost. Financial and salary
          figures are never benchmarked or broadcast.
        </p>
      </Section>

      <Section n="5" title="Facility calculator — step by step">
        <ol>
          <li>
            <strong>Step 1 — Demand.</strong> Enter monthly oxygen demand in cu m, or switch to{' '}
            <em>From beds</em> to compute it from bed count, litres/bed and hours/day.
          </li>
          <li>
            <strong>Step 2 — How many of each source.</strong> Pick the variant and count: PSA by
            capacity (200 / 500 / 1000 / 1500 LPM or custom), LMO by tank size (KL), cylinders by
            type (D / B), concentrators by per-unit flow. Each unit becomes its own pre-typed panel
            and cost line in Step 3.
          </li>
          <li>
            <strong>Step 3 — Source details.</strong> Fill each unit&apos;s required (red) fields; open{' '}
            <em>Customize</em> to adjust presets. For a PSA plant or LMO tank, choose{' '}
            <strong>purchased</strong> (a capital cost, depreciated) or <strong>on rent</strong> (a
            fixed monthly fee) — only the one you pick is counted. Give duplicate units an{' '}
            <em>identifier</em> to tell them apart. <em>Shared facility costs</em> (technician/HR,
            MGPS) are entered once at the top. The <strong>coverage bar</strong> tracks how much of
            your demand the entered sources cover — aim for ~100%.
          </li>
          <li>
            <strong>Output.</strong> Once inputs are complete the right column unlocks: the cost
            summary, the cost comparison (table + charts + click-through calculations) and the shared
            overhead.
          </li>
        </ol>
      </Section>

      <Section n="6" title="The three cost views">
        <p>The toggle above the results reframes every figure. Pick the one that matches your question:</p>
        <table>
          <thead>
            <tr><th>View</th><th>Use it when…</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Opex only</strong></td><td>You already own the equipment and want the cheapest to run.</td></tr>
            <tr><td><strong>Capex + opex</strong></td><td>You are deciding whether to acquire a source from scratch.</td></tr>
            <tr><td><strong>Incremental</strong></td><td>Fixed costs are already covered and you ask &quot;which source is cheapest for more volume?&quot;</td></tr>
          </tbody>
        </table>
      </Section>

      <Section n="7" title="Choosing the display unit (cu m / Nm³ / kg)">
        <p>
          Above the facility results is a <strong>&quot;Show cost per&quot;</strong> toggle. Switch
          between <strong>cu m, Nm³ and kg</strong> and every per-unit figure (table, cost summary,
          scenario compare) reconverts instantly — the engine always works in cu m of gas internally,
          only the display changes.
        </p>
        <p>
          If you enter LMO consumption in one of those units, the output switches to match automatically,
          so results appear in the unit you&apos;re working in. (The charts stay in ₹/cu m, noted next to
          the toggle.)
        </p>
      </Section>

      <Section n="8" title="Comparing scenarios">
        <p>
          Save up to three input combinations as <strong>scenarios</strong>, then compare them
          side-by-side. The compare table lists each source&apos;s per-unit cost per scenario, then a
          totals block: <strong>Total supply</strong>, <strong>total monthly cost</strong>,{' '}
          <strong>shared costs</strong>, <strong>total cost</strong> and{' '}
          <strong>average cost per unit across all sources</strong>. Load a saved scenario back to edit
          it, or update/remove it.
        </p>
      </Section>

      <Section n="9" title="Reading the output">
        <ul>
          <li>
            <strong>Cost summary</strong> — the plain-language bottom line: the cheapest way to supply
            oxygen at your demand.
          </li>
          <li>
            <strong>Cost comparison</strong> — the highlighted column is your active cost view; the
            cheapest cell is green. Charts show cost per cu m by source, how cost changes with volume
            (each source&apos;s current operating point ringed), and where each source&apos;s money
            goes. Click any row, bar, line or dot for its full calculation, with pills that jump back
            to the inputs.
          </li>
          <li>
            <strong>Shared facility overhead</strong> — HR and MGPS costs paid regardless of source,
            shown separately and added on top for the total (capital + running) cost.
          </li>
        </ul>
        <p className="muted small">
          A note under the comparison flags that at <strong>very large demand</strong> these estimates
          are approximate — sources may run at higher, steadier utilisation than assumed, so real cost
          per cu m can be a little lower than shown.
        </p>
      </Section>

      <Section n="10" title="District / State planner">
        <p>
          The planner budgets oxygen across many facilities. It uses the aggregate of the whole
          assessment (all three states) — <strong>there is no state to choose</strong>. Two ways to
          describe your district:
        </p>
        <ul>
          <li>
            <strong>Estimate from facility sizes</strong> — enter only how many facilities fall in each
            size band (by oxygen beds). A model fills in each band&apos;s typical equipment (every
            predicted value is shown and editable).
          </li>
          <li>
            <strong>Enter equipment (district totals)</strong> — type your actual totals and the tool
            costs them directly.
          </li>
        </ul>
        <p>
          In the direct mode the input sections are ordered by cost weight: <strong>PSA → LMO →
          concentrators → cylinders → MGPS → staff/training</strong>, with the smaller{' '}
          <strong>IEC / facilities-by-type</strong> section last.
        </p>
        <h4>PSA plants: total vs functional</h4>
        <p>
          Each PSA capacity row asks for <strong># total plants</strong>, <strong># functional</strong>{' '}
          and <strong>hrs/day for functional plants</strong>; the <strong># non-functional</strong> is
          computed automatically. Only functional plants produce oxygen and draw electricity, but all
          owned plants (functional + non-functional) still carry AMC &amp; repair costs. Preset
          capacities are 200 / 500 / 1000 / 1500 LPM, and you can <strong>add a custom capacity</strong>
          {' '}(its power &amp; asset cost seed from the curve and are editable under <em>State unit rates</em>).
        </p>
        <p className="muted small">
          Each band&apos;s prediction carries a <strong>confidence</strong> score (High / Moderate / Low);
          the output shows a cost-weighted overall score. Full model details are in the Methodology tab.
        </p>
      </Section>

      <Section n="11" title="Export & import (Excel)">
        <p>
          Both tabs have <strong>Export to Excel</strong> and <strong>Import from Excel</strong> buttons
          above the inputs. Export produces a single, well-formatted workbook with your inputs{' '}
          <em>and</em> the calculations in one sheet:
        </p>
        <ul>
          <li>
            Inputs are grouped and <strong>colour-coded</strong> (green / amber / red, like the tool).
          </li>
          <li>
            The calculation cells are <strong>live Excel formulas</strong> that reference the input cells
            — change an input in Excel and the components, sub-totals and grand total recompute there,
            mirroring the tool. (In the planner&apos;s estimate mode the per-facility figures come from
            the model, so those are seeded values while the totals stay live.)
          </li>
          <li>
            <strong>Import</strong> reads the workbook back and autofills the tool — so you can edit in
            Excel or in the tool and round-trip either way. Only files exported by OxyCost are accepted.
          </li>
        </ul>
      </Section>

      <Section n="12" title="Where the defaults come from & privacy">
        <p>
          Data-derived defaults come from a WJCF facility-level oxygen assessment of{' '}
          <strong>92 facilities across three states in India</strong>. Values are pooled across all
          three states — the tool never singles out or broadcasts any state&apos;s figures, and salary
          and price figures are never benchmarked between facilities.
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
