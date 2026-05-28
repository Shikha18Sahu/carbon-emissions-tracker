# 🌿 Carbon Pulse — BreatheESG Auditor Workspace

> **Enterprise emissions ingestion, normalization, and audit review platform**
> Built for the BreatheESG Tech Intern Assignment · Django REST + React · Vite · TailwindCSS

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-brightgreen?style=for-the-badge)](https://your-deployed-url.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Railway-blueviolet?style=for-the-badge)](https://your-backend.railway.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📌 What This Is

Carbon Pulse is a full-stack prototype that solves a real enterprise problem: **getting messy, multi-source emissions data into a reviewable, auditable state**.

Most ESG platforms assume clean data. Real clients have:
- SAP flat files with German column headers and plant codes that mean nothing without a lookup table
- Utility portal CSV exports where billing periods don't align to calendar months
- Concur travel exports where you get airport codes instead of distances

This app ingests all three, normalizes them into a unified emissions ledger, flags anomalies, and gives analysts a structured workspace to review, approve, and lock records before they reach auditors.

---

## 🗂️ Project Structure

```
BREATHEE/
├── backend/
│   ├── breatheesg_back/          # Django project root
│   ├── breatheesg_backend/       # Core Django config (settings, urls, wsgi, asgi)
│   └── emissions/                # Main app
│       ├── models.py             # Data model (tenant, source, emission record, audit trail)
│       ├── views.py              # REST API endpoints
│       ├── serializers.py        # DRF serializers
│       ├── services/             # Ingestion logic per source type
│       ├── migrations/           # DB migrations
│       └── admin.py
├── frontend/
│   ├── src/                      # React source
│   ├── dist/                     # Production build
│   ├── vite.config.js
│   └── tailwind.config.js
├── sample_data/
│   ├── sap_export.txt            # Realistic SAP flat file (tab-separated)
│   ├── utility_export.csv        # Utility portal electricity CSV
│   └── travel_export.csv         # Concur-style corporate travel CSV
├── MODEL.md                      # Data model documentation
├── DECISIONS.md                  # All ambiguities resolved + PM questions
├── TRADEOFFS.md                  # What was deliberately not built
├── SOURCES.md                    # Research on each data source format
├── Procfile                      # Railway/Heroku deployment config
├── requirements.txt
└── runtime.txt
```

---

## 🚀 Live Demo

| Surface | URL |
|---|---|
| Frontend (Vercel) | `https://your-app.vercel.app` |
| Backend API (Railway) | `https://your-api.railway.app` |

**Demo credentials:**
```
Username: admin
Password: password123
```

Two tenants are pre-loaded for review:
- `BREATHEESG MANUFACTURING`
- `CARBONLEDGER MANUFACTURING`

---

## ✨ Features

### 📥 Upload Center — Three Source Ingestion Pipelines

| Source | Format | Real-World Basis |
|---|---|---|
| **SAP Fuel & Procurement** | Tab-separated flat file (`.txt`) | SAP transaction `ME2M` / `MB51` batch export |
| **Utility Electricity** | CSV portal export (`.csv`) | Standard utility portal download (e.g., PG&E, Con Ed) |
| **Corporate Travel** | Concur-style expense CSV (`.csv`) | Concur Travel Expense export schema |

Each pipeline:
- Validates headers and required fields on ingest
- Normalizes units (gallons → liters, kWh → standard, miles/km → km)
- Maps to Scope 1 / Scope 2 / Scope 3 automatically
- Applies DEFRA/EPA emission factors to compute kg CO₂e
- Flags outliers for analyst review

### 📊 Review Dashboard

- **Verification Ledger** — every ingested row with scope, channel, raw quantity, computed carbon, and status
- **Advanced Filters** — filter by ingest channel, audit scope (1/2/3), review status, and date range
- **Carbon Target Gauge** — approved locked emissions vs. client target (500t default)
- **Summary KPIs** — total ingested, pending audit, auto-flagged, approved lock, total approved CO₂e
- **Multi-tenant switcher** — auditors can switch between client organizations

### 🔐 Audit Trail

- Immutable ledger of every action: approvals, overrides, flags, ingestions
- Tracks actor (email), timestamp, before/after state diff
- Filterable by action type and user

---

## 🧱 Data Model (Summary)

> Full documentation in [`MODEL.md`](MODEL.md)

```
Tenant (Organization)
  └── EmissionRecord
        ├── source_type: SAP | UTILITY | TRAVEL
        ├── scope: 1 | 2 | 3
        ├── raw_quantity + raw_unit
        ├── normalized_quantity_kg_co2e
        ├── status: PENDING | APPROVED | FLAGGED | LOCKED
        ├── ingest_file (FK → IngestionBatch)
        └── AuditTrailEntry (immutable log)

IngestionBatch
  ├── tenant (FK)
  ├── source_type
  ├── filename
  ├── ingested_at
  ├── rows_parsed
  └── status + errors
```

Key design decisions:
- **Multi-tenancy**: every record is scoped to a `Tenant` — no cross-tenant data leakage
- **Source-of-truth tracking**: every row knows which file it came from, when, and whether it was manually overridden
- **Immutable audit trail**: append-only, no updates or deletes
- **Unit normalization at ingest**: raw values preserved, CO₂e computed and stored separately

---

## 🔬 Source Research

> Full details in [`SOURCES.md`](SOURCES.md)

### SAP Flat File
Real SAP exports (via `ME2M`, `MB51`, or similar transactions) are tab-separated `.txt` files. Common issues: German locale column names (`Menge` for quantity, `Werk` for plant), dates as `DD.MM.YYYY`, units like `L`, `GAL`, `M3` mixed across plants. I chose flat file over IDoc (too complex for a prototype) and OData (requires live SAP connectivity).

### Utility CSV
Utility portals (PG&E, Con Ed, National Grid) offer CSV exports with columns for meter ID, billing period start/end, consumption (kWh), demand (kW), and cost. Key challenge: billing periods cross month boundaries and don't align to fiscal quarters. Handled by storing raw billing period dates and normalizing to activity_date as period start.

### Corporate Travel CSV
Concur expense exports include trip leg data: origin/destination (airport codes or city names), travel class, transport mode, distance (sometimes absent). When distance is missing, I compute it from IATA airport coordinates using the Haversine formula. Emission factors differ by cabin class (economy vs. business) per DEFRA guidelines.

---

## ⚖️ Key Decisions

> Full details in [`DECISIONS.md`](DECISIONS.md)

| Decision | Choice | Rationale |
|---|---|---|
| SAP ingestion mode | Flat file upload | Most common export method; no live SAP connectivity needed for a prototype |
| Utility ingestion mode | Portal CSV upload | More universal than PDF parsing; realistic for facilities teams |
| Travel distances | Haversine from IATA codes | Concur often omits distance; airport coordinates are a reliable fallback |
| Emission factors | DEFRA 2023 | Publicly available, widely used, auditor-accepted |
| Auth | Simple session-based | Scope was review workflow, not IAM architecture |
| Database | SQLite (dev) → PostgreSQL (prod) | Pragmatic for prototype; production config uses `DATABASE_URL` |

---

## 🚧 Deliberate Tradeoffs

> Full details in [`TRADEOFFS.md`](TRADEOFFS.md)

1. **No PDF parsing** — Utility PDF bill parsing (via OCR or pdfplumber) was scoped out. Portal CSV exports cover 80% of real-world utility data delivery. PDF parsing adds significant complexity and fragility.

2. **No real-time SAP OData/API integration** — Connecting to a live SAP instance requires client credentials, VPN/firewall configuration, and SAP Basis support. File-based ingestion is the realistic prototype path.

3. **No role-based access control beyond admin/auditor** — A real deployment would need separate roles (data submitter, analyst, auditor, admin) with permission gates. Kept to a single auditor role for prototype scope.

---

## 🛠️ Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- pip

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # or use: admin / password123
python manage.py runserver
```

Backend runs at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### Sample Data

Pre-built sample files are in `/sample_data/`:
```
sap_export.txt       → Upload via Upload Center → SAP Flat File
utility_export.csv   → Upload via Upload Center → Utility CSV
travel_export.csv    → Upload via Upload Center → Corporate Travel CSV
```

---

## 🌐 Deployment

### Backend → Railway

```bash
# Ensure these files exist in project root:
# - Procfile:       web: gunicorn breatheesg_backend.wsgi
# - runtime.txt:    python-3.11.x
# - requirements.txt (includes gunicorn, whitenoise, psycopg2-binary)
```

Railway environment variables:
```
SECRET_KEY=<your-secret>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
DATABASE_URL=<auto-provided by Railway Postgres plugin>
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy /frontend directory to Vercel
```

Vercel environment variable:
```
VITE_API_URL=https://carbon-emissions-tracker-2.onrender.com
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login/` | Authenticate, receive session token |
| `GET` | `/api/tenants/` | List tenants for current user |
| `GET` | `/api/emissions/` | List emission records (filterable) |
| `PATCH` | `/api/emissions/:id/approve/` | Approve and lock a record |
| `PATCH` | `/api/emissions/:id/flag/` | Flag a record for review |
| `POST` | `/api/ingest/sap/` | Upload SAP flat file |
| `POST` | `/api/ingest/utility/` | Upload utility CSV |
| `POST` | `/api/ingest/travel/` | Upload travel CSV |
| `GET` | `/api/audit-trail/` | Fetch immutable audit log |
| `GET` | `/api/dashboard/stats/` | KPI summary for dashboard |

---

## 🧪 Sample Data Design

The sample files were constructed to reflect realistic exports, not toy data:

**`sap_export.txt`** — 20 rows, tab-separated, includes:
- Mixed units (`GAL`, `L`, `M3`) across plant codes
- Dates in `DD.MM.YYYY` format (SAP German locale default)
- Material codes for diesel, petrol, natural gas, and procurement items
- One intentional outlier (10x normal quantity) to test auto-flagging

**`utility_export.csv`** — 18 rows, includes:
- Meter IDs, billing period start/end (not aligned to calendar months)
- Consumption in kWh, some rows with demand charges
- Two different tariff structures across sites

**`travel_export.csv`** — 30 rows, includes:
- Flights (with IATA origin/destination codes, no pre-computed distance)
- Hotel nights (per-night emission factor applied)
- Ground transport (rental car miles, taxi)
- Mixed cabin classes (Economy, Business) affecting emission factors

---

## 👤 Author

Built as part of the BreatheESG Tech Intern Assignment.

For access or questions, contact via the submission form.

---

*Carbon Pulse — because knowing your footprint is the first step to reducing it.*
