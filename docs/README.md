# PeoplePay360 — HR & Payroll Platform (24-Hour / 4-Developer Build Kit)

> **Odoo HR & Payroll hackathon problem statement, rebuilt as a real, working, config-driven ERP module — plus an AI Payroll Copilot X-factor that mirrors Odoo's own announced roadmap.**

This is not a generic starter kit. Every file in this repo is scoped to the exact functional spec: Employee & Contract → Working Schedule → Attendance → Time Off → Salary Structures/Rules → Payrun/Payslip → Payroll Dashboard, plus an AI-driven anomaly & insights layer.

---

## 1. What We're Building (one paragraph)

An HR & Payroll ERP module where the **Employee** is the operational hub. Contracts carry salary terms over time, Working Schedules define expected hours, Attendance and Time Off capture daily activity, Salary Structures/Rules compute payslips through a **sequenced, config-driven rule engine** (not hardcoded if/else), and Payruns turn a batch of employees into validated, printable, emailable Payslips. A Payroll Dashboard aggregates all of it with live filters. On top: an **AI Copilot** that answers natural-language questions about payroll data and flags anomalies (duplicate payslips, salary outliers, missing bank info) before you'd have to find them manually.

## 2. Why We Will Win This

| Judge concern | Our answer |
|---|---|
| "Is this just CRUD forms?" | Salary calc is a real rule-sequencing engine (Fixed / Percentage / Formula) reading from DB config, not hardcoded math. |
| "Is the data real?" | Everything is DB-backed from hour 1. Seed script populates realistic employees/contracts/attendance — no static JSON in the running app. |
| "Does it scale?" | Relational schema with proper FKs, period-aware contract resolution, layered service architecture — see `ARCHITECTURE.md`. |
| "What's your X-factor?" | AI Copilot + anomaly detection, directly aligned with Odoo 20's own "Intelligent Business Assistant" + "Smarter Business Analytics" roadmap (see `JUDGES_DEFENSE_AND_REVIEW_GUIDE.md`). |
| "Can 4 people build this without stepping on each other?" | Vertical module ownership (see Team Matrix below) — each dev owns full-stack slices of distinct modules, one shared schema file, one shared API contract doc. |

## 3. Tech Stack (locked — do not bikeshed on hour 1)

- **Backend:** Node.js + Express (REST API), layered as Routes → Controllers → Services → Repositories
- **DB:** PostgreSQL (relational — contracts/payroll need real FK integrity + transactions)
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui, Recharts for dashboard
- **Auth:** JWT + role-based middleware (Admin, HR Manager, HR Payroll User/Manager, Employee)
- **PDF:** `pdfkit` or `puppeteer` (HTML→PDF) for payslips
- **Email:** `nodemailer` (use Mailtrap/Ethereal sandbox SMTP for demo — no real inbox needed)
- **AI Copilot service:** small Python FastAPI microservice (or Node service calling an LLM API) — isolated, called over HTTP so a rate-limit/outage never breaks core payroll flow

If your team knows Django/Postgres better than Node — swap backend, keep the schema and API contract identical. The schema and endpoint list are the source of truth, not the language.

## 4. Team Matrix (4 Developers — Vertical Ownership)

| Dev | Owns (full-stack: DB → API → UI) | Core Deliverables |
|---|---|---|
| **Dev 1 — HR Core Lead** | Employee, Department, Contract, Working Schedule, Auth/RBAC | Login, user↔employee linking, employee Kanban+List+Form, contract history with period-resolution logic, schedule builder with auto-computed weekly hours |
| **Dev 2 — Time Ops Lead** | Attendance, Time Off Types, Allocations, Time Off Requests | Check-in/out popup widget (elapsed time, green/red indicator), attendance list+corrections, leave type config, allocation balance engine, approval workflow that deducts balance |
| **Dev 3 — Payroll Engine Lead** | Salary Structure, Salary Rule, Payrun, Payslip, calc engine, PDF | Rule engine (Fixed/Percentage/Formula, sequenced), 2-step Payrun wizard, Draft→Compute→Validate→Mark Paid workflow, duplicate/missing-data warnings, Payslip PDF |
| **Dev 4 — Dashboard, API Gateway & AI Lead** | Nav shell, Payroll Dashboard, AI Copilot + anomaly service, deployment | Filtered KPI dashboard (real aggregate queries), charts, AI natural-language query box, anomaly alerts feed, demo environment/seed reset script |

Full schema and API contract live in `DATA_MODEL_AND_API.md` — **read and agree on this before writing a single line of code.** It is the only file all 4 devs must treat as immutable once locked (hour 1).

## 5. Quickstart

```bash
git clone <repo-url> && cd peoplepay360
cp .env.example .env          # fill DB creds, JWT secret, SMTP sandbox creds
docker compose up -d db       # Postgres only; app runs locally for fast reload
cd backend && npm install && npm run migrate && npm run seed && npm run dev
cd ../frontend && npm install && npm run dev
cd ../ai-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8001
```

- API: `http://localhost:4000/api`
- Frontend: `http://localhost:5173`
- AI Copilot service: `http://localhost:8001`

## 6. Golden Rules

1. **No hardcoded payroll numbers in UI or seed-only demos.** Every KPI, chart, and payslip value must come from a real DB query against real rows created through the app's own flows.
2. **Salary Rules drive Payslips — never the reverse.** If you're tempted to hardcode a Net Salary number for the demo, you're doing it wrong; fix the rule engine instead.
3. **Roles are enforced server-side**, not just hidden in the UI. Middleware checks on every protected route.
4. **One migration file per schema change**, checked into `backend/migrations/`. No one edits the DB by hand and forgets to commit it.
5. **Commit early, commit often, one feature branch per dev**, PR into `main` at each checkpoint (see `SPRINT_PLAYBOOK_24H.md`). No 2am single-branch dump.

## 7. Documentation Navigation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — layered architecture, module boundaries, payroll calc & payrun sequence diagrams
- [`DATA_MODEL_AND_API.md`](DATA_MODEL_AND_API.md) — full ERD/schema (SQL) + complete REST API contract
- [`DIRECTORY_SKELETON.md`](DIRECTORY_SKELETON.md) — exact repo folder layout + starter code snippets
- [`SPRINT_PLAYBOOK_24H.md`](SPRINT_PLAYBOOK_24H.md) — hour-by-hour plan with 4 checkpoints
- [`MASTER_BLUEPRINT.md`](MASTER_BLUEPRINT.md) — one-page consolidated view of everything
- [`JUDGES_DEFENSE_AND_REVIEW_GUIDE.md`](JUDGES_DEFENSE_AND_REVIEW_GUIDE.md) — rubric, pitch script, Q&A prep
- [`AI_CODING_ASSISTANT_RULES.md`](AI_CODING_ASSISTANT_RULES.md) — paste into Claude Code/Copilot/Cursor so AI-generated code follows our conventions
