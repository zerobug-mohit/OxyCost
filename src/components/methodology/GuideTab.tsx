// "How to use this model" — the comprehensive, non-technical user guide:
// what the tool is, how it works, the on-screen components, and the key concepts
// a facility manager needs. The Methodology tab holds the formulas/validation.

export function GuideTab() {
  return (
    <div className="methodology">
      <h2 style={{ marginTop: 8 }}>What this tool is</h2>
      <p>
        <strong>OxyCost</strong> helps a public-health facility understand the cost
        of supplying medical oxygen. You describe what the facility has — its demand
        and its oxygen sources — and the tool returns a clear, side-by-side{' '}
        <strong>cost per cubic metre (cu m)</strong> for each source and a
        plain-language summary — with key inputs checked against similar real
        facilities as you type. It is a <strong>planning aid</strong> to support your own
        decisions, not a recommendation or a substitute for vendor quotations.
      </p>
      <p className="muted">
        Everything runs in your browser — no data is sent anywhere. Many fields
        come <strong>pre-filled with sensible defaults</strong> (drawn from a WJCF
        facility-level assessment of 92 facilities across three states in India) to
        save you effort. Every default is visible and can be changed — you are
        encouraged to replace it with your facility&apos;s actual figures wherever
        you have them.
      </p>

      <h2>Two tools in one</h2>
      <ul>
        <li>
          <strong>Facility calculator</strong> — for one facility: compare the
          per-cu-m cost of each oxygen source and use the insights to determine the
          most cost-effective option for your facility. Use it when you know a
          facility&apos;s demand and equipment.
        </li>
        <li>
          <strong>District / State planner</strong> — for budgeting across many
          facilities: enter only how many facilities you have in each{' '}
          <strong>size band</strong> (by oxygen beds), and the tool expands each into
          a typical facility (from the 92-facility assessment) to estimate the whole
          annual oxygen budget — electricity, refilling, AMC, repairs, HR, training
          and IEC. Every model assumption and state rate is pre-filled and editable.
        </li>
      </ul>

      <h2>The four oxygen sources</h2>
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
            <td>
              <strong>PSA plant</strong>
            </td>
            <td>On-site generation from ambient air.</td>
            <td>High fixed cost; very cheap per cu m when run hard.</td>
          </tr>
          <tr>
            <td>
              <strong>LMO</strong>
            </td>
            <td>Bulk liquid oxygen in a cryogenic tank, tanker-delivered.</td>
            <td>Economical at high, steady volume.</td>
          </tr>
          <tr>
            <td>
              <strong>Cylinders</strong>
            </td>
            <td>Portable compressed-gas cylinders, supplier-refilled.</td>
            <td>Flexible; flat per-unit cost — suits low or backup demand.</td>
          </tr>
          <tr>
            <td>
              <strong>Concentrators</strong>
            </td>
            <td>Bedside devices concentrating O₂ from air.</td>
            <td>Low-purity, low-flow — supplementary use only.</td>
          </tr>
        </tbody>
      </table>

      <h2>How the screen is organised</h2>
      <p>
        The Calculator has two columns: <strong>Inputs</strong> (left — what you
        change) and <strong>Output</strong> (right — your results). The output
        sections stay <strong>locked</strong> until the inputs are complete; each
        locked section tells you exactly what to do next.
      </p>
      <ul>
        <li>
          Sections are collapsible. On the left, <strong>one step is open at a
          time</strong>; a <span className="badge-ok">✓</span> appears when a step
          is complete.
        </li>
        <li>
          Input fields are colour-coded:{' '}
          <strong style={{ color: 'var(--c-req)' }}>red = required</strong> (enter a
          value), <strong style={{ color: 'var(--c-opt)' }}>amber = pre-filled default</strong>{' '}
          (update with your actual value if known), and{' '}
          <strong style={{ color: 'var(--c-entered)' }}>green = your value</strong>{' '}
          (a figure you have entered or changed).
        </li>
        <li>
          As you type, a few technical inputs are <strong>compared with similar
          facilities</strong> and flagged inline if they look unusual — context only, it
          never changes the cost.
        </li>
        <li>
          Every field, column and chart has an <span className="badge-ok">i</span>{' '}
          marker — hover it for what the value does and how changing it affects the
          result.
        </li>
        <li>
          All costs are shown <strong>inclusive of GST</strong>.
        </li>
      </ul>

      <h2>Step by step</h2>
      <ol>
        <li>
          <strong>Step 1 — Demand.</strong> Enter monthly oxygen demand in cu m, or
          switch to <em>From beds</em> to compute it.
        </li>
        <li>
          <strong>Step 2 — How many of each source.</strong> Pick the{' '}
          <em>variant</em> and how many of each: PSA by capacity (200/500/1000/1500
          LPM or custom), LMO by tank capacity (KL), cylinders by type (D / B), and
          concentrators by per-unit flow (5/10 LPM or custom). Each unit becomes its
          own pre-typed input panel and cost line in Step 3.
        </li>
        <li>
          <strong>Step 3 — Source details.</strong> Each unit is already labelled with
          its variant (e.g. &quot;PSA 1000 LPM&quot;); fill the remaining required
          fields and, if you like, open <em>Customize</em> to adjust presets. For
          a PSA plant or an LMO tank, set whether it is <strong>purchased</strong>
          (a capital cost, depreciated) or <strong>on rent</strong> (a fixed
          monthly fee) — only the one you pick is counted; the other is zero. Give
          each unit an <em>identifier</em> (manufacturer, donor, asset id…) to tell
          duplicates apart. <em>Shared facility costs</em> (technician/HR, MGPS) are
          entered once at the top. The <strong>coverage bar</strong> tracks how much
          of your demand the entered sources cover — aim for ~100%. Use{' '}
          <em>Reset all</em> on any panel to clear it.
        </li>
        <li>
          <strong>Output.</strong> Once inputs are ready, the right column unlocks:
          the <strong>Cost summary</strong> (bottom line), the{' '}
          <strong>Cost comparison</strong> (table, charts, click-through
          calculations), and <strong>Shared overhead</strong>.
        </li>
      </ol>

      <h2>The three cost views</h2>
      <p>
        The toggle above the results reframes every figure. Pick the one that
        matches your question:
      </p>
      <table>
        <thead>
          <tr>
            <th>View</th>
            <th>Use it when…</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Opex only</strong>
            </td>
            <td>You already own the equipment and want the cheapest to run.</td>
          </tr>
          <tr>
            <td>
              <strong>Capex + opex</strong>
            </td>
            <td>You are deciding whether to acquire a source from scratch.</td>
          </tr>
          <tr>
            <td>
              <strong>Incremental</strong>
            </td>
            <td>Fixed costs are already covered and you ask &quot;which source is cheapest for more volume?&quot;</td>
          </tr>
        </tbody>
      </table>

      <h2>Reading the output</h2>
      <ul>
        <li>
          <strong>Cost summary</strong> — a synthesized bottom line that combines
          the cost analysis with a check against similar facilities, in clearly
          labelled groups.
        </li>
        <li>
          <strong>Cost comparison</strong> — the highlighted column is your active
          cost view; the cheapest cell is green. The charts show cost per cu m by
          source, how cost changes with volume (with each source&apos;s current
          operating point ringed), and where each source&apos;s money goes. Click any
          row, bar, line or dot for its full calculation.
        </li>
        <li>
          <strong>Shared facility overhead</strong> — HR and MGPS costs paid
          regardless of source, shown separately and added on top for the total
          (capital + running) cost.
        </li>
      </ul>

      <p className="muted small" style={{ marginTop: 18 }}>
        For the exact formulas behind every number, the data sources, and the
        validation cases, see the <strong>Methodology</strong> tab.
      </p>
    </div>
  )
}
