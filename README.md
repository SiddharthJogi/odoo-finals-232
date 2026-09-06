# PeoplePay360

> HR & Payroll ERP Platform — Config-driven salary rule engine + AI Copilot

## Quickstart

```bash
# 1. Start Postgres
docker compose up -d db

# 2. Backend
cp .env.example .env
cd backend && npm install && npm run migrate && npm run seed && npm run dev

# 3. Frontend
cd frontend && npm install && npm run dev

# 4. AI Service
cd ai-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8001
```

**URLs:**
- API: http://localhost:4000/api
- Frontend: http://localhost:5173
- AI Service: http://localhost:8001

## Architecture

```
React SPA → Express API (routes→controllers→services→repositories) → PostgreSQL
                    │                                    ▲
                    ├──── /api/ai (Node: Gemini + fallback,──→ ai-service (FastAPI:
                    │      rate-limit/cache, calls dashboard    intent keywords,
                    │      service for grounding data) ─────→   anomaly scan, forecast)
                    └──────── HTTP only ─────────────────────────────┘
```

Full module-by-module breakdown, file-level responsibilities, edge cases, and a security review live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — that file supersedes the diagram above and the Team Ownership table below wherever they conflict; this README is a quickstart, not the source of truth.

## Team Ownership

| Dev | Module | Directory |
|-----|--------|-----------|
| Dev 1 | HR Core (Auth, Employee, Contract, Schedule) | `backend/src/modules/hr-core/` + `frontend/src/modules/employees/` |
| Dev 2 | Time Ops (Attendance, Time Off) | `backend/src/modules/time-ops/` + `frontend/src/modules/attendance/` + `frontend/src/modules/time-off/` |
| Dev 3 | Payroll Engine | `backend/src/modules/payroll/` + `frontend/src/modules/payroll/` |
| Dev 4 | Dashboard + AI | `backend/src/modules/dashboard/` + `frontend/src/modules/dashboard/` + `ai-service/` |

## Current Status (Production Ready)
All team branches (`clean-version`, `feat/attendance-insights-calendar`, and `main`) have been successfully merged. The application is fully functional:
- **Dev 1 (HR Core):** Employee management, Contracts, and Scheduling modules are active.
- **Dev 2 (Time Ops):** Late (+15m) mark flagging, overtime analytics, multi-shift total hours summation, 3-late-mark 0.5-day leave balance auto-deductions, hover quick-add Team Leave Calendar, and time-off allocation/request approval workflows.
- **Dev 3 (Payroll):** Dynamic rule engine, Payslip generation with corporate PDF templates, working-day attendance/leave proration, and full backend test coverage.
- **Dev 4 (Dashboard + AI):** FastAPI anomaly detection and interactive payroll charts.

## Documentation

See [`docs/`](docs/) for architecture, data model, API contracts, sprint playbook, and judge defense guide.
