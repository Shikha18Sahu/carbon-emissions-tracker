# Engineering Trade-Offs - breatheesg Carbon Dashboard

This document details exactly three strategic engineering trade-offs made during the implementation of the carbon emissions review portal prototype.

---

## Trade-off 1: File Upload Ingestion instead of Live SAP API Sync

*   **Implementation Choice:** We built a tab-separated text (`.txt`) file parser that ingests SAP procurement and fuel receipts.
*   **The Trade-off:** We avoided building a live RFC (Remote Function Call), BAPI (Business Application Programming Interface), or SAP OData endpoint.
*   **Rationale:**
    *   **Access Barriers:** Direct SAP API integration requires dedicated SAP developer credentials, BASIS security authorization, and complex VPN/firewall clearance. These are impossible to obtain for an agile prototype development.
    *   **Cost & Speed:** Setting up a live SAP connection takes weeks of enterprise IT alignment. The file upload method allows analysts to test calculations immediately using standard manual transaction exports (`BSEG`/`BKPF` tables), proving business value before investing in complex API pipes.

---

## Trade-off 2: Utility CSV Ingest instead of PDF Invoice OCR Parsing

*   **Implementation Choice:** We implemented a tabular CSV parser that ingests utility consumption records directly.
*   **The Trade-off:** We did not build a PDF scraper to parse scanned or digital electricity bills.
*   **Rationale:**
    *   **Brittleness of OCR:** PDF parsing requires optical character recognition (OCR) engines (such as AWS Textract or Tesseract) combined with custom spatial mapping. These scrapers are notoriously brittle; a minor change in the layout from MSEDCL or BESCOM (such as moving the "kWh" label by a few pixels) causes the parser to fail.
    *   **Low Complexity, High Accuracy:** Facilities teams almost always have portal access to download consumption histories directly as CSVs. By standardizing on a CSV import, we guarantee 100% data ingestion accuracy with simple, bulletproof tabular processing, avoiding weeks of OCR training and error-handling development.

---

## Trade-off 3: Concur CSV Imports instead of Live OAuth Concur API Sync

*   **Implementation Choice:** We implemented a travel CSV import matching the standardized SAP Concur travel and expense export formats.
*   **The Trade-off:** We did not connect to the live SAP Concur Web Services API using OAuth 2.0.
*   **Rationale:**
    *   **OAuth Registration Hurdles:** Connecting to the live Concur API requires registering a developer application in the SAP Concur Developer Portal, generating client secrets, and establishing token exchange servers.
    *   **Security Clearances:** Corporate travel data contains sensitive Employee Personally Identifiable Information (PII). Clearances to authorize live API tokens take months. Ingesting standard Concur-format CSV reports allows immediate, secure processing of travel records while completely isolating PII compliance concerns during the product validation phase.
