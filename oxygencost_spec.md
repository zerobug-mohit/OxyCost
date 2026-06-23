# OxyCost: facility-level oxygen source costing tool

## 1. Project overview

OxyCost is a browser-based tool that helps public health facilities determine the most cost-effective source of medical oxygen given their specific infrastructure, usage patterns, and local cost parameters. The tool accepts facility-level inputs (what sources they have, how many units, their local costs, and estimated demand) and returns a comparative cost analysis across all available oxygen sources, with a clear recommendation.

The tool is designed for state-level program managers and facility administrators in India's public health system, particularly those managing oxygen infrastructure under NHM. It is not a generic calculator but encodes domain-specific logic around PSA plant operations, LMO supply chains, cylinder logistics, and oxygen concentrator limitations.

### Target deployment

Vite-based SPA hosted on GitHub Pages. No backend. All calculations run client-side in a dedicated calculation engine module that is cleanly separated from the UI.

---

## 2. Oxygen sources covered

### 2a. PSA (pressure swing adsorption) plants

On-site oxygen generation. The facility owns or has been allocated a PSA plant that produces medical-grade oxygen from ambient air.

**Key nuances:**
- Capacity is rated in LPM (litres per minute). Common sizes in Indian public facilities: 200, 500, 960/1000, 1500 LPM.
- There is a critical distinction between **run time** and **production time**. PSA plants require a startup/stabilization period before they produce spec-grade oxygen. The workbook models this as: `production_hours = run_hours - (0.5 * number_of_startups_per_month)`. For a plant running continuously, number_of_startups = 1, so the deduction is 0.5 hours. For a plant started once per day (30 times/month), the deduction is 15 hours. This matters significantly at low utilization.
- Output is in litres of gaseous oxygen. Conversion to cubic metres: `O2_cu_m = O2_litres / 1000`.
- Power consumption is the dominant variable cost. It depends on plant capacity and manufacturer specifications.
- Electricity costs have two components: **usage charges** (per kWh, variable with run hours) and **fixed charges** (monthly demand/contract charges, independent of run hours).
- Maintenance is typically an AMC/CMC contract, modeled as a percentage of plant cost (workbook uses 3.27% annually).
- Depreciation is straight-line: `plant_cost / plant_life_years`.

### 2b. LMO (liquid medical oxygen)

Bulk liquid oxygen delivered by tanker and stored in a cryogenic vessel (Dura cylinder or VIE tank) at the facility.

**Key nuances:**
- LMO is stored as liquid but dispensed as gas after vaporization. The conversion factor is: `LMO_volume_litres = gas_volume_cu_m / 0.861`. This means 1 litre of LMO expands to approximately 0.861 cubic metres of gaseous oxygen (at standard conditions). This is encoded in the workbook as the denominator 0.861.
- Cost components are: tank rental (monthly, includes GST at 18%), HR/salary for tank operator, refilling cost per unit volume (includes 12% GST), handling and transportation per unit volume (includes 18% GST).
- The workbook computes refilling as `15.22 * 1.12 / 0.861` = INR per cu m of gas. The 15.22 is the base cost per litre of LMO, 1.12 is the 12% GST multiplier, 0.861 is the litre-to-cu-m conversion.
- Similarly, handling/transport = `16.78 * 1.18 / 0.861` = INR per cu m.
- Rental and HR are fixed monthly costs that get amortized over the volume consumed. So the per-unit cost drops sharply with higher consumption.
- "Run hours" is not a meaningful concept for LMO since vaporization is passive/on-demand. The input is simply **monthly consumption in cu m** (or equivalently, in litres of LMO).
- Capex: the cryogenic vessel costs approximately INR 50,00,000 with a 10-year life, giving a monthly depreciation of ~INR 41,667.

### 2c. Cylinders

Compressed oxygen in portable cylinders, refilled and returned by a supplier.

**Two cylinder types:**
- **D-type (Jumbo)**: 7 cu m capacity per cylinder. Capex = INR 11,200. Life = 15 years.
- **B-type**: 1.5 cu m capacity per cylinder. Capex = INR 5,100. Life = 15 years.

**Key nuances:**
- The cost per cylinder refill varies enormously by location (the workbook has actual data from 41 district hospitals in MP, ranging from INR 196 to INR 700 for D-type, and INR 60 to INR 450 for B-type).
- Per cu m cost (opex) = refill cost / cylinder volume. For D-type: cost/7. For B-type: cost/1.5.
- Capex amortization depends on rotation frequency. The workbook models three scenarios:
  - Low usage: 1 refill/month over 15 years = 180 rotations. Capex per rotation = purchase price / 180.
  - Median usage: 2 refills/month = 360 rotations.
  - High usage: 4 refills/month = 720 rotations.
- Capex per cu m = capex per rotation / cylinder volume.
- **Hydrostatic testing**: every 5 years, cylinders must pass a hydrostatic pressure test (a regulatory requirement). This is an additional periodic cost that the original workbook does not model but should be included as an optional input. Typical cost: INR 200-500 per cylinder per test.

### 2d. Oxygen concentrators (new addition)

Portable/bedside devices that concentrate oxygen from ambient air, typically delivering 5-10 LPM.

**Key nuances and limitations (must be clearly stated in the tool):**
- Output is **low-purity oxygen** (typically 90-96% vs 99%+ for PSA/LMO/cylinders). Not suitable for all clinical applications.
- Flow rate is low (5-10 LPM per unit). Only suitable for low-acuity patients on supplemental oxygen, not for ventilators or high-flow nasal cannula.
- Each unit serves one patient at a time (or two at low flow rates via a splitter).
- No storage capability (unlike PSA which can feed into a manifold/pipeline, or LMO which sits in a tank).
- Relatively low capex per unit (INR 30,000-80,000) but high number of units needed to serve a ward.
- Power consumption: 300-600W per unit.
- Maintenance: filter replacement, compressor servicing.
- Suitable only as a supplement to other sources, not as a primary oxygen supply for a hospital.

**Cost model for OCs:**
- Capex per unit (purchase price)
- Number of units
- Life of unit (typically 5-8 years)
- Power consumption per unit (W)
- Electricity rate (INR/kWh)
- Hours of operation per day
- Maintenance cost per unit per year
- Output: LPM per unit, converted to cu m/month based on hours of operation
- Monthly depreciation = (units * price_per_unit) / (life_years * 12)

---

## 3. Unit system and conversions

This section defines every conversion used in the calculation engine. All internal calculations should use **cubic metres (cu m)** as the standard output unit.

### 3a. Volume conversions

| From | To | Formula | Notes |
|---|---|---|---|
| Litres of gaseous O2 | Cubic metres of gaseous O2 | `cu_m = litres / 1000` | Used for PSA output and cylinder capacity |
| Litres of LMO (liquid) | Cubic metres of gaseous O2 | `cu_m = lmo_litres * 0.861` | Vaporization expansion. 1 L LMO = 0.861 cu m gas. Inverse: `lmo_litres = cu_m / 0.861` |
| Cylinder units (D-type) | Cubic metres | `cu_m = cylinders * 7` | Each D-type/Jumbo cylinder holds 7 cu m |
| Cylinder units (B-type) | Cubic metres | `cu_m = cylinders * 1.5` | Each B-type cylinder holds 1.5 cu m |

### 3b. Flow rate conversions

| From | To | Formula | Notes |
|---|---|---|---|
| LPM (litres per minute) | cu m per hour | `cu_m_hr = lpm * 60 / 1000` | For PSA rated capacity |
| LPM | Nm3/hr | `nm3_hr = lpm * 60 / 1000` | Approximately equivalent at standard conditions. The tool should display both. |

### 3c. Currency

All costs in Indian Rupees (INR). No currency conversion needed. GST handling:
- LMO rental: 18% GST (multiply base by 1.18)
- LMO refilling: 12% GST (multiply base by 1.12)
- LMO handling/transport: 18% GST (multiply base by 1.18)
- PSA and cylinder costs: assumed inclusive unless the user specifies otherwise

---

## 4. Calculation engine specification

This is the core of the project. The engine must be a **standalone TypeScript module** (`src/engine/`) with no UI dependencies. Each source type has its own calculator function. A coordinator function runs all enabled sources and returns a ranked comparison.

All formulas below are derived directly from the Excel workbook and must produce identical results when given the same inputs.

### 4a. PSA cost calculator

**Inputs (all monthly):**

| Parameter | Key | Required | Type | Default | Notes |
|---|---|---|---|---|---|
| Plant capacity | `psa_capacity_lpm` | Yes | number | none | In LPM |
| Power consumption | `psa_power_kw` | Yes | number | none | In KW per hour of operation |
| Electricity usage rate | `electricity_rate_per_kwh` | Yes | number | 7.52 | INR per kWh (preset, togglable) |
| Electricity fixed charges | `electricity_fixed_monthly` | No | number | 0 | INR per month. Preset options by capacity: 200 LPM = 9,500; 500 LPM = 20,000; 1000 LPM = 25,000; 1500 LPM = 30,436 |
| Plant purchase cost | `psa_plant_cost` | Yes (for capex) | number | none | INR |
| Plant life | `psa_plant_life_years` | Yes (for capex) | number | 10 | Years |
| AMC/CMC annual cost | `psa_amc_annual` | No | number | `0.0327 * psa_plant_cost` | Auto-calculated as 3.27% of plant cost if not overridden |
| Annual repair expenses | `psa_repair_annual` | No | number | 0 | INR |
| Technician monthly salary | `psa_technician_salary` | Yes | number | 21000 | INR per month (total for all technicians) |
| Monthly run hours | `psa_run_hours_monthly` | Yes | number | none | Total hours the plant runs in the month (1-720) |
| Number of startups per month | `psa_startups_monthly` | No | number | 30 | Default assumes once-per-day startup. Set to 1 for continuous operation. |

**Calculations (step by step):**

```
CALC-PSA-01: electricity_kwh_consumed
  = psa_power_kw * psa_run_hours_monthly
  // Total electricity units consumed in the month

CALC-PSA-02: production_hours
  = psa_run_hours_monthly - (0.5 * psa_startups_monthly)
  // Subtract half an hour per startup for stabilization
  // If result < 0, clamp to 0

CALC-PSA-03: o2_produced_litres
  = production_hours * 60 * psa_capacity_lpm
  // Convert production hours to minutes, multiply by capacity

CALC-PSA-04: o2_produced_cu_m
  = o2_produced_litres / 1000

CALC-PSA-05: cost_electricity_usage
  = electricity_kwh_consumed * electricity_rate_per_kwh
  // Variable cost: scales with run hours

CALC-PSA-06: cost_electricity_fixed
  = electricity_fixed_monthly
  // Fixed monthly charge, independent of usage

CALC-PSA-07: cost_technician
  = psa_technician_salary
  // Fixed monthly cost

CALC-PSA-08: cost_maintenance
  = psa_amc_annual / 12
  // Monthly share of annual AMC

CALC-PSA-09: cost_repairs
  = psa_repair_annual / 12
  // Monthly share of annual repair budget

CALC-PSA-10: cost_depreciation
  = (psa_plant_cost / psa_plant_life_years) / 12
  // Monthly straight-line depreciation

CALC-PSA-11: total_monthly_cost
  = cost_electricity_usage + cost_electricity_fixed + cost_technician
    + cost_maintenance + cost_repairs + cost_depreciation

CALC-PSA-12: per_cu_m_capex_opex
  = total_monthly_cost / o2_produced_cu_m
  // Per unit cost including depreciation (capex proxy)
  // Guard: if o2_produced_cu_m == 0, return Infinity

CALC-PSA-13: per_cu_m_opex_only
  = (total_monthly_cost - cost_depreciation) / o2_produced_cu_m
  // Per unit cost excluding depreciation
  // Guard: if o2_produced_cu_m == 0, return Infinity

CALC-PSA-14: incremental_cost_per_cu_m
  = cost_electricity_usage / o2_produced_cu_m
  // The marginal cost of producing one more cu m
  // (only electricity usage charges vary with output)
```

**Variable vs fixed cost classification:**
- Variable (scales with run hours): `cost_electricity_usage`
- Fixed (monthly, regardless of run hours): `cost_electricity_fixed`, `cost_technician`, `cost_maintenance`, `cost_repairs`, `cost_depreciation`

### 4b. LMO cost calculator

**Inputs (all monthly):**

| Parameter | Key | Required | Type | Default | Notes |
|---|---|---|---|---|---|
| Monthly consumption | `lmo_monthly_cu_m` | Yes | number | none | In cu m of gaseous O2 consumed. The tool should also accept input in litres of LMO and auto-convert. |
| Tank rental (monthly) | `lmo_rental_monthly` | Yes | number | 67260 | INR. Default = 57,000 * 1.18 (18% GST). Preset, togglable. |
| Operator salary (monthly) | `lmo_salary_monthly` | Yes | number | 15000 | INR |
| Refilling cost per litre LMO (base, pre-GST) | `lmo_refill_base_per_litre` | No | number | 15.22 | INR per litre of LMO, before GST |
| Refilling GST rate | `lmo_refill_gst` | No | number | 0.12 | 12% |
| Handling/transport cost per litre LMO (base, pre-GST) | `lmo_handling_base_per_litre` | No | number | 16.78 | INR per litre of LMO, before GST |
| Handling GST rate | `lmo_handling_gst` | No | number | 0.18 | 18% |
| Tank purchase cost | `lmo_tank_cost` | No (for capex) | number | 5000000 | INR |
| Tank life | `lmo_tank_life_years` | No (for capex) | number | 10 | Years |

**Calculations:**

```
CALC-LMO-01: lmo_volume_litres
  = lmo_monthly_cu_m / 0.861
  // Convert gas cu m back to LMO litres for per-unit cost calculations

CALC-LMO-02: cost_rental
  = lmo_rental_monthly
  // Fixed monthly cost

CALC-LMO-03: cost_salary
  = lmo_salary_monthly
  // Fixed monthly cost

CALC-LMO-04: cost_refilling_per_cu_m
  = lmo_refill_base_per_litre * (1 + lmo_refill_gst) / 0.861
  // Per cu m variable cost
  // The 0.861 converts from per-litre-LMO to per-cu-m-gas

CALC-LMO-05: cost_handling_per_cu_m
  = lmo_handling_base_per_litre * (1 + lmo_handling_gst) / 0.861
  // Per cu m variable cost

CALC-LMO-06: total_refilling
  = cost_refilling_per_cu_m * lmo_monthly_cu_m

CALC-LMO-07: total_handling
  = cost_handling_per_cu_m * lmo_monthly_cu_m

CALC-LMO-08: cost_depreciation
  = (lmo_tank_cost / lmo_tank_life_years) / 12
  // Monthly straight-line depreciation of cryogenic vessel

CALC-LMO-09: total_monthly_cost
  = cost_rental + cost_salary + total_refilling + total_handling + cost_depreciation

CALC-LMO-10: per_cu_m_capex_opex
  = total_monthly_cost / lmo_monthly_cu_m

CALC-LMO-11: per_cu_m_opex_only
  = (total_monthly_cost - cost_depreciation) / lmo_monthly_cu_m

CALC-LMO-12: per_cu_m_rental_component
  = cost_rental / lmo_monthly_cu_m
  // Shows how rental dilutes with volume

CALC-LMO-13: per_cu_m_salary_component
  = cost_salary / lmo_monthly_cu_m

CALC-LMO-14: incremental_cost_per_cu_m
  = cost_refilling_per_cu_m + cost_handling_per_cu_m
  // The marginal cost of consuming one more cu m
  // (only refilling and handling vary with volume)
```

### 4c. Cylinder cost calculator

**Inputs:**

| Parameter | Key | Required | Type | Default | Notes |
|---|---|---|---|---|---|
| Cylinder type | `cyl_type` | Yes | enum | none | `"d_type"` (Jumbo, 7 cu m) or `"b_type"` (1.5 cu m) |
| Refill cost per cylinder | `cyl_refill_cost` | Yes | number | none | INR per refill (opex). This is the primary input. |
| Number of cylinders consumed per month | `cyl_monthly_count` | Yes | number | none | How many cylinder refills per month |
| Purchase price per cylinder | `cyl_purchase_price` | No (for capex) | number | 11200 (D-type) / 5100 (B-type) | INR |
| Cylinder lifetime | `cyl_lifetime_years` | No (for capex) | number | 15 | Years |
| Number of cylinders owned | `cyl_owned_count` | No (for capex) | number | none | For calculating per-cylinder rotation frequency |
| Hydrostatic test cost per cylinder | `cyl_hydrotest_cost` | No | number | 0 | INR per test |
| Hydrostatic test interval | `cyl_hydrotest_interval_years` | No | number | 5 | Years between tests |

**Calculations:**

```
CALC-CYL-01: volume_per_cylinder
  = cyl_type == "d_type" ? 7 : 1.5
  // Cu m per cylinder

CALC-CYL-02: monthly_volume_cu_m
  = cyl_monthly_count * volume_per_cylinder

CALC-CYL-03: cost_refills
  = cyl_refill_cost * cyl_monthly_count
  // Total monthly opex for refills

CALC-CYL-04: per_cu_m_opex
  = cyl_refill_cost / volume_per_cylinder
  // Opex cost per cu m

CALC-CYL-05: rotations_over_lifetime
  = (cyl_monthly_count / cyl_owned_count) * 12 * cyl_lifetime_years
  // How many times each cylinder gets refilled over its life
  // If cyl_owned_count is not provided, assume cyl_owned_count = cyl_monthly_count (each cylinder used once per month)

CALC-CYL-06: capex_per_rotation
  = cyl_purchase_price / rotations_over_lifetime

CALC-CYL-07: capex_per_cu_m
  = capex_per_rotation / volume_per_cylinder

CALC-CYL-08: hydrotest_monthly_cost
  = (cyl_owned_count * cyl_hydrotest_cost) / (cyl_hydrotest_interval_years * 12)
  // Amortized monthly hydrostatic testing cost

CALC-CYL-09: hydrotest_per_cu_m
  = hydrotest_monthly_cost / monthly_volume_cu_m

CALC-CYL-10: per_cu_m_capex_opex
  = per_cu_m_opex + capex_per_cu_m + hydrotest_per_cu_m

CALC-CYL-11: total_monthly_cost
  = cost_refills + (cyl_owned_count * cyl_purchase_price / (cyl_lifetime_years * 12)) + hydrotest_monthly_cost

CALC-CYL-12: incremental_cost_per_cu_m
  = cyl_refill_cost / volume_per_cylinder
  // Same as opex per cu m because every additional cylinder is a new refill
```

### 4d. Oxygen concentrator cost calculator

**Inputs:**

| Parameter | Key | Required | Type | Default | Notes |
|---|---|---|---|---|---|
| Number of units | `oc_num_units` | Yes | number | none | |
| Output per unit | `oc_output_lpm` | Yes | number | 5 | LPM per concentrator |
| Purchase price per unit | `oc_price_per_unit` | Yes | number | 50000 | INR |
| Unit life | `oc_life_years` | Yes | number | 5 | Years |
| Power consumption per unit | `oc_power_watts` | Yes | number | 350 | Watts |
| Electricity rate | `oc_electricity_rate` | Yes | number | 7.52 | INR per kWh (shared with PSA) |
| Hours of operation per day | `oc_hours_per_day` | Yes | number | 12 | |
| Days of operation per month | `oc_days_per_month` | No | number | 30 | |
| Annual maintenance cost per unit | `oc_maintenance_per_unit` | No | number | 5000 | INR |

**Calculations:**

```
CALC-OC-01: monthly_hours
  = oc_hours_per_day * oc_days_per_month

CALC-OC-02: monthly_output_litres
  = oc_num_units * oc_output_lpm * 60 * monthly_hours
  // Total litres of O2 produced per month across all units

CALC-OC-03: monthly_output_cu_m
  = monthly_output_litres / 1000

CALC-OC-04: monthly_electricity_kwh
  = oc_num_units * (oc_power_watts / 1000) * monthly_hours

CALC-OC-05: cost_electricity
  = monthly_electricity_kwh * oc_electricity_rate

CALC-OC-06: cost_depreciation
  = (oc_num_units * oc_price_per_unit) / (oc_life_years * 12)

CALC-OC-07: cost_maintenance
  = (oc_num_units * oc_maintenance_per_unit) / 12

CALC-OC-08: total_monthly_cost
  = cost_electricity + cost_depreciation + cost_maintenance

CALC-OC-09: per_cu_m_capex_opex
  = total_monthly_cost / monthly_output_cu_m

CALC-OC-10: per_cu_m_opex_only
  = (cost_electricity + cost_maintenance) / monthly_output_cu_m

CALC-OC-11: incremental_cost_per_cu_m
  = cost_electricity / monthly_output_cu_m
  // Only electricity varies with hours of use
```

**Limitations flag (always displayed alongside OC results):**
- Output is low-purity (90-96%), not suitable for high-acuity patients or ventilators
- Low flow rate (5-10 LPM per unit) limits clinical application
- No storage capability; supply stops when power stops
- Should be considered a supplementary source, not primary

### 4e. Comparison and recommendation engine

**Function: `compareAllSources(inputs, demandCuM)`**

Takes the demand (monthly cu m needed) and results from all enabled source calculators.

```
CALC-COMP-01: For each enabled source, compute:
  - per_cu_m_capex_opex
  - per_cu_m_opex_only
  - incremental_cost_per_cu_m
  - total_monthly_cost
  - monthly_output_cu_m (what the source can actually deliver)

CALC-COMP-02: supply_gap
  = demandCuM - sum of all enabled sources' monthly_output_cu_m
  // Positive means demand exceeds supply capacity

CALC-COMP-03: Rank sources by:
  a) per_cu_m_opex_only (ascending) -- for opex comparison
  b) per_cu_m_capex_opex (ascending) -- for total cost comparison
  c) incremental_cost_per_cu_m (ascending) -- for marginal cost comparison

CALC-COMP-04: Generate recommendation text based on:
  - If one source is cheapest on all three metrics: clear recommendation
  - If different sources win on different metrics: explain the tradeoff
  - If supply gap > 0: flag that current sources cannot meet demand
  - If OC is cheapest: add caveat about clinical limitations
  - If PSA utilization is very low (<30% of capacity used): flag underutilization
```

---

## 5. Input handling: required vs preset

### 5a. Required inputs (user must provide)

These have no sensible universal default and must be entered by the facility:

- **Demand estimate**: monthly O2 consumption in cu m (or allow entry in LPM average + hours, which is converted)
- **Sources available**: which of PSA / LMO / Cylinders / OC they have (checkboxes)
- **PSA**: capacity (LPM), power consumption (KW), run hours per month
- **LMO**: monthly consumption in cu m
- **Cylinders**: type, refill cost per cylinder, monthly cylinder count
- **OC**: number of units, output per unit (LPM)

### 5b. Preset inputs (shown with toggle to override)

These have reasonable defaults from the workbook data (MP state context). They are displayed with their default value and a toggle/edit icon to override:

| Input | Default | Source |
|---|---|---|
| Electricity rate (INR/kWh) | 7.52 | MP industrial tariff |
| PSA AMC rate | 3.27% of plant cost | Industry standard |
| PSA plant life | 10 years | Median assumption |
| PSA technician salary | INR 21,000/month | Median from workbook |
| PSA startups per month | 30 (once daily) | Common operational pattern |
| Electricity fixed charges | Varies by capacity (see section 4a) | Workbook data |
| LMO tank rental | INR 67,260/month | 57,000 + 18% GST |
| LMO operator salary | INR 15,000/month | Workbook data |
| LMO refill cost/litre | INR 15.22 (pre-GST) | Workbook data |
| LMO handling cost/litre | INR 16.78 (pre-GST) | Workbook data |
| Cylinder purchase price | INR 11,200 (D) / 5,100 (B) | Capital Medicals, Bhopal |
| Cylinder lifetime | 15 years | Industry standard |
| Hydrotest interval | 5 years | Regulatory requirement |
| OC price per unit | INR 50,000 | Market estimate |
| OC power consumption | 350W | Typical 5 LPM unit |
| OC unit life | 5 years | Manufacturer guidance |

### 5c. Demand input modes

The tool should support three ways of specifying demand (user picks one):

1. **Direct entry in cu m/month**: simplest, for users who already know their consumption
2. **From bed count**: number of O2 beds * average LPM per bed * average hours per day * 30 days, converted to cu m
3. **From PSA capacity utilization**: PSA capacity (LPM) * target utilization % * 24 * 30 * 60 / 1000, gives monthly cu m

---

## 6. Total cost vs incremental cost

This is a critical analytical distinction the tool must surface clearly.

### 6a. Total cost per cu m (average cost)

`total_monthly_cost / monthly_output_cu_m`

This is the standard comparison metric. It includes all fixed costs amortized over actual production. It tells you: "What does each unit of oxygen actually cost me, all-in?"

Use case: comparing sources when deciding which to invest in from scratch.

### 6b. Incremental cost per cu m (marginal cost)

The cost of producing/consuming one additional cu m, assuming fixed costs are already sunk.

- **PSA**: only electricity usage charges (the plant, technician, AMC, etc. are already paid). `incremental = electricity_rate * power_kw * (60 / (capacity_lpm * 60 / 1000))` simplified: `electricity_rate * power_kw / (capacity_lpm * 60 / 1000)` = electricity cost per kWh * kW / (cu m per hour).
- **LMO**: refilling + handling per cu m (tank rental and salary are already paid).
- **Cylinders**: refill cost / volume (each new cylinder is fully variable).
- **OC**: electricity per cu m (unit and maintenance already paid).

Use case: "I already have a PSA plant and an LMO tank. For my next unit of oxygen, which is cheaper to use?"

### 6c. Capex treatment

Three views the tool should offer (as a toggle):

1. **Opex only**: excludes all capital costs (depreciation, purchase price amortization). Shows pure operating cost. Useful when the facility already owns the equipment and is deciding how to use it.
2. **Capex + opex (total cost of ownership)**: includes straight-line depreciation. Useful when deciding whether to acquire a new source.
3. **Incremental cost**: shows only the variable cost component. Useful for the "which source to use next" decision.

---

## 7. Project architecture

```
oxycost/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  public/
    favicon.svg
  src/
    main.tsx                    // React entry point
    App.tsx                     // Root component with routing
    engine/
      index.ts                  // Public API: compareAllSources()
      types.ts                  // All TypeScript interfaces and enums
      constants.ts              // Default values, conversion factors
      psa.ts                    // CALC-PSA-01 through CALC-PSA-14
      lmo.ts                    // CALC-LMO-01 through CALC-LMO-14
      cylinder.ts               // CALC-CYL-01 through CALC-CYL-12
      concentrator.ts           // CALC-OC-01 through CALC-OC-11
      comparison.ts             // CALC-COMP-01 through CALC-COMP-04
      conversions.ts            // Unit conversion utilities
      __tests__/
        psa.test.ts             // Test against workbook values
        lmo.test.ts
        cylinder.test.ts
        concentrator.test.ts
        comparison.test.ts
        conversions.test.ts
    components/
      layout/
        Header.tsx
        Footer.tsx
        Sidebar.tsx
      inputs/
        SourceSelector.tsx      // Checkbox panel: which sources are available
        DemandInput.tsx         // Demand entry (3 modes)
        PsaInputPanel.tsx       // PSA-specific inputs
        LmoInputPanel.tsx       // LMO-specific inputs
        CylinderInputPanel.tsx  // Cylinder-specific inputs
        OcInputPanel.tsx        // OC-specific inputs
        PresetToggle.tsx        // Reusable: shows default, allows override
        UnitToggle.tsx          // LPM <-> cu m/hr, litres <-> cu m
      results/
        CostComparisonTable.tsx  // Side-by-side table of all sources
        CostBreakdownChart.tsx   // Stacked bar chart of cost components
        RecommendationCard.tsx   // Natural language recommendation
        IncrementalVsTotalToggle.tsx
        SensitivitySlider.tsx    // "What if run hours change?" quick slider
      shared/
        Tooltip.tsx             // For explanation tooltips on each field
        InfoBanner.tsx          // For OC limitations, caveats
        NumberInput.tsx         // Formatted number input with INR prefix
    hooks/
      useCalculation.ts         // Calls engine, returns results
      usePresets.ts             // Manages preset values and overrides
    styles/
      globals.css
      variables.css
    utils/
      format.ts                 // INR formatting, number display
```

### 7a. Key architectural decisions

1. **Engine is pure functions, no React dependency.** Every function in `src/engine/` takes a plain object and returns a plain object. No hooks, no state, no side effects. This makes it testable, portable, and easy to modify.

2. **Each calculation is a named, documented function.** The function name maps to the CALC-XXX ID from this spec. Comments in the code cite this spec section. Anyone can open `psa.ts` and trace every number.

3. **Presets are data, not code.** All default values live in `constants.ts` as a flat object. Changing a default requires editing one line, not hunting through components.

4. **Results are computed on every input change** (no "Calculate" button). The engine is fast enough for real-time updates. Use `useMemo` or a lightweight debounce if needed.

5. **Vite for bundling, GitHub Pages for hosting.** `vite.config.ts` sets `base` to the repo name for GH Pages. Build output goes to `dist/`.

### 7b. Technology stack

- **Framework**: React 18+ with TypeScript
- **Build**: Vite 5+
- **Styling**: CSS modules or Tailwind (user preference; spec is agnostic)
- **Charts**: Recharts (lightweight, React-native)
- **Testing**: Vitest (Vite-native test runner)
- **No backend, no database, no auth.** Everything runs in the browser.

---

## 8. Test strategy

### 8a. Unit tests for the engine

Every CALC-XXX formula must have at least one test case derived from the workbook's actual values. Example:

**PSA 1500 LPM, Median scenario, 720 run hours:**
- Input: capacity=1500, power_kw=75, elec_rate=7.52, fixed_charge=30435.5, salary=21000, amc_annual=327000, repair_annual=100000, plant_cost=10000000, life=10, run_hours=720, startups=1
- Expected: o2_cu_m = 63450, total_cost = 576432.17, per_cu_m_capex_opex = 9.085, per_cu_m_opex = 7.771

**LMO at 5100 cu m:**
- Input: monthly_cu_m=5100, rental=67260, salary=15000, refill_base=15.22, refill_gst=0.12, handling_base=16.78, handling_gst=0.18
- Expected: per_cu_m (with rental+salary) = 58.92 (approximately, per workbook G7)

**Cylinder D-type at INR 395 refill:**
- Input: type=d_type, refill_cost=395, monthly_count=30
- Expected: per_cu_m_opex = 395/7 = 56.43

### 8b. Integration tests

Test `compareAllSources()` with multiple sources enabled and verify:
- Sources are ranked correctly
- Supply gap is flagged when demand exceeds capacity
- OC limitations caveat is included

### 8c. Snapshot tests for the comparison table

Verify the rendered comparison table matches expected output for a known set of inputs.

---

## 9. UI/UX guidelines

### 9a. Input flow

1. **Step 1: Demand.** User enters their estimated monthly O2 demand (or uses the bed-count calculator).
2. **Step 2: Sources.** Checkboxes for which sources the facility has. At least one must be selected.
3. **Step 3: Source details.** For each selected source, a collapsible panel with required inputs (prominently) and preset inputs (collapsed by default, with "Customize" toggle).
4. **Step 4: Results.** Auto-computed, shown below the input panels. No submit button needed.

### 9b. Results display

- **Comparison table**: one row per source, columns for opex/cu m, capex+opex/cu m, incremental/cu m, monthly total cost, monthly output capacity. Cheapest cell highlighted.
- **Cost breakdown chart**: stacked horizontal bar per source showing the composition (electricity, salary, maintenance, depreciation, etc.). Makes it visually obvious where the money goes.
- **Recommendation card**: plain-language summary. Example: "At your current demand of 5,500 cu m/month, your 1000 LPM PSA plant running 292 hours/month delivers the lowest total cost at INR 18.97/cu m (opex only). LMO would cost INR 52.71/cu m at this volume. Recommendation: maximize PSA utilization before supplementing with cylinders."
- **Toggle**: Opex only / Capex+Opex / Incremental -- switches all displayed values.

### 9c. Tooltips and explanations

Every input field and every result column should have an (i) tooltip explaining:
- What this value means
- Where the default came from
- What formula uses it

### 9d. Mobile responsiveness

The tool must work on tablets (facility managers often use tablets during field visits). Input panels stack vertically on narrow screens. The comparison table scrolls horizontally if needed.

---

## 10. Data from the workbook to embed as reference/validation

### 10a. MP cylinder costs (reference data, not used in calculation)

The workbook contains refill costs from 41 district hospitals. This can be shown as a reference tooltip when the user enters their cylinder refill cost: "For reference, D-type cylinder refill costs across MP district hospitals range from INR 196 to INR 700, with a median of INR 395."

### 10b. Electricity fixed charge benchmarks

From the "Electricity fixed charges" sheet, actual fixed charges by PSA capacity:
- 200 LPM: INR 9,472 to 26,640 (median ~9,500)
- 500 LPM: INR 18,648 to 29,800 (median ~20,000)
- 1000 LPM: INR 15,984 to 37,584 (median ~25,000)
- 1500 LPM: INR 30,436 to 60,871 (median ~30,436)

These should populate as defaults when the user selects a PSA capacity.

### 10c. PSA power consumption benchmarks

From the workbook input parameters:
- 200 LPM: 15-45 KW (median 30)
- 500 LPM: 22-65 KW (median 45)
- 1000 LPM: 40-80 KW (median 65)
- 1500 LPM: 60-105 KW (median 75)

These should populate as suggestions when the user enters their PSA capacity.

### 10d. PSA plant cost benchmarks

- 200 LPM: INR 20-50 lakhs
- 500 LPM: INR 35-75 lakhs
- 1000 LPM: INR 60 lakhs-1 crore
- 1500 LPM: INR 80 lakhs-1.25 crore

---

## 11. Edge cases and guards

1. **Zero demand**: show a message asking the user to enter a demand estimate. Do not divide by zero.
2. **Zero run hours for PSA**: all costs are fixed, output is zero, per-unit cost is infinity. Show: "PSA is not producing any oxygen at 0 run hours."
3. **Very low PSA utilization**: if run hours < 60 (2 hrs/day), show a warning: "Low utilization. Fixed costs dominate at this run level, making PSA expensive per unit."
4. **LMO volume = 0**: same as zero demand for that source.
5. **Cylinder count = 0**: disable cylinder results.
6. **OC only**: show strong caveat about clinical limitations.
7. **Negative production hours**: if startups * 0.5 > run_hours, clamp production_hours to 0 and show warning.
8. **Unrealistic inputs**: if electricity rate < 1 or > 20, show a gentle hint. If PSA capacity > 2000, suggest checking the unit.

---

## 12. Future extensions (not in v1, but design for them)

1. **Multi-source optimization**: given demand of X cu m, facility has PSA + LMO + cylinders, what is the cheapest mix? (Linear programming or simple greedy allocation by incremental cost.)
2. **Annual projection**: show monthly costs over 12 months with seasonal demand variation.
3. **State selector**: swap default presets for different state electricity tariffs and market rates.
4. **Facility database**: pre-populate inputs from the "All plants and capacities" data for MP facilities.
5. **PDF report export**: generate a cost comparison report for the facility to share with leadership.
6. **Hindi/bilingual interface**: critical for facility-level adoption.

---

## 13. Glossary

| Term | Definition |
|---|---|
| AMC | Annual Maintenance Contract |
| CMC | Comprehensive Maintenance Contract |
| cu m | Cubic metre of gaseous oxygen at standard conditions |
| D-type cylinder | Large/Jumbo cylinder, 7 cu m capacity |
| B-type cylinder | Small cylinder, 1.5 cu m capacity |
| GST | Goods and Services Tax (India) |
| KW | Kilowatt (power consumption) |
| KWh | Kilowatt-hour (energy consumed) |
| LMO | Liquid Medical Oxygen |
| LPM | Litres Per Minute (flow rate) |
| NHM | National Health Mission |
| Nm3/hr | Normal cubic metres per hour (flow rate at standard conditions) |
| OC | Oxygen Concentrator |
| PSA | Pressure Swing Adsorption |
| VIE | Vacuum Insulated Evaporator (LMO storage vessel) |

---

## 14. Verification checklist

Before considering the build complete, verify:

- [ ] PSA calculator at 1500 LPM / 720 hrs / median params matches workbook row 30 values
- [ ] PSA calculator at 1000 LPM / 153.5 hrs / median params matches workbook row 20 values
- [ ] LMO calculator at 5100 cu m matches workbook row 7 values
- [ ] LMO calculator at 14000 cu m matches workbook row 9 values
- [ ] Cylinder D-type at median cost (395) gives 56.43/cu m opex
- [ ] Cylinder B-type at median cost (150) gives 100/cu m opex
- [ ] Comparison table ranks sources correctly for a typical DH scenario
- [ ] Incremental cost view shows only variable costs
- [ ] OC results always show limitations banner
- [ ] All preset toggles work (show default, allow override, revert to default)
- [ ] No NaN or Infinity displayed in the UI under any input combination
- [ ] Mobile layout works on 768px width
