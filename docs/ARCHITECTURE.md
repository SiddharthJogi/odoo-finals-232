# PeoplePay360 — Architecture (Current State)

> This document describes the system **as it actually exists in the codebase today**, not the original 24-hour hackathon plan. For the original planning documents (team ownership, sprint schedule, judge-defense talking points), see `SPRINT_PLAYBOOK_24H.md`, `MASTER_BLUEPRINT.md`, `JUDGES_DEFENSE_AND_REVIEW_GUIDE.md`. For the raw schema/endpoint reference, see `DATA_MODEL_AND_API.md` (also refreshed alongside this file). This file is the one to keep in sync going forward — update it whenever you add a module, table, or route.

---

## 1. System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  React SPA (Vite, frontend/src)                          │
│  Nav: Employees | Contracts | Schedules | Attendance | Time Off |        │
│       Payroll | Dashboard | Users            AiCopilotWidget (floating)  │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ REST, JWT Bearer header (axios, api/client.js)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                Express API (backend/src, single process)                 │
│  app.js: cors() → express.json() → morgan → routes → 404 → errorHandler  │
│  Routes → Controllers → Services → Repositories → PostgreSQL             │
│  authenticate (JWT) + requireRole(...) middleware per-route              │
├───────────┬────────────┬────────────┬────────────┬───────────┬──────────┤
│  hr-core   │ time-ops   │  payroll   │ dashboard  │    ai     │          │
│ (employees,│(attendance,│(structures,│(read-only  │(Node-side │          │
│ contracts, │ time off)  │ rules,     │ aggregate  │ AI bridge:│          │
│ schedules, │            │ payruns,   │ queries,   │ Gemini +  │          │
│ dept       │            │ payslips,  │ no owned   │ fallback, │          │
│ approval,  │            │ PDF)       │ tables)    │ rate-limit│          │
│ users)     │            │            │            │ /cache)   │          │
└───────────┴────────────┴────────────┴────────────┴─────┬─────┘          │
                                 │                          │ HTTP          │
                                 ▼                          ▼               │
                        PostgreSQL (single DB)     ai-service (FastAPI,     │
                        strict FKs, migrations       Python, port 8001)     │
                        001–011                       — intent keyword      │
                                 ▲                     classifier, anomaly  │
                                 │ HTTP (server-to-server,                  │
                                 │ audit_logs writes)    scan, linear-      │
                                 └─────────────────────  regression forecast│
└──────────────────────────────────────────────────────────────────────────┘
```

**Key architectural fact that differs from the original plan:** the "AI Copilot" is now split across two layers, not one microservice:

- **`ai-service/` (Python FastAPI)** does *only* keyword-based intent classification (`/ai/query` → `{intent, params}`, no LLM call), payrun anomaly scanning (flat ₹150k threshold + duplicate/missing-bank checks, not the stddev-based approach its own docstring claims), and a linear-regression payroll forecast.
- **`backend/src/modules/ai/` (Node, new)** is what the frontend actually talks to (`POST /api/ai/query`). It calls the Python service for intent classification (falling back to its own local keyword classifier if the Python service is unreachable), fetches real numbers from `dashboard.service.js` based on the classified intent, then calls **Google Gemini directly** (`geminiClient.js`) to compose a natural-language answer grounded in that data — falling back to hand-written template answers (`synthesizeFallbackAnswer`) if Gemini is unconfigured or fails. It also does per-user rate limiting, response caching, and usage telemetry, all in-memory (`aiProtections.js`).

---

## 2. Backend Modules

Layering convention inside every module: `*.routes.js` (URL → controller, RBAC attached here) → `*.controller.js` (parses `req`, calls service, shapes response — no business logic) → `*.service.js` (all business logic) → `*.repository.js` (only file allowed to write SQL) → `*.validation.js` (zod schemas). A module may only write to its own tables; cross-module reads go through the other module's *service* function (e.g. `payroll.service.js` calls `hrCoreService.getApplicableContract(...)`, never queries `contracts` directly).

### 2.1 `hr-core` — Employees, Contracts, Schedules, Users, Departments

Owns tables: `roles`, `users`, `employees`, `departments`, `contracts`, `working_schedules`, `schedule_lines`, `department_change_requests`.

| File | Responsibility |
|---|---|
| `hrCore.routes.js` | Auth (`/auth/login`), users (`/users*`, admin-only except `/users/me*`), departments, employees, department-change-requests, contracts, schedules. |
| `hrCore.controller.js` | Thin request/response shaping for all of the above. |
| `hrCore.service.js` | Auth (`login`, JWT signing), user lifecycle (`createUser`, `updateUserRole`, `changePassword`, `deactivateUser`, `reactivateUser`, `markOnboardingSeen`), employee CRUD + pagination, department-change-request workflow, contract CRUD with rigid-contract enforcement, schedule CRUD, `getApplicableContract` (period-aware resolution). |
| `hrCore.repository.js` | All SQL for the above. Notably `findAllEmployees` does the pagination/search/presence query (see §5). |
| `hrCore.validation.js` | zod schemas — see §6 for the ones with non-obvious rules (rigid contracts, flexible schedules, bank account). |
| `mailer.js` | nodemailer wrapper (`sendWelcomeEmail`, `sendPayslipEmail`), verifies the SMTP transporter on module load and logs (doesn't crash) if unreachable. |

**Auth & users**
- `POST /auth/login` — email+password → bcrypt compare → JWT `{id, email, role, employeeId}`, `config.jwtExpiresIn` (default 8h).
- Every `users` row **must** have a linked `employees` row (`users.employee_id NOT NULL`, migration 005 backfilled any legacy nulls by creating a synthetic employee named from the email's local-part). There is no more "admin without an employee profile" case — even the seeded admin account got backfilled an employee record.
- `PATCH /users/:id/role` — admin only, and the service layer explicitly rejects `actorId === targetUserId` (an admin cannot re-role themselves through this endpoint) — the one hard-coded self-elevation guard in the codebase.
- `reactivateUser`/`deactivateUser` — same self-action guard pattern.
- The standalone "Create User" form was intentionally removed from the frontend (`UserManagement.jsx`) in favor of always provisioning login + employee together via `POST /employees/provision`; `POST /users` (admin, link an *existing* unlinked employee to a new login) still exists server-side but has no dedicated UI.

**Employees**
- `GET /employees` is **server-side paginated**: `?page=&limit=&search=&department_id=&status=&employee_type=`. Response shape is `{data, total, page, limit}` — this is a breaking response-shape change from a plain array; any new frontend code calling this endpoint must account for it (use `frontend/src/api/employees.js#fetchAllEmployees()` for "just give me everyone" use cases like dropdowns, which requests `limit: 500` and unwraps `.data.data`).
- `search` matches `ILIKE '%term%'` against name OR email, same bound parameter reused for both (see §5 for a bug that used to exist here).
- Every row carries a computed `is_present` boolean: `EXISTS` subquery checking for an `attendances` row today with status `in_progress` or `done` — this is a *different concept* from `employees.status` (`active`/`archived`, which is an employment-status flag, not daily presence).
- `bank_account` is `NOT NULL` (migration 011). Existing rows without one were backfilled to the literal string `'PENDING'` — a fast way to find employees who still need real bank details entered: `SELECT * FROM employees WHERE bank_account = 'PENDING'`.
- `PUT /employees/:id` **cannot change `department_id`** — the field is `.omit()`'d from `updateEmployeeSchema` entirely. Department changes only happen through the approval workflow below, regardless of caller role (admin included).

**Department change approval workflow** (new)
- `POST /employees/:id/department-requests` (hr_manager+) creates a `draft` row in `department_change_requests`, capturing `current_department_id` at request time.
- `GET /department-requests?status=&employee_id=` (admin, hr_manager — hr_manager gets read access so the employee form can show "your request is pending", but cannot approve).
- `PATCH /department-requests/:id/approve` / `/reject` (admin only). Approve is transactional: flips the request to `approved`, writes `employees.department_id`, and inserts an `audit_logs` row — all in one DB transaction via `db.getClient()`.
- Edge case: requesting a change to the employee's *current* department is rejected client-side-equivalent at the service layer (`ValidationError`).

**Contracts**
- `flexibility`: `'flexible'` (default) or `'rigid'`. Once a contract is `rigid`, `updateContract` rejects any change to `wage`, `start_date`, `end_date`, or `structure_id` — comparing the *normalized* incoming value against the *normalized* existing value (numeric coercion for `wage`/`structure_id`, ISO-date-string coercion for dates) specifically so that resubmitting a form with unchanged values doesn't false-positive as an edit attempt. Only `status` transitions remain possible on a rigid contract.
- `joining_bonus` (default 0) is a one-time amount. It is **not** applied at contract-creation time — it's applied by `payroll.service.js` the first time a payslip is generated for that contract (see §2.3). `contracts.joining_bonus_payslip_id` records which payslip it landed on, so recomputing that same payslip (draft→computed) re-adds the line idempotently without ever paying it twice or onto a different payslip.
- Overlap validation unchanged from the original design: no two `active` contracts for the same employee may have overlapping `[start_date, end_date]` ranges (`findOverlappingActiveContracts`).

**Schedules**
- `calendar_type`: `'standard'`, `'flexible'`, or `'shift'`.
  - `standard`/`shift` require ≥1 `schedule_lines` row (day/start/end/break); `flexible` requires `target_weekly_hours` instead and has no lines at all — enforced by a zod `superRefine` that branches on `calendar_type`.
  - `shift` lines may cross midnight (`end_time <= start_time` is treated as "ends the next day", not rejected or miscalculated) — both the weekly-hours preview (`getScheduleWithLines`) and the attendance late/overtime decoration (§2.2) roll the end time into the next calendar day when this is detected.
- `grace_period_minutes` (default 15) and `overtime_buffer_minutes` (default 15) are per-schedule, consumed by `time-ops` when deciding whether a check-in is "late" or a check-out counts as overtime.

### 2.2 `time-ops` — Attendance, Time Off

Owns tables: `attendances`, `time_off_types`, `allocations`, `time_off_requests`.

| File | Responsibility |
|---|---|
| `timeOps.routes.js` | Attendance CRUD/check-in/out/correction, time-off types/allocations/requests/approve/refuse. |
| `timeOps.controller.js` | Request shaping; notably resolves `employee_id` from `req.user.employeeId` when the caller is role `employee` (self-service can't act on someone else's record) or from the body for managers/admins acting on someone's behalf. |
| `timeOps.service.js` | `decorateAttendanceSchedule` (late/overtime calc — see below), check-in/out, the auto-penalty rule, time-off request creation with weekend-exclusion + deferred-payroll-period handling, approve/refuse with allocation-balance transactions. |
| `timeOps.repository.js` | SQL, including the `attendances` ⟕ `employees` ⟕ `working_schedules` ⟕ `schedule_lines` join used for decoration. |
| `timeOps.validation.js` | zod schemas. |

**Attendance decoration (`decorateAttendanceSchedule`)** — this is where "is this check-in late / is this check-out overtime" is computed, entirely as a read-time derived value (never stored):
- If the employee has **no assigned schedule**, the function returns `is_late: false, overtime_hours: 0` rather than comparing against any default schedule. (Previously this silently fell back to comparing against schedule id 1's hours for *any* unscheduled employee — that fallback has been removed as a correctness fix.)
- **Night/overnight shifts**: the scheduled end time is anchored to the *check-in's* calendar day, then rolled forward one day if `end_time <= start_time` (e.g. 22:00→06:00). Without this, an employee working a genuine overnight shift would appear to rack up 18+ hours of "overtime" because the naive same-day comparison put the scheduled end 18 hours in the past relative to their actual check-out.
- **Grace period**: late = `check_in - scheduled_start >= schedule.grace_period_minutes` (was a hardcoded 15 minutes; now per-schedule, still defaults to 15 if the joined schedule row is somehow missing the column).
- **Overtime buffer**: overtime only starts counting once `check_out > scheduled_end + overtime_buffer_minutes`, but the *reported* `overtime_hours` figure is measured from the unbuffered `scheduled_end` (so a check-out exactly at the buffer boundary reports ~`buffer_minutes` of overtime, not zero) — this is intentional (buffer decides *whether* to flag overtime at all; once flagged, the number should reflect the real excess).

**Auto-penalty rule** (pre-existing, not part of a recent change, but easy to miss): every time a check-in is flagged late, the employee's total lifetime `flagged` count is checked, and **every 3rd late violation auto-deducts 0.5 day from a leave allocation** and auto-creates + auto-approves a `time_off_requests` row, all inside one DB transaction with an `audit_logs` entry (`action: 'auto_deduct'`). This is live business logic, not a stub — any change to the "late" definition (grace period, schedule assignment) directly changes how often this fires.

**Time-off requests**
- `calculateWorkingDays` excludes Saturday/Sunday when auto-computing `duration` from `start_date`/`end_date` — but only when the caller doesn't explicitly pass a `duration < 1` (the hourly/sub-day escape hatch). The frontend's request modal makes the `duration` field read-only precisely so a full-day request can't bypass this via manual entry; there is still no UI/API path for genuine sub-day (hourly) requests beyond passing `duration` directly to the API.
- **Deferred time off**: if `start_date` falls inside a payrun that's already `validated`/`paid`, the request is auto-flagged `is_deferred = true` with `deferred_to_date` = the day after that payrun's `period_end`, and an audit log entry explains why — this prevents a late leave request from silently invalidating an already-paid payslip's day count.
- Approve/refuse both run inside a transaction that adjusts the relevant `allocations.taken` balance and writes an audit log; refuse *restores* the balance only if the request had actually been `approved` before (refusing a still-`draft` request doesn't touch any balance, since none was ever deducted).

### 2.3 `payroll` — Structures, Rules, Payruns, Payslips, PDF

Owns tables: `salary_structures`, `salary_rules`, `payruns`, `payslips`, `payslip_lines`.

| File | Responsibility |
|---|---|
| `payroll.routes.js` | See §7 (Security) for the exact role gates — payslip GET routes are notably under-gated. |
| `payroll.controller.js` | Request shaping; `getPayslipPdf` streams a PDF buffer with explicit `Content-Type`/`Content-Disposition`/`Content-Length`. |
| `payroll.service.js` | `getPayrollInputs` (attendance/leave → payable-days math), `calculateEmployeePayslip` (wraps the rule engine), `createPayrun` (draft creation, one payslip per selected employee, joining-bonus injection), `transitionPayrun` (draft→computed→validated→paid state machine, re-runs the rule engine on `computed`, fires the async AI anomaly scan on `validated`), `sendPayslips` (PDF-generate + email each payslip, non-fatal per-recipient failure). |
| `payroll.repository.js` | SQL, including `findPayrollInputs` — a single query computing period working days, attendance days (excluding days covered by an approved leave), attendance hours, paid/unpaid leave days, all via `generate_series` + `ISODOW` filtering (Mon–Fri only counted as "working days"). |
| `payroll.validation.js` | zod schemas. `period_start`/`period_end` are validated as `YYYY-MM-DD`-shaped strings only (regex), **not** real calendar validity — `2026-13-45` passes validation and will fail later at the SQL layer instead. |
| `ruleEngine.js` | `computePayslip` — the config-driven salary calculation core. See below. |
| `safeFormula.js` | Sandboxed formula evaluator for `formula`-type rules. See §7 (Security). |
| `pdfGenerator.js` | `generatePayslipPdfBuffer` — builds an A4 payslip PDF with `pdfkit`, auto-paginating the line-item table past y=750. |

**Rule engine (`computePayslip`)**
- Seeds a computation `context`: `base_contract_wage`, `contract_wage`/`payroll_wage` (= base wage × `payroll_factor`, i.e. prorated by attendance/leave), `worked_days`, `attendance_days`, `attendance_hours`, `leave_days`, `unpaid_leave_days`, `payroll_factor`.
- Rules run in `sequence` order; each rule's result is written back into the context under its own `code` (lowercased), so a later rule (e.g. `NET`) can reference an earlier one (e.g. `BASIC`, `HRA`). This is *why* rule sequence numbers matter operationally, not just cosmetically.
- `percentage` rules throw `PayrollError` (not a silent 0) if their `base_code` hasn't been computed yet — an explicit "you sequenced your rules wrong" error rather than a silently-wrong payslip.
- **Edge case to know about:** `gross_total` only sums lines whose `category` is `basic` or `allowance`; `net_total` subtracts only `category = 'deduction'` lines. Rules with `category = 'gross'` or `'net'` (both allowed by the validation schema) are computed and stored as line items but **do not affect either total** — they're informational-only categories. A rule author who expects a `category: 'net'` rule to *set* the net total will be surprised.
- Joining-bonus injection (in `payroll.service.js`, not the rule engine itself) happens *after* `computePayslip` returns: if the contract has `joining_bonus > 0` and hasn't been paid out yet, an extra `payslip_lines` row (`rule_id: null` — `payslip_lines.rule_id` was made nullable specifically for this, migration 010) is inserted with `category: 'allowance'`, and both `gross_total`/`net_total` are adjusted by the same amount. On `transitionPayrun`'s recompute step (draft→computed), the same logic re-fires *only* if `contracts.joining_bonus_payslip_id` already points at the payslip being recomputed — guaranteeing the bonus is never paid twice and never migrates to a different payslip.

**Payrun lifecycle**: `draft → computed → validated → paid`, enforced by an explicit transition table (`VALID_TRANSITIONS`) — any other transition throws `ValidationError` naming the expected next state. Moving to `validated` fires `triggerAsyncAnomalyScan` — a fire-and-forget HTTP POST to the Python `ai-service`'s `/ai/anomaly-scan`, deliberately not awaited so a slow/dead AI service can never block or fail a payroll validation.

### 2.4 `dashboard` — Read-Only Aggregates

Owns no tables; only file is `dashboard.service.js` (plus routes/controller). All queries are `COALESCE(..., 0)`-guarded so empty result sets return `0`/`[]` rather than `null`, and numeric fields are explicitly `parseInt`/`parseFloat`'d (Postgres returns `NUMERIC`/`BIGINT` as strings over the wire via `pg`, so this isn't optional — skipping it would silently turn dashboard totals into concatenated strings in the frontend).

Known dead/partial wiring, worth knowing before you touch this file:
- `getSummary`'s `company_id` filter parameter is accepted but never used in any query.
- `getSalaryTrend`, `getAttendanceOverview`, `getTimeOffOverview` accept no filter parameters at all — the frontend dashboard sends `dept`/`period_start`/`period_end` on every one of its 6 parallel dashboard requests, but 3 of those 6 endpoints silently ignore all of them, and `getSalaryByDepartment` only honors the date-range params, not `dept`.
- `getHighestSalaryByDepartment` and `getSalaryStructures` are exported but not wired to any route — however, they *are* used by the Node `ai` module (`ai.controller.js`) for two of its query intents (`highest_salary_by_dept`, `salary_structure_info`), so they aren't dead code, just not reachable via the dashboard REST surface directly.
- `POST /audit-logs` has **no auth middleware at all** — see §7.

### 2.5 `ai` (Node) — the actual Copilot brain

Not present in the original architecture doc; added later. Files: `ai.routes.js`, `ai.controller.js`, `aiProtections.js`, `geminiClient.js`.

Request flow for `POST /api/ai/query {question}`:
1. Validate length (2–300 chars).
2. Rate-limit check: 10 requests/minute per `req.user.id` (falls back to `req.ip` if unauthenticated, though the route requires `authenticate` so this path is theoretical) — sliding window, in-memory `Map`, resets on process restart.
3. Cache check: normalized query text (lowercased, punctuation stripped, whitespace collapsed) as key, 10-minute TTL, in-memory `Map` — resets on process restart, not shared across multiple backend instances if you ever scale horizontally.
4. Intent classification: POST to the Python `ai-service`'s `/ai/query`; on *any* failure (timeout, connection refused, non-2xx), falls back to `localClassifyIntent` — a duplicate (slightly different priority ordering) keyword classifier living in `ai.controller.js` itself.
5. Fetch real numbers from `dashboard.service.js` based on the classified intent (one of `salary_structure_info`, `highest_salary_by_dept`, `salary_summary`, `department_breakdown`, `anomaly_report`, `trend`, `attendance_overview`, `time_off_summary`, or the `default` catch-all).
6. Generate the natural-language answer: `geminiClient.js` posts to `generativelanguage.googleapis.com` with the fetched data JSON-dumped into the prompt (temperature 0.1 for factual consistency), trying `config.geminiModel` first then a fixed list of fallback model names, with exponential backoff on HTTP 429/503. On any failure (no API key configured, network error, exhausted retries), falls back to `synthesizeFallbackAnswer` — hand-written per-intent template strings built directly from the same `dbData`, so the user still gets a real, data-grounded answer even with zero AI budget/connectivity.
7. Cache + log usage telemetry (token estimates, latency, cache-hit rate — `GET /ai/usage-stats` exposes this).

`anomalyScan` and `forecast` controllers are much simpler: pure proxies to the Python service, except `forecast` has one JS-side fallback (projects `latest × 1.05` from the dashboard's own salary trend) if the Python service is unreachable, so it degrades rather than erroring.

### 2.6 `ai-service` (Python, FastAPI, port 8001) — separate deployable

- `main.py` — 4 endpoints (`/health`, `/ai/query`, `/ai/anomaly-scan`, `/ai/forecast`), CORS wide open (`allow_origins=["*"]`).
- `intent.py` — `classify_intent`: hardcoded-priority keyword matching (checks `anomaly`→`trend`→`department`→`attendance`→`time_off` in that fixed order before falling into a general keyword-scoring loop that also covers `salary_summary`/`employee_count`). No LLM call here despite the "AI" branding — the code comment explicitly says a future dev was meant to replace this with LLM-based classification; that never happened, and the Node `ai` module's Gemini call effectively supersedes the need to.
- `anomaly.py` — `scan_payrun`: fetches a payrun's payslips from the Node API (forwarding the caller's `Authorization` header), checks (a) duplicate payslips per employee, (b) a **flat ₹150,000 net-salary threshold** (the module's own docstring claims ">2 standard deviations from trailing average", which is not what the code does — a documentation/implementation mismatch worth fixing if you touch this file), (c) missing bank account / existing `has_warning` flag. Posts each finding to the Node backend's unauthenticated `/dashboard/audit-logs`. Any exception anywhere is caught and swallowed — the function always returns a well-formed (possibly empty) result.
- `forecast.py` — `project_next_period`: least-squares linear regression over `total_net` from `GET /dashboard/salary-trend`. If that call fails for any reason, **silently substitutes a hardcoded 2-point stub dataset** rather than erroring — the response has no field distinguishing "real trend" from "stub trend", so a dead backend produces a plausible-looking but fake forecast rather than a visible error. `confidence` is `high`/`medium`/`low` based on sample count (≥6/≥3/else); `trend` is `stable` if the slope is within 1% of the mean magnitude.

---

## 3. Frontend Modules (`frontend/src`)

React 18 + Vite + Tailwind, React Router for navigation, Framer Motion for page/panel transitions, Recharts for dashboard charts, axios (`api/client.js`) with a request interceptor that attaches the JWT and a response interceptor that clears storage + redirects to `/login` on any 401.

| Path | Purpose |
|---|---|
| `App.jsx` | Route table + top nav (`NavBar`/`DropdownMenu`), `RoleRoute` guard (redirects to a role-appropriate default page if the current role isn't allowed), renders `AiCopilotWidget` and `OnboardingTour` globally when authenticated. |
| `navConfig.js` | Single source of truth for nav structure + per-item `roles` + one-line `description` — shared by the nav bar **and** `OnboardingTour.jsx`, specifically so the tour can never show a section a role can't actually reach. |
| `api/client.js` | axios instance; JWT attach + 401 auto-logout. |
| `api/employees.js` | `fetchAllEmployees(params)` — wraps the now-paginated `/employees` endpoint for callers that just want "all employees" (dropdowns, lookups) rather than a paginated page. |
| `auth/AuthContext.jsx` | `user`/`role`/`isAuthenticated` state, backed by `localStorage`; no token-expiry check on load (relies on the 401 interceptor to catch it on first request). |
| `auth/LoginPage.jsx` | Login form + two hardcoded "quick demo" credential-fill buttons. |
| `auth/ChangePassword.jsx` | Self-service password change (`PATCH /users/me/password`). |
| `components/Toast.jsx` | `ToastProvider`/`useToast()` — app-wide toast notifications. |
| `components/AiCopilotWidget.jsx` | Floating chat widget calling `POST /api/ai/query`; badges each answer as Cached / a specific Gemini model name / "Verified Data" (fallback) based on `data.cached`/`data.source`/`data.modelUsed`. |
| `components/OnboardingTour.jsx` | First-login modal: fetches `/users/me`, shows it if `onboarding_seen_at` is null, lists `navConfig.NAV_ITEMS` filtered to the current role, dismiss calls `PATCH /users/me/onboarding-seen`. |
| `modules/employees/` | `EmployeeList.jsx`/`EmployeeKanban.jsx` (share `useEmployeeSearch.js` hook + `EmployeeFilterBar.jsx` for server-side search/filter/pagination), `EmployeeForm.jsx` (create/edit, department-change-request flow, optional manual password on create), `PresenceBadge.jsx`, `ContractHistory.jsx` (per-employee contract list + create modal), `DepartmentRequests.jsx` (admin approve/reject queue). |
| `modules/contracts/` | `ContractList.jsx`, `ContractForm.jsx` (standalone create/edit page — flexibility/joining-bonus fields, disables locked fields when editing a rigid contract). |
| `modules/schedules/` | `ScheduleList.jsx`, `ScheduleForm.jsx` (branches its whole body on `calendar_type` — flexible shows a target-hours input, standard/shift show the day-line grid with overnight support for shift). |
| `modules/attendance/` | `CheckInWidget.jsx` (self check-in/out, shift progress bar with overnight-aware math), `AttendanceList.jsx` (management log + correction modal). |
| `modules/time-off/` | `Requests.jsx` (team calendar — click any non-weekend date to open the request modal, read-only auto-calculated duration; request list with approve/refuse), `Allocations.jsx`, `Types.jsx`. |
| `modules/payroll/` | `PayrunWizard.jsx` (2-step draft→create wizard, lifecycle transition buttons, PDF download), `Structures.jsx`, `Rules.jsx` (read-only viewer — rules are seed/DB-managed, no create UI), `PayslipView.jsx` (single payslip + lazy-loaded AI explanation panel — **has a known bug**, see §8). |
| `modules/dashboard/` | `Dashboard.jsx` + `components/{KpiGrid,AlertsFeed,SalaryCharts,OperationsCharts}.jsx` — 6 parallel dashboard queries on mount/filter-change (see §2.4 for which filters actually do anything server-side). |
| `modules/users/` | `UserManagement.jsx` — role/status management for existing users; no longer has an inline "create user" form (removed deliberately, see §2.1). |

---

## 4. Data Model

Full DDL and endpoint table: `DATA_MODEL_AND_API.md` (kept in sync with this file). Summary of what's changed since the schema was originally "locked":

- `users.employee_id` is now `NOT NULL` (migration 005) — every login must map to an employee.
- `employees.bank_account` is now `NOT NULL` (migration 011).
- `working_schedules` gained `grace_period_minutes`, `overtime_buffer_minutes`, `target_weekly_hours`.
- `contracts` gained `flexibility`, `joining_bonus`, `joining_bonus_payslip_id`.
- New table `department_change_requests`.
- `users` gained `onboarding_seen_at`.
- `payslip_lines.rule_id` is now nullable (to allow the injected joining-bonus line).

Migrations `002`–`011` are additive/forward-only, run in numeric-filename order by `backend/scripts/migrate.js` (no migration-tracking table — each file re-runs on every `npm run migrate`, so every migration must be idempotent: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, backfill-then-constrain patterns, etc.).

---

## 5. Notable Edge Cases (cross-cutting)

- **Employee search parameter reuse**: the `search` filter's SQL (`e.name ILIKE $n OR e.email ILIKE $n`) intentionally reuses the *same* placeholder number for both `ILIKE` checks against one bound parameter — do not "fix" this into two separate `$n`/`$n+1` placeholders without also pushing the parameter twice, or you'll get a Postgres `bind message supplies N parameters, but prepared statement requires N+1` error.
- **Rigid contract comparison**: `pg` returns `NUMERIC` columns as strings and `DATE` columns as JS `Date` objects. The rigid-contract-lock comparison in `hrCore.service.js` normalizes both sides (`Number()` for wage/structure_id, ISO-date-string slicing for dates) before comparing — a naive `!==` would false-positive-lock every no-op resave.
- **Night shifts everywhere**: three independent places implement "if end ≤ start, add 24h" — schedule weekly-hours preview, attendance late/overtime decoration, and the check-in widget's shift-progress bar. If you change the overnight-detection logic, change it in all three (server-side schedule calc, server-side attendance calc, client-side widget calc) or they'll disagree with each other.
- **Weekend exclusion, three layers**: time-off duration calculation (backend, `calculateWorkingDays`), payroll's period-working-days math (backend, `ISODOW < 6` filters in `findPayrollInputs`), and the team-leave calendar UI (frontend, `isWeekend` styling + non-clickable weekend cells) all independently define "weekend" as Sat/Sun with no public-holiday concept anywhere in the schema.
- **Joining bonus idempotency**: relies entirely on `contracts.joining_bonus_payslip_id` being set inside the *same transaction* as the payslip insert. If you ever add a path that creates a payslip outside `createPayrun`/`transitionPayrun`, it must replicate this check-then-set pattern or a contract could get its bonus paid twice.
- **AI Copilot degrades three separate ways**, independently: (1) intent classification falls back from the Python service to a local keyword classifier, (2) answer generation falls back from Gemini to hand-written templates, (3) forecast/anomaly-scan fall back from the Python service to either a JS-side approximation (forecast) or a hard error surfaced to the caller (anomaly-scan has no further fallback). None of these three failure modes affect each other — Gemini being down doesn't affect intent classification, and vice versa.

---

## 6. Validation Highlights (zod, non-obvious rules)

- `createEmployeeSchema` / `updateEmployeeSchema`: the update variant `.omit({ department_id: true })`s the create schema, so it's structurally impossible to pass `department_id` through `PUT /employees/:id` even if a client tries.
- `createContractSchema` / `updateContractSchema`: both built from the same `contractShape` object + a shared `superRefine` date-order check, rather than one being `.partial()` of a `.refine()`'d version of the other — this matters because zod's `.refine()`/`.superRefine()` wrap a schema in a `ZodEffects` object that no longer has `.partial()` available; if you need a partial variant with the same custom validation, refine the *plain object schema* twice (once for create, once for `.partial()`) rather than trying to `.partial()` an already-refined schema.
- `createScheduleSchema`: `superRefine`s on `calendar_type` — `flexible` requires `target_weekly_hours`, anything else requires ≥1 line. `updateScheduleSchema` deliberately does *not* carry this refinement (a partial update might legitimately touch only one field at a time).
- `departmentChangeRequestSchema` / `reviewDepartmentChangeRequestSchema`: minimal — just `department_id` and an optional `note` respectively; all the actual business rules (already-in-that-department check, draft-only re-review guard) live in the service layer, not validation.

---

## 7. Security

- **AuthN**: JWT (`HS256` via `jsonwebtoken` defaults), `Authorization: Bearer <token>`, secret from `JWT_SECRET` env var (required at boot — `config.js` throws immediately if missing). Expiry via `JWT_EXPIRES_IN` (default `8h`). `authenticate` middleware terminates the request itself on missing/malformed/expired/invalid tokens (`401`) — these never reach the shared `errorHandler`.
- **AuthZ**: `requireRole(...allowedRoles)` is a flat allowlist check against `req.user.role` — **there is no role hierarchy enforced in code**, despite the roles conceptually nesting (`admin > hr_manager > hr_payroll_manager > hr_payroll_user > employee`). Every route must explicitly list every role it wants to allow; forgetting to list `admin` on a new route would lock out admins too. Grep for `requireRole(` before assuming "admin can do everything."
- **Self-elevation guards**: `updateUserRole`, `deactivateUser`, `reactivateUser` all explicitly reject `actorId === targetUserId` — the only place self-action protection is hand-coded; nothing else in the codebase has an equivalent pattern (e.g. nothing stops an admin from deactivating themselves via a different endpoint if one existed).
- **Sandboxed formula evaluation** (`safeFormula.js`): allowlist-of-characters regex (`/^[a-z0-9_ +\-*/().]+$/i` — no brackets, no semicolons, no `%`/`^`) plus a blocklist substring check (`require`, `import`, `process`, `global`, `eval`, `Function`, `__proto__`, `constructor`) evaluated via `new Function(...)`. This is defense-in-depth, **not** a true sandbox (no `vm` module, no scope isolation) — it relies on the character allowlist making prototype-chain/global-scope escapes syntactically impossible to write, not on runtime containment. Only touch this file with extreme care; any relaxation of the character allowlist needs security review.
- **Known gaps** (documented here so they're deliberate-and-tracked, not undiscovered):
  - `POST /api/dashboard/audit-logs` has **no authentication or role check at all**. It's designed for the Python `ai-service` to call server-to-server, but as written, anyone who can reach the API can write arbitrary `audit_logs` rows (including forging an `ai_flag` entry that would show up in the dashboard's warnings feed). If this API is ever exposed beyond a trusted internal network, this needs at minimum a shared-secret header check.
  - `GET /api/payroll/payslips/:id`, `/:id/explanation`, and `/:id/pdf` only require `authenticate` — **no `requireRole` and no ownership check**. Any authenticated user, including the `employee` role, can view or download *any* employee's payslip by guessing/incrementing the numeric ID. This is an access-control gap (not currently exploited by the frontend UI, which only links to a user's own payslips, but the API itself doesn't enforce that boundary).
  - CORS is wide open on both the Express API (`cors()` with no origin restriction) and the Python `ai-service` (`allow_origins=["*"]`). Fine for local/demo use; would need tightening before any production exposure.
- **Input validation**: every write endpoint validates its body with a zod schema before the controller calls the service layer; `ZodError`s are caught centrally in `errorHandler.js` and turned into a `400` with a per-field `{field, message}` array.
- **Passwords**: bcrypt (`bcryptRounds`, default 10), never logged or returned in API responses except the one-time `temporary_password` field on user/employee creation (explicitly documented in the response as needing to be shared securely and rotated on first login).

---

## 8. Known Issues / Bugs (as of this writing)

Documented rather than silently fixed, so they're tracked:

- **`PayslipView.jsx`** — the "Download PDF" button's `onClick={handleDownloadPDF}` references a function that is never defined anywhere in that file (no import, no local declaration). Clicking it throws a `ReferenceError`. A working implementation of the same feature already exists in `PayrunWizard.jsx` (blob-fetch `GET /payroll/payslips/:id/pdf`, trigger a client-side download) and should be ported over.
- **`anomaly.py` docstring/implementation mismatch** — the module comment describes statistical (stddev-based) outlier detection; the actual check is a flat ₹150,000 net-salary threshold.
- **Dashboard filter no-ops** — `dept`/`period_start`/`period_end` are sent by the frontend on every dashboard panel request, but `salary-trend`, `attendance-overview`, and `time-off-overview` ignore all of them server-side, and `salary-by-department` ignores `dept` specifically. The UI doesn't currently indicate which filters are "live" per panel.
- **`OperationsCharts.jsx`** — fetches `takenDays`/`total_days_taken` for the time-off pie chart but never renders it anywhere (dead data, not a functional bug).

---

## 9. Scalability Note (unchanged from original design intent)

Modules are already logically isolated with their own tables and service boundaries — going from this monolith to microservices means each `modules/<name>` folder becomes its own service, with the repository layer swapping from direct SQL to an HTTP/gRPC client against the same interface. The `ai-service` already proves this pattern works, deployed as a separate process today. `payslip_lines` and `attendances` are the two highest-growth tables, both already period/employee-indexed and ready to partition by period if volume grows. The in-memory AI rate-limiter/cache/usage-logger (`aiProtections.js`) is the one piece of state that would need to move to a shared store (Redis, etc.) before running more than one backend instance — as written, each instance has its own independent rate limit and cache.
