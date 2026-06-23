# OxyCost

**Facility-level oxygen source costing tool.** OxyCost helps public-health
facilities decide the most cost-effective way to supply medical oxygen. You
describe the facility's demand and its oxygen sources, and the tool returns a
side-by-side **cost per cubic metre (cu m)** across all sources, a plain-language
recommendation, and a comparison against real peer facilities.

🔗 **Live app:** https://zerobug-mohit.github.io/OxyCost/

> A planning aid, not a substitute for procurement quotations. Everything runs
> client-side — no data leaves the browser.

---

## Features

- **Four sources, one comparison** — PSA plants, LMO, cylinders and oxygen
  concentrators, each costed per cu m with capex, opex and depreciation.
- **Three cost views** — *opex only*, *capex + opex*, and *incremental* (marginal)
  — reframe every figure for the decision at hand.
- **Multi-unit fleets** — model any number of each source (e.g. 2 PSA plants + 1
  LMO tank), each with its own inputs and identifier.
- **Realistic engine** — compressor-run fraction & power split for PSA, part-load
  utilization, LMO boil-off loss and multi-unit input (cu m / Nm³ / L / KL / kg),
  cylinder transport, deployed high/low-use concentrators, and a shared facility
  overhead (HR + MGPS) allocated across delivered oxygen.
- **Decision support** — live demand-coverage bar, a synthesized recommendation,
  and interactive charts (cost-vs-volume crossovers, per-source bars, cost
  composition) with click-through, step-by-step calculations.
- **Peer benchmarking** — an anonymized knowledge base from a WJCF facility-level
  assessment (92 facilities across Madhya Pradesh, Chhattisgarh & Punjab):
  facilities like yours, input reality-checks, cost percentiles, and mix/reliability
  patterns by facility size.
- **Transparent** — a *How to use this model* guide and a *Methodology* tab
  documenting every formula, data source, and validation case.

## Tech stack

React 18 + TypeScript · Vite 5 · Recharts · Vitest. No backend, no database.

## Getting started

```bash
npm install      # install dependencies
npm run dev      # local dev server (http://localhost:5173/OxyCost/)
npm test         # run the test suite
npm run build    # type-check + production build to dist/
```

> Requires Node 20+.

## Project structure

```
src/
  engine/        Pure calculation engine (no UI). One file per source:
                 psa, lmo, cylinder, concentrator, comparison, sweep, explain.
                 __tests__/ validates every formula.
  insights/      Peer-benchmarking analytics over the anonymized dataset.
  components/    inputs/ · results/ · layout/ · shared/ · methodology/
  hooks/         useCalculation, usePresets
  data/          facilities.json  (anonymized benchmark dataset, generated)
  state.ts       App state shape & defaults
scripts/
  build_facilities.py   Builds the anonymized facilities.json from the survey
```

## Data & privacy

The benchmarking dataset is built from a facility survey by
`scripts/build_facilities.py`, which **anonymizes** each facility to
`type · bed-band · state` — names and districts are dropped. **The raw survey
spreadsheets are not committed** (they are git-ignored); only the anonymized
`src/data/facilities.json` ships with the app. Preset defaults are drawn from the
same assessment; PSA power ratings are industry benchmarks and concentrator
per-unit costs are market estimates (see the in-app Methodology tab).

## Deployment

Pushes to `main` are built and published to GitHub Pages by
`.github/workflows/deploy.yml`. The Vite `base` is set to `/OxyCost/` to match the
repository name.

## Support

For support, please reach out to the developer at **mchaurasiya@wjcf.in**.
