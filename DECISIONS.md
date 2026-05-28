# Architectural Decisions Document - breatheesg Carbon Ingest

This document records the design decisions, engineering trade-offs, and product questions guiding the implementation of the carbon emissions review dashboard.

---

## 1. Data Ingestion Decisions

### A. SAP Flat File (.txt tab-separated) over IDoc / OData API
*   **Decision:** We chose to parse tab-separated flat-file exports (`.txt`) rather than connecting directly to SAP BAPI/IDoc or OData interfaces.
*   **Rationale:**
    *   **Low Barrier to Entry:** SAP flat-file exports are standard reports that can be run by general business analysts.
    *   **No Middleware Needed:** Direct integration requires middle tier setups (like SAP PI/PO or SAP Datasphere) or custom ABAP BAPI developments which add massive infrastructure cost.
    *   **No SAP BASIS Blockers:** Integrating with SAP APIs typically requires months of approvals from SAP BASIS and security teams. A flat-file parser bypasses this entirely, allowing rapid prototype validation.

### B. Utility Portal CSV over PDF / Direct Utility API
*   **Decision:** Ingesting electricity billing through CSV exports was chosen over parsing PDF bills or direct utility web service APIs.
*   **Rationale:**
    *   **Universal Availability:** While utility billing APIs are highly fragmented and rarely standardized in India (BESCOM, MSEDCL, TNEB, etc.), almost all modern customer utility portals offer billing ledger exports in CSV format.
    *   **No OCR Complexity:** PDF parsing requires complex Optical Character Recognition (OCR) systems (like AWS Textract or Tesseract) combined with regex rules that break whenever utility companies update their invoice layouts by a few pixels. CSV offers clean, reliable tabular data out of the box.

### C. Concur Travel CSV over Live Concur Travel API
*   **Decision:** Exporting a Concur-style CSV travel sheet was implemented instead of live Travel Management System (TMS) API syncing.
*   **Rationale:**
    *   **No OAuth Setup:** Direct API integration requires OAuth 2.0 application registration on Concur's Enterprise Developer Portal, which demands dedicated corporate developer accounts and sandbox environments.
    *   **Self-Contained Testing:** A CSV import allows breatheesg analysts to upload historical travel datasets immediately, without waiting for corporate IT to clear API rate limits, production security clearances, or token exchange rotations.

---

## 2. Infrastructure Decisions

### A. SQLite for local development, PostgreSQL for production
*   **Decision:** We configured the Django backend to fall back on `SQLite` for developer environments and use `PostgreSQL` in production.
*   **Rationale:**
    *   **Zero-Config Development:** SQLite is self-contained and file-based. Developers can spin up the app locally using a simple `python manage.py migrate` without needing a local Docker/Postgres daemon running.
    *   **Enterprise-Grade Production:** PostgreSQL is the industry standard for cloud databases. It supports ACID compliance, advanced query planning for large aggregation tables, and robust concurrency for Railway or Render deployments.

### B. Extent of Source Ingestion Handled
*   **SAP Ingestion:** We map German header variables (`BUDAT` for date, `MENGE` for amount, `MEINS` for unit) and convert standard fuel codes (`DIESEL` vs `PETROL` identified via document text `BKTXT` and material `MATNR`).
*   **Utility Ingestion:** We normalize billing period entries, mapping `billing_period_end` as the primary date. It aggregates total kilowatt-hour (`kwh_consumed`) entries.
*   **Travel Ingestion:** We handle mixed expenses in a single file, routing `AIRFARE` to haversine distance calculation, `HOTEL` to room-night calculations, and `CAR`/`RAIL` to distance factors.

---

## 3. Product Discovery Questions for the PM

To transition the product from prototype to an enterprise-grade SaaS production release, we must align on the following product discovery questions:

1.  **Which SAP Module is the source of record?**
    *   *Why it matters:* Are these entries coming from the **Materials Management (MM)** module (e.g. material movement receipts), the **Financial Accounting (FI)** module (e.g., vendor invoice ledgers like BSEG/BKPF), or **Plant Maintenance (PM)**? Knowing this allows us to design precise standard query templates.
2.  **Which Utility Providers are in scope, and which country grid factors apply?**
    *   *Why it matters:* Currently, we use the India Grid factor ($0.82\text{ kg CO2e / kWh}$). If the client is multi-national, we must implement location-based Scope 2 factors matching US eGRID subregions, UK DEFRA factors, or European EEA coefficients based on facility ZIP/Postal codes.
3.  **Should the system automate flight coordinates lookup via live airport APIs?**
    *   *Why it matters:* Currently, we use a local high-performance airport coordinates dictionary (DEL, BOM, JFK, etc.). For production, we should clarify if we should integrate with a live Flight Management API or a comprehensive IATA database containing all 9,000+ commercial airport codes to avoid default fallbacks.
