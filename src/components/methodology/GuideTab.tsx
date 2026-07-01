// "How to use this model" — the comprehensive, non-technical user guide:
// what the tool is, how it works, the on-screen components, and the key concepts
// a facility manager needs. The Methodology tab holds the formulas/validation.

export function GuideTab() {
  return (
    <div className="methodology">
      <h2 style={{ marginTop: 8 }}>What this tool is</h2>
      <p>
        <strong>OxyCost</strong> helps a public-health facility decide the most
        cost-effective way to supply medical oxygen. You describe what the facility
        has — its demand and its oxygen sources — and the tool returns a clear,
        side-by-side <strong>cost per cubic metre (cu m)</strong> for each source
        and a plain-language recommendation — with key inputs checked against real
        peer facilities as you type. It is a <strong>planning aid</strong>, not a
        substitute for vendor quotations.
      </p>
      <p className="muted">
        Everything runs in your browser — no data is sent anywhere. Defaults are
        drawn from a WJCF facility-level assessment of 92 facilities across Madhya
        Pradesh, Chhattisgarh and Punjab.
      </p>

      <h2>Two tools in one</h2>
      <ul>
        <li>
          <strong>Facility calculator</strong> — for one facility: compare the
          per-cu-m cost of each oxygen source and get a recommendation. Use it when
          you know a facility&apos;s demand and equipment.
        </li>
        <li>
          <strong>District / State planner</strong> — for budgeting across many
          facilities: enter only how many facilities you have in each{' '}
          <strong>oxygen-bed band</strong>, and the tool expands each into a median
          profile (from the 92-facility assessment) to estimate the whole annual
          oxygen budget — electricity, refilling, AMC, repairs, HR, training and IEC.
          Every model assumption and state rate is pre-filled and editable.
        </li>
      </ul>

      <h2>The four oxygen sources</h2>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>What it is</th>
            <th>Cost character</th>
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
            <td>Economical at high, steady volume; rent dilutes with use.</td>
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
          <strong style={{ color: 'var(--c-req)' }}>red = required</strong> (you must
          enter), <strong style={{ color: 'var(--c-opt)' }}>amber = optional preset</strong>{' '}
          (a sensible default you may change).
        </li>
        <li>
          As you type, a few key inputs (cylinder refill price, PSA power, LMO
          rental) are <strong>compared to real peer facilities</strong> and flagged
          inline if they look unusually high or low — context only, it never changes the
          cost. Salary is deliberately left out — pay is sensitive, so it is never
          benchmarked.
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
          the <strong>Recommendation</strong> (bottom line), the{' '}
          <strong>Cost comparison</strong> (table, charts, click-through
          calculations), and <strong>Shared overhead</strong>.
        </li>
      </ol>

      <h2>The three cost views</h2>
      <p>
        The toggle above the results reframes every figure. Pick the one that
        matches your decision:
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
            <td>Fixed costs are sunk and you ask &quot;which source to use next?&quot;</td>
          </tr>
        </tbody>
      </table>

      <h2>Reading the output</h2>
      <ul>
        <li>
          <strong>Recommendation</strong> — a synthesized bottom line that combines
          the cost analysis with peer benchmarking, in clearly labelled groups.
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
          regardless of source, shown separately and added on top for the all-in
          cost.
        </li>
      </ul>

      <p className="muted small" style={{ marginTop: 18 }}>
        For the exact formulas behind every number, the data sources, and the
        validation cases, see the <strong>Methodology</strong> tab.
      </p>
    </div>
  )
}
