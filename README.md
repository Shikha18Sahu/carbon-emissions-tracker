# 🌿 Carbon Pulse — ESG Auditor Workspace

> **Enterprise emissions ingestion, normalization, and audit review platform**  
> Built with Django REST Framework · React · Vite · TailwindCSS

---

## 📌 Overview

Carbon Pulse is a full-stack ESG auditing workspace that helps organizations ingest, normalize, and review emissions data from multiple enterprise sources.

The platform supports:

- **SAP** fuel & procurement exports
- **Utility** electricity CSVs
- **Corporate travel** expense exports

Uploaded records are normalized into a unified emissions ledger, automatically classified into **Scope 1 / 2 / 3** emissions, and reviewed through a structured audit workflow.

---

## ✨ Features

### 📥 Multi-Source Data Ingestion

| Source | Format |
|---|---|
| SAP Fuel & Procurement | `.txt` flat file |
| Utility Electricity | `.csv` |
| Corporate Travel | `.csv` |

**Pipeline Capabilities:**
- Header validation
- Unit normalization
- Scope classification
- CO₂e calculation
- Outlier detection
- Audit-ready record creation

### 📊 Audit Dashboard

- Emissions verification ledger
- Scope & status filtering
- KPI summary cards
- Carbon target progress tracking
- Multi-tenant organization switcher

### 🔐 Audit Trail

Every action is logged with:
- Actor
- Timestamp
- Action type
- Before/after state

---

## 🗂️ Project Structure

```
carbon-emissions-tracker/
│
├── backend/
│   ├── breatheesg_backend/
│   ├── emissions/
│   ├── manage.py
│   ├── requirements.txt
│   └── build.sh
│
├── frontend/
│   ├── src/
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── sample_data/
│   ├── sap_export.txt
│   ├── utility_export.csv
│   └── travel_export.csv
│
├── MODEL.md
├── DECISIONS.md
├── SOURCES.md
└── TRADEOFFS.md
```

---

## 🚀 Live Deployment

| Service | URL |
|---|---|
| Frontend (Vercel) | [https://your-frontend.vercel.app](https://carbon-emissions-tracker-ten.vercel.app/) |
| Backend API (Render) | [https://carbon-emissions-tracker-2.onrender.com](https://carbon-emissions-tracker-2.onrender.com) |
---

**Demo Credentials:**
```
Username: admin
Password: password123
```
 
Two tenants are pre-loaded for review:
- `BREATHEESG MANUFACTURING`
- `CARBONLEDGER MANUFACTURING`
---

## 🛠️ Local Development

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend runs at: `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🌐 Production Deployment

### Backend → Render

**Build Command**
```bash
./build.sh
```

**Start Command**
```bash
gunicorn breatheesg_backend.wsgi:application
```

**Environment Variables**
```env
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=.onrender.com
DATABASE_URL=your-postgres-url
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### Frontend → Vercel

**Environment Variable**
```env
VITE_API_URL=https://carbon-emissions-tracker-2.onrender.com
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login/` | User authentication |
| `GET` | `/api/tenants/` | Fetch tenants |
| `GET` | `/api/emissions/` | Fetch emission records |
| `PATCH` | `/api/emissions/:id/approve/` | Approve record |
| `PATCH` | `/api/emissions/:id/flag/` | Flag record |
| `POST` | `/api/ingest/sap/` | Upload SAP data |
| `POST` | `/api/ingest/utility/` | Upload utility data |
| `POST` | `/api/ingest/travel/` | Upload travel data |
| `GET` | `/api/audit-trail/` | Fetch audit logs |
| `GET` | `/api/dashboard/stats/` | Dashboard KPIs |

---

## 🧪 Sample Data

Pre-built datasets are available in `/sample_data`:

- `sap_export.txt` — SAP fuel & procurement sample
- `utility_export.csv` — Utility electricity export
- `travel_export.csv` — Corporate travel export

---

## ⚙️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Django, Django REST Framework, PostgreSQL, Gunicorn, Whitenoise |
| **Frontend** | React, Vite, TailwindCSS, Axios |
| **Deployment** | Render (backend), Vercel (frontend) |

---

## 👤 Author

Built as part of the **BreatheESG Tech Intern Assignment**.

> *Carbon Pulse — transforming messy emissions data into audit-ready insights.*
