# Carbon Pulse | breatheesg Review Portal

An enterprise-grade, full-stack carbon emissions ingestion and verification dashboard. This application allows sustainability analysts to ingest fuel procurement, electricity utility billing, and travel logs, automatically convert and normalize activities into Scope 1, 2, and 3 emissions, run outlier analysis audits, and approve entries before database audit locking.

---

## 1. Local Setup Instructions

### Backend Setup (Django)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Ensure python virtual environment is initialized and activated:**
    *   *Windows PowerShell:* `..\venv\Scripts\Activate.ps1`
    *   *Linux/macOS:* `source ../venv/bin/activate`
3.  **Install dependencies:**
    ```bash
    pip install -r ../requirements.txt
    ```
4.  **Run database migrations:**
    ```bash
    python manage.py migrate
    ```
5.  **Seed the database (essential for loaders and factors):**
    ```bash
    python manage.py seed_db
    ```
6.  **Run the local development server:**
    ```bash
    python manage.py runserver
    ```
    The REST API will be available at `http://127.0.0.1:8000/`.

---

### Frontend Setup (React)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the Vite dev server:**
    ```bash
    npm run dev
    ```
    The UI portal will be accessible at `http://localhost:5173/`.

---

## 2. Ingesting Sample Data Files

We have pre-generated three fully realistic datasets representing corporate activity records, located in the `sample_data/` folder:

1.  **SAP Fuel Procurement:** `sample_data/sap_export.txt` (Tab-separated flat file containing 20 rows of Scope 1 fuel logs).
2.  **Electricity Billing:** `sample_data/utility_export.csv` (Comma-separated utility file containing 18 rows of MSEDCL/BESCOM Scope 2 electricity logs).
3.  **Corporate Travel:** `sample_data/travel_export.csv` (Comma-separated expense sheet containing 30 rows of flights, hotel stays, and rentals).

### Upload Workflow:
1.  Navigate to the **Upload Center** via the left sidebar.
2.  Drag and drop the appropriate file into its corresponding glow pipeline, or click "Select File" to upload.
3.  Circular progress rings will animate during processing, and toast notifications will summarize row ingestion status.
4.  If a file contains malformed data, click the warning link in the history table to open the slide-out **Error Logs Drawer** and view row-by-row debugging logs.

---

## 3. Review & Audit Verification

1.  Open the **Review Dashboard** page to view the speedometer carbon target gauge and KPI summaries.
2.  Filter the ledger table using advanced filters (Scope, Status, Ingest Channel, Dates).
3.  **Inline Edit:** Double-click on any row's quantity column to edit a raw number. Type a new value, hit enter, and provide a mandatory edit justification note in the modal popup to recalculate the carbon footprint and write to the audit trail.
4.  **Locker & Sign-off:** Click "Auditor Review" on a row, inspect the raw JSON payload in the terminal view, verify the calculation flow graph, and click "Lock & Approve" to seal the entry.

---

## 4. Default Login Credentials

*   **Username:** `admin`
*   **Password:** `password123`
*   **Default Tenant Profile:** `breatheesg Manufacturing` (`breatheesg-mfg` company profile, toggled in the Header)

---

## 5. Deployment Instructions (Railway / Render)

### Database Environment Configurations:
*   Configure the database via a standard PostgreSQL database URI environment variable:
    `DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>`
*   Set django debugging to false: `DEBUG=False`
*   Configure a production secure secret key: `SECRET_KEY=<your-secret>`

### Static Assets:
The Django project is pre-configured with **WhiteNoise** middleware to compile and compress static files automatically:
`STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'`

### Build & WSGI Command:
The `Procfile` is pre-configured to deploy on Railway or Render out-of-the-box:
`web: gunicorn breatheesg_back.wsgi`

### Live URL:
*   **Production Deployment Sandbox URL:** `https://carbon-pulse.up.railway.app` (Placeholder)
