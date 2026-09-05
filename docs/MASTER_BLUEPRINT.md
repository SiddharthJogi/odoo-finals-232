# PeoplePay360 — Master Blueprint (One-Page Consolidated View)

> Read this if you only read one file. Everything here is expanded in its dedicated doc — links below each section.

## 1. The Pitch in One Paragraph

An HR & Payroll ERP module (Odoo-style) where Employee is the operational hub: Contracts carry period-specific salary terms, Working Schedules define expected hours, Attendance and Time Off capture daily activity with balance-aware approvals, and a **config-driven Salary Rule engine** turns a 2-step Payrun wizard into validated, printable, emailable Payslips — Draft → Compute → Validate → Mark Paid. A live filtered Payroll Dashboard aggregates all of it, and an isolated **AI Copilot service** answers natural-language questions and flags payroll anomalies, directly mirroring Odoo's own announced AI roadmap.

## 2. Stack
Node/Express + PostgreSQL · React/Vite/Tailwind/shadcn · JWT+RBAC · FastAPI AI microservice · pdfkit/puppeteer for payslips · nodemailer sandbox for bulk send. → `README.md` §3

## 3. Team (4 devs, vertical full-stack ownership)

| Dev | Module | 24h target |
|---|---|---|
| 1 | HR Core (Auth, Employee, Contract, Schedule) | RBAC + period-aware contract resolution |
| 2 | Time Ops (Attendance, Time Off) | Check-in widget + balance-deducting approval flow |
| 3 | Payroll Engine | Rule engine + full Payrun lifecycle + PDF |
| 4 | Dashboard + AI + Gateway | Live filtered dashboard + AI Copilot + anomaly feed |

→ `README.md` §4, `SPRINT_PLAYBOOK_24H.md`

## 4. Architecture in One Diagram

```
React SPA → Express API (routes→controllers→services→repositories) → PostgreSQL
                    │                                    ▲
                    └──────── HTTP only ─────────→ ai-service (FastAPI)
```
One monolith for the transactional ERP core (fast, zero network overhead in demo). One isolated microservice for AI (the only component that legitimately depends on an external, rate-limitable API). → `ARCHITECTURE.md`

## 5. The Two Pieces of Real Business Logic

1. **Period-aware contract resolution** — payroll always uses the one active contract valid for the selected payroll period, never a stale or future one.
2. **Sequenced, config-driven salary rule engine** — Fixed / Percentage / Formula rule types, executed in `sequence` order, reading/writing a shared computation context. New allowance/deduction = new DB row, zero code change. Formula evaluation is sandboxed (whitelist pattern, no raw `eval`). → `ARCHITECTURE.md` §4, `DIRECTORY_SKELETON.md` §2

## 6. Data Model (full DDL + API contract)
14 core tables: `roles, users, departments, employees, working_schedules, schedule_lines, contracts, attendances, time_off_types, allocations, time_off_requests, salary_structures, salary_rules, payruns, payslips, payslip_lines, audit_logs`. Full REST contract with role-per-endpoint table. → `DATA_MODEL_AND_API.md`

## 7. X-Factor: AI Copilot + Anomaly Detection

- **NL query**: intent classification → parameters → calls our own validated dashboard aggregate endpoints → composed natural-language answer. LLM never writes or executes raw SQL.
- **Anomaly scan**: runs after every Payrun validation — duplicate payslips, statistical salary outliers vs. an employee's own trailing average, missing required fields (e.g. bank details) — written to `audit_logs`, surfaced in dashboard warnings.
- **Forecast**: simple trend projection on historical Payrun net totals.
- **Why this and not blockchain/other buzzwords**: it's the direction Odoo's own 2026 roadmap doc explicitly names (Intelligent Business Assistant, Smarter Business Analytics) — alignment with the actual platform vendor's stated future, not an unrelated gimmick. → `JUDGES_DEFENSE_AND_REVIEW_GUIDE.md` §4

## 8. 24-Hour Plan at a Glance

```
Hr 0–6   Foundation: schema locked, auth+RBAC, Employee CRUD live, seed data real
Hr 6–13  Core flows: contracts→schedules, attendance widget, time-off+balances,
         Payrun wizard step 1&2, dashboard KPI cards wired to real queries
Hr 13–19 Payroll depth + AI: full Payrun lifecycle + PDF, dashboard charts+filters,
         AI Copilot answering real questions, anomaly detection live
Hr 19–24 Freeze, harden RBAC/validation, rehearse pitch, final push
```
4 checkpoints, one every ~6 hours, each with a scripted "line to say" to mentors. → `SPRINT_PLAYBOOK_24H.md`

## 9. Golden Rules (repeat until automatic)

1. No hardcoded payroll numbers anywhere in the running app.
2. Salary Rules drive Payslips, never the reverse.
3. RBAC enforced server-side on every route.
4. One migration file per schema change, committed.
5. Small PRs at every checkpoint, not one dump at the end.

## 10. If Judges Ask One Question, Prep For This One

*"Show me a Salary Rule actually changing a Payslip in real time."*
Open Salary Rules → add/edit a rule → recompute a draft Payslip → the new line appears with the right sequenced value. This single demo moment proves the entire "not just a CRUD app" claim. Rehearse it until it's boring.
