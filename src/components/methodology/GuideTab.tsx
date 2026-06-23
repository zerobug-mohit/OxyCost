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
        side-by-side <strong>cost per cubic metre (cu m)</strong> for each source,
        a plain-language recommendation, and a comparison against real peer
        facilities. It is a <strong>planning aid</strong>, not a substitute for
        vendor quotations.
      </p>
      <p className="muted">
        Everything runs in your browser — no data is sent anywhere. Defaults are
        drawn from a WJCF facility-level assessment of 92 facilities across Madhya
        Pradesh, Chhattisgarh and Punjab.
      </p>

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
          switch to <em>From beds</em> to compute it. Optionally enter{' '}
          <em>oxygen beds</em> — it powers the peer benchmarking and changes no cost.
        </li>
        <li>
          <strong>Step 2 — How many of each source.</strong> Use the + / − steppers
          to match your facility (e.g. 2 PSA plants, 1 LMO tank). Each unit becomes
          its own input panel and cost line.
        </li>
        <li>
          <strong>Step 3 — Source details.</strong> For each unit, fill the required
          fields and, if you like, open <em>Customize</em> to adjust presets. Give
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
          calculations), <strong>Shared overhead</strong>, and{' '}
          <strong>Benchmarks</strong>.
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
        <li>
          <strong>Benchmarks</strong> — facilities like yours, how your inputs
          compare to peers, where your cost stands, and what facilities your size
          typically run.
        </li>
      </ul>

      <p className="muted small" style={{ marginTop: 18 }}>
        For the exact formulas behind every number, the data sources, and the
        validation cases, see the <strong>Methodology</strong> tab.
      </p>
    </div>
  )
}
