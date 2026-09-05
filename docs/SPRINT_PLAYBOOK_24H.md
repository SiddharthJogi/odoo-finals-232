# PeoplePay360 — 24-Hour Sprint Playbook

> Ambitious on purpose. Aim for every checkpoint target even if it means a few late-night pushes — a team that's slightly over-scoped and cuts gracefully beats a team that under-scoped and coasts.

## 1. Team & Ownership Recap

| Dev | Module | Hour-24 target |
|---|---|---|
| Dev 1 | HR Core (Auth, Employee, Contract, Schedule) | Full CRUD, RBAC enforced, period-aware contract resolution live |
| Dev 2 | Time Ops (Attendance, Time Off) | Check-in widget, approval workflow, allocation deduction working end-to-end |
| Dev 3 | Payroll Engine | Rule engine, 2-step Payrun wizard, Draft→Paid workflow, PDF payslip |
| Dev 4 | Dashboard + AI + Gateway | Live filtered dashboard, AI Copilot query box, anomaly feed, deployed demo build |

## 2. Hour-by-Hour Plan

### SPRINT 1 — Foundation (Hour 0–6)
- **Hr 0–1**: Whole team: agree `DATA_MODEL_AND_API.md` is locked. Repo scaffolded per `DIRECTORY_SKELETON.md`. Postgres running via `docker compose up -d db`.
- **Hr 1–3**:
  - Dev 1: `001_init_schema.sql` (full schema), auth (login, JWT issue), RBAC middleware, roles seeded.
  - Dev 2: Attendance + Time Off tables/endpoints skeleton (routes return 501 stub → replaced by hr 5).
  - Dev 3: Salary Structure/Rule CRUD endpoints + `ruleEngine.js` first pass with unit test on 3 sample rules.
  - Dev 4: Frontend scaffold (Vite+Tailwind+shadcn), top nav shell matching spec (Employees/Contracts/Attendance/Time Off/Payroll/Reports), login page wired to Dev 1's auth.
- **Hr 3–5**: Dev 1 finishes Employee CRUD (Kanban+List+Form) end-to-end in UI. Everyone else builds against real endpoints now, not mocks.
- **Hr 5–6**: `npm run seed` produces realistic data per §4 of `DATA_MODEL_AND_API.md`. Merge all branches into `main`.

#### 🏁 CHECKPOINT 1 (Hour 6)
**Show:** login → Employee List/Form/Kanban with real seeded data, RBAC blocking a non-admin from `/users`, schema diagram from `ARCHITECTURE.md`.
**Line to say:** "Schema and API contract were locked at hour 1 — all 4 of us have been building in parallel against real endpoints since hour 3, not mocks."

### SPRINT 2 — Core Flows (Hour 6–13)
- Dev 1: Contract history UI + period-resolution logic wired into Payroll (Dev 3 consumes this). Working Schedule builder with auto-computed weekly hours.
- Dev 2: Attendance check-in/out popup widget (elapsed time, green/red indicator per spec), Attendance list with corrections. Time Off Types config, Allocation balance display, Request submit+approve flow with balance deduction transaction.
- Dev 3: Payrun 2-step wizard (scope+period → employee selection → Create Payrun), Draft→Compute status transition calling `computePayslip()` per employee, warnings surfaced for missing bank info/duplicate.
- Dev 4: Dashboard KPI cards wired to real aggregate queries (start with Total Net Paid + Payslip Status + Attendance Health). AI service skeleton (`ai-service/`) running standalone, `/ai/query` returns a hardcoded-but-real-parsing intent for now.

#### 🏁 CHECKPOINT 2 (Hour 13)
**Show:** full flow live — create a contract → mark attendance → submit+approve a leave request (balance visibly drops) → run a Payrun draft and see eligible employees pull from real contract data.
**Line to say:** "This isn't 5 separate demos — it's one connected data flow: the employee record you're looking at is the same one driving payroll eligibility right now."

### SPRINT 3 — Payroll Depth & AI (Hour 13–19)
- Dev 3: Validate → Mark Paid transitions, Payslip PDF generation, Payrun history view (paid runs stay read-only/historical).
- Dev 2: Polish attendance reporting fields feeding into dashboard; finish leave balance edge cases (partial-day, unpaid leave type).
- Dev 4: Dashboard charts (Salary by Department, Monthly Net Salary Trend), filters (Period/Department/Employee Type) wired to actually change all cards/charts. AI Copilot `/ai/query` doing real intent parsing → calling dashboard endpoints → composing a natural-language answer. Anomaly scan (`/ai/anomaly-scan`) flags: duplicate payslip, net salary >2 std-dev from employee's own trailing average, missing bank info — writes to `audit_logs`, surfaced in `/dashboard/warnings`.
- Dev 1: Free capacity — help wherever red (usually payroll edge cases or UI polish).

#### 🏁 CHECKPOINT 3 (Hour 19)
**Show:** a full Payrun taken from Draft to Paid with a generated PDF payslip; dashboard filters changing live charts; ask the AI Copilot a real question ("What's our total salary cost for Engineering this month?") and get a correct, data-backed answer; trigger an anomaly (e.g. employee with no bank account) and see it surface in the warnings feed.
**Line to say:** "Our AI layer isn't decoration — it's the same direction Odoo's own 2026 roadmap describes: an intelligent business assistant and predictive analytics, built on real payroll data, not a chatbot bolted onto static numbers."

### SPRINT 4 — Polish, Hardening, Pitch (Hour 19–24)
- **Hr 19–21**: Code freeze on new features. Fix RBAC gaps, input validation gaps, empty-state UI, loading states, error toasts. Re-run `npm run seed` from scratch to confirm a clean demo boot in under 2 minutes.
- **Hr 21–22**: Build pitch deck (max 8 slides: Problem → Architecture → Live Demo plan → Rule Engine deep dive → AI X-factor → Scalability → Roadmap). Write exact demo script (what's typed/clicked, in order).
- **Hr 22–23**: Full dry run, timed, twice. Prep answers to likely questions (see `JUDGES_DEFENSE_AND_REVIEW_GUIDE.md`).
- **Hr 23–24**: Final `git push`, tag `v1.0-demo`, backup laptop with local DB dump in case venue wifi dies.

## 3. Emergency Protocols

| Problem | Fix |
|---|---|
| AI service down / LLM API rate-limited | Core payroll/HR flow must work with zero dependency on `ai-service` — demo that first, AI is a bonus act, not a blocker. |
| Merge conflict in shared file (e.g. `App.jsx` nav) | Only Dev 4 merges into that file; others open PRs against it, never push directly. |
| Payroll calc gives wrong numbers live | Have a known-good seeded Payrun (from `npm run seed`) as a fallback to show if live computation misbehaves mid-demo. |
| Running low on time before Sprint 3 | Cut: PDF styling (keep it plain), bulk email (mock the "sent" state), Kanban view (List view is enough) — never cut the rule engine or the Payrun workflow, that's the core judged deliverable. |
