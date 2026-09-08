# AllPay Dashboard

Expense reimbursement platform for companies. Employees upload receipts; finance reviews every
claim in an admin dashboard that verifies it against AllPay payment records, attendance, expense
policy, and the receipt image before anyone approves a rupee.

- **Frontend:** React 19, TypeScript, Vite, MUI
- **Backend:** Express 5, Mongoose, JWT
- **Database:** MongoDB (local Docker or Atlas)
- **Tests:** Jest, supertest, mongodb-memory-server — 263 tests

---

## Quick start

You need **Node.js 20+**. MongoDB is optional locally if you use an Atlas connection string.

```bash
# 1. Install dependencies (two separate installs)
npm install
cd backend && npm install && cd ..

# 2. Create env files
cp .env.example .env
cp backend/.env.example backend/.env
```

On Windows PowerShell use `copy` instead of `cp`.

Then run the API and the web app in **two terminals** and leave both open.

**Terminal 1 — API:**

```bash
cd backend
npm run dev
```

Wait for `Server running on port 5000`.

**Terminal 2 — web app:**

```bash
npm run dev
```

Open **http://localhost:5173** in Chrome (type it in the address bar; do not Google it).

If `npm install` warns that install scripts are pending (`esbuild`, `sharp`, …), approve them or Vite will not start:

```bash
npm approve-scripts --allow-scripts-pending
```

Then run `npm install` again in the same folder.

### Sign in

| Portal | Credential | Password |
|--------|------------|----------|
| Admin | `test@example.com` | `password123` |
| Employee | Employee ID `emp0` | `password123` |

The backend seeds demo data on first connect: employees, claims, receipt images, AllPay payments,
and attendance records, so the verification engine has something to judge.

> **Local development must use `VITE_API_BASE_URL=/api`.** Pointing it at a hosted API makes login
> wait on a remote cold start, which looks like the app hanging.

---

## What the product does

### Claim verification

Every claim is scored 0–100 by seven checks. Payment-record evidence outweighs image analysis,
because a matched payment is proof while a receipt photo is an opinion.

| Check | Weight | Catches |
|-------|--------|---------|
| AllPay payment match | 3× | A claim larger than the amount actually paid |
| Attendance conflict | 2.5× | Travel spend recorded while punched in at the office |
| Duplicate claim | 2× | A reused UPI reference, or the same bill twice |
| Expense policy | 2× | Per-transaction caps, monthly caps, allowed days |
| Category vs MCC | 1.5× | Fuel spend filed under food |
| Amount pattern | 1.5× | Spend far outside that employee's own history |
| Receipt forensics | 1.5× | Edited or synthetic images (supporting signal only) |

Scoring rules that matter:

- Only checks that raise a signal are averaged. A clean policy check is not evidence of innocence,
  so passing checks cannot dilute a real warning.
- One critical failure decides the verdict on its own.
- A matched AllPay payment caps the score, so heuristic noise cannot bury a corroborated claim.

Verdicts: **verified**, **low risk**, **needs review**, **high risk**.

### Claim queries

When a claim cannot be cleared, the system opens a query thread and writes the question in plain
language, for example:

> The employee was punched in at the office from 09:30 to 18:30 on 16 Aug 2026, but this travel
> claim is timestamped 09:38. Could you explain where you were at that time?

The employee answers in their portal, finance replies, and approving or rejecting closes the thread.
Detection internals — forensic scores, rule names, AI wording — are never shown to employees.

### Admin Console

Reachable from the account menu at the top right.

| Tab | Purpose |
|-----|---------|
| User Management | Add users; per-user **Active**, **Read**, **Write** switches |
| Platform Configuration | Receipt storage backend, bucket, ingestion mode, retention |
| Connection Manager | Snowflake, BigQuery, Databricks, Redshift, S3, GCS, Azure, Postgres, MySQL, SQLite |
| Scheduler | Cron jobs for ingestion, quality checks, warehouse sync, fraud re-scan |

Lockout protection is enforced server-side:

- Super Admin keeps Read and Write permanently on; the switches are locked.
- Auditors are read-only and cannot be granted write.
- Nobody can deactivate or delete the account they are signed in with.
- The last active Super Admin cannot be deactivated, deleted, or downgraded.

### AllPay invite codes

Invite codes use `{companyPrefix}_{employeeId}` (e.g. `MCR_58847` or demo `DEM_EMP1000`).
Set the company short prefix on the Employees page. Codes appear in the Employees table with a
copy button. Share the code for mobile app onboarding — the app resolves the company from the code.

---

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| root | `npm run dev` | Vite dev server on port 5173 |
| root | `npm run build` | Typecheck and production build |
| root | `npm run lint` | ESLint |
| `backend/` | `npm run dev` | API with reload |
| `backend/` | `npm start` | API without watch |
| `backend/` | `npm test` | Jest (in-memory Mongo, S3 mocked) |

---

## Environment variables

### Frontend (root `.env`)

| Variable | Local value | Description |
|----------|-------------|-------------|
| `VITE_API_BASE_URL` | `/api` | Vite proxies `/api` to the backend on port 5000 |

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | HTTP port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/allpay_db` | Local Mongo or an Atlas connection string |
| `JWT_SECRET` | dev fallback | **Set this in production** |
| `RECEIPT_STORAGE` | `mongo` | `mongo` or `s3` |
| `API_PUBLIC_BASE` | `http://localhost:5000/api` | Prefix for receipt URLs |
| `S3_ENDPOINT` / `S3_PUBLIC_BASE` | LocalStack defaults | Used when `RECEIPT_STORAGE=s3` |
| `SIGHTENGINE_API_USER` / `_SECRET` | — | Optional image-authenticity provider |
| `ENABLE_RECEIPT_FRAUD_PIPELINE` | `true` | Set `false` to skip image analysis |
| `USE_RAZORPAY_UPI` | `false` | Enable Razorpay UPI |

Never commit real secrets. Rotate any credential that has appeared in a terminal or a chat.

---

## Running with Docker

```bash
docker compose up -d
```

Starts MongoDB, LocalStack S3, the API, and the built UI on port 5173.

For infrastructure only, then run the app on the host:

```bash
docker compose up -d mongodb localstack localstack-setup
```

---

## Tests

```bash
cd backend
npm test
```

Uses an in-process MongoDB and mocks S3, so no external services are required.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Server running on port 5000` | That is success, not an error. Keep that terminal open and start the frontend from the **repo root** (`npm run dev`). |
| `Blocked request. This host is not allowed` | Vite 8 is rejecting a tunnel hostname. Pull this repo (it sets `server.allowedHosts: true`), restart `npm run dev` at the repo root, then open **http://localhost:5173**. |
| `allow-scripts` / pending install scripts | Run `npm approve-scripts --allow-scripts-pending`, then `npm install` again. |
| Login hangs for 30+ seconds | `VITE_API_BASE_URL` points at a hosted API; set it to `/api` |
| `'tsx' is not recognized` | Run `npm install` inside `backend/` |
| UI loads but data is empty | The API terminal is not running; start `npm run dev` in `backend/` |
| Receipt images do not render | Confirm the API is reachable and `API_PUBLIC_BASE` matches how you open the app |
| Port 5173 already in use | `npm run dev -- --port 5174` |

---

## Cloud, warehouse, and scheduler

These belong in **Admin console**, not on the claims sidebar. An expense product is not a data platform; putting “Cloud warehouse” next to receipts copies the wrong product.

- **Receipt storage** — where bill images live (MongoDB by default).
- **Destinations** — local disk, S3, or a warehouse extract. Test writes a probe file. Warehouse sync writes CSV under `backend/data/exports`.
- **Scheduler** — cron jobs the API process actually runs. Use **Run now** to execute immediately.

---

## Not built yet

- Live Snowflake/BigQuery SQL drivers (extracts land as CSV on disk).
- S3 uploads still need AWS credentials; without them receipts stay in MongoDB.
- Email/Slack alert delivery.
- TOTP enrolment UI (the 2FA flag and 30-minute idle timeout are enforced).
