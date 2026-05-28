# Data Source Research & Production Realities

This document records the underlying research, standard formats, and production edge cases for each of the three carbon emissions data sources.

---

## 1. SAP Flat File (Fuel & Procurement)

### A. Format Research: IDoc vs. Flat Files
While **IDocs (Intermediate Documents)** are standard for transactional SAP integrations (using message types like `INVOIC` or `IDOC_INPUT_ACC_DOCUMENT`), their structure is deeply nested and difficult to read without specific SAP parsing libraries. A flat-file report (Tab-separated `.txt` or `.csv`) remains the most common export format for general reporting.

### B. Standard SAP Fields Decoded
The columns in our SAP export represent standard fields from the **BSEG** (Accounting Document Segment) and **BKPF** (Accounting Document Header) tables:
*   `MANDT`: Client (SAP system tenant ID, e.g., `100`).
*   `BUKRS`: Company Code (legal entity, e.g., `1000`).
*   `BELNR`: Document Number (the unique accounting entry ID).
*   `BLDAT`: Document Date (when the physical receipt/invoice was created).
*   `BUDAT`: Posting Date (when the transaction was recorded in the general ledger, formatted as `YYYYMMDD`).
*   `LIFNR`: Vendor Account Number.
*   `MATNR`: Material Number (identifies fuel products like diesel/petrol).
*   `MENGE`: Quantity.
*   `MEINS`: Base Unit of Measure (SAP units like `L`, `LTR`, `GAL`, `M3`).
*   `DMBTR`: Amount in Local Currency.
*   `WAERS`: Currency Key (`EUR`, `USD`, `INR`).
*   `WERKS`: Plant Code (identifies manufacturing locations like `DE01`, `IN01`).
*   `KOSTL`: Cost Center.
*   `BKTXT`: Document Header Text (contains free-text descriptions like "Diesel for backup gen").

### C. Why German Headers Exist
SAP was founded in Walldorf, Germany in 1972. The core system architecture, including database abbreviations and database table fields, was built on German words:
*   `BUKRS` = **Bu**chungs**kr**ei**s** (Company Code / Booking Circle)
*   `BELNR` = **Bel**eg**n**umme**r** (Voucher / Document Number)
*   `BUDAT` = **Bu**chungs**dat**um (Posting Date)
*   `MEINS` = **M**engen**eins**heit (Unit of Measure)
*   `DMBTR` = **D**eutsche **M**ark **B**e**tr**ag (German Mark Amount - local currency segment value)
*   `WERKS` = **Werks** (Plant / Factory)

### D. Production Vulnerabilities
*   **Inconsistent Units:** In real systems, material units might be entered as custom codes (e.g. `LIT` instead of `L` or `LTR`), crashing simple matches.
*   **German Decimals:** In German SAP databases, numbers are formatted with dots as thousands separators and commas as decimals (e.g., `1.250,50` instead of `1250.50`). Our parser includes advanced string normalization to preemptively handle these variations.
*   **Free-text Ambiguity:** Determining whether fuel is Diesel or Petrol relies on matching substrings in `BKTXT`. If an operator enters "Fuel purchase for plant gen" without explicitly naming the fuel type, the system cannot assign a scope factor.

---

## 2. Utility Portal (Electricity)

### A. Portal Ingestion Details
Indian state electricity distribution companies (DISCOMs) such as **BESCOM** (Bangalore Electricity Supply Company) and **MSEDCL** (Maharashtra State Electricity Distribution Company) provide customer portal accounts where facilities managers can download consumption summaries.

### B. Typical Billing & Tariff Structures
*   **Billing Periods:** Unlike calendar months, DISCOMs bill based on physical meter-reading cycles (e.g. November 12th to December 11th).
*   **Tariff Codes:** Rate schedules vary significantly based on connection types (e.g., `LT-5` for Low Tension Industrial in Karnataka, `HT-2` for High Tension Commercial, or `HT-I` for Industrial in Maharashtra).
*   **Parameters:** Bills contain separate values for **kwh_consumed** (active energy consumption) and **peak_demand_kw** (maximum load used). Carbon accounting focuses exclusively on energy consumption (`kWh`).

### C. Production Vulnerabilities
*   **Mid-month Calculations:** Since billing periods overlap calendar months, tracking monthly carbon targets requires dividing consumption proportionally among the calendar days in the billing period.
*   **Tariff Rate Adjustments:** Fuel cost adjustments and seasonal tariffs frequently change billing amounts, though total `kWh` remains the stable metric for carbon calculations.
*   **Meter Replacements:** In production, physical meters may be replaced mid-month, causing a building to have two distinct meter IDs with short, overlapping billing periods, resulting in duplicate-row warnings.

---

## 3. Corporate Travel (Concur-style CSV)

### A. Format Research: Concur Travel & Expense (TTE)
Standard Travel Management Systems (such as SAP Concur or Navan) export travel receipts as comma-separated files containing transaction details, employee IDs, expense categories, booking classes, and origin/destination locations.

### B. Travel Variables Handled
*   `expense_type`: Mapped to `AIRFARE` (flights), `HOTEL` (accommodations), `CAR` (car rentals), and `RAIL` (train trips).
*   `origin_code` & `destination_code`: Standard 3-letter IATA airport codes (e.g. `DEL` for Indira Gandhi Intl, `BOM` for Chhatrapati Shivaji, `BLR` for Kempegowda).
*   `nights_stayed`: Captured for hotel footprint calculations.
*   `booking_class`: Mapped to flight travel profiles (Economy vs Business/First Class).

### C. Production Vulnerabilities
*   **Multi-leg Flights:** Real travel data frequently includes multi-leg journeys (e.g., `DEL -> DXB -> LHR`). Ingesting only origin and destination codes leads to straight-line distance calculations that underestimate actual flight distance and emissions.
*   **IATA Code Failures:** Small regional airport codes may be missing from the local coordinate dictionary, requiring a robust default fallback (e.g., $1200\text{ km}$) and warning flagging to ensure system resilience.
*   **Airport vs. City Codes:** Systems must handle city-level codes that group multiple airports (e.g. `LON` representing LHR, LGW, and LCY) or flag them for manual resolution.
