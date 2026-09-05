# PeoplePay360 — Data Model & API Contract (Current State)

> This reflects the schema as it exists after migrations `001`–`011` and the API surface as currently routed. For narrative explanation of *why* things work this way (rigid contracts, joining bonus, night shifts, AI fallback chain, security gaps), see `ARCHITECTURE.md` — this file is the terse reference. The original "lock this at Hour 1" framing no longer applies; schema changes now go through `backend/migrations/<next-number>_<name>.sql`, one file per logical change, forward-only, and every file must be idempotent (`IF NOT EXISTS` / backfill-then-constrain) since there is no migration-tracking table — `npm run migrate` re-runs every file every time.

---

## 1. Entity Relationship Overview

```
Role ──< User >── Employee ──< Contract >── SalaryStructure ──< SalaryRule
                     │  │                                          │
                     │  └──< WorkingSchedule >── ScheduleLine       │
                     │                                              │
                     ├──< Attendance                                │
                     ├──< Allocation >── TimeOffType                │
                     ├──< TimeOffRequest ──> TimeOffType            │
                     ├──< DepartmentChangeRequest                   │
                     │                                              │
Department ──< Employee (self-FK manager_id)                        │
           ──< DepartmentChangeRequest (current + requested dept)   │
                                                                     │
Payrun ──< Payslip >── Contract                                     │
              │                                                     │
              └──< PayslipLine >── SalaryRule (nullable FK)──────────┘

AuditLog (references any entity by type+id, written by API + AI service)
```

## 2. Schema (PostgreSQL DDL, cumulative through migration 011)

```sql
-- Auth & RBAC
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,        -- admin, hr_manager, hr_payroll_manager, hr_payroll_user, employee
  permissions JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  employee_id INT NOT NULL REFERENCES employees(id),   -- NOT NULL since migration 005; every login maps to an employee
  is_active BOOLEAN NOT NULL DEFAULT true,
  onboarding_seen_at TIMESTAMPTZ,                       -- migration 009; null until first-login tour is dismissed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- uq_users_employee_id: UNIQUE INDEX on employee_id (migration 003) — one login per employee.

-- Org structure
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  parent_id INT REFERENCES departments(id)
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department_id INT REFERENCES departments(id),          -- only ever written by the approval workflow below or at creation
  manager_id INT REFERENCES employees(id),
  job_position VARCHAR(120),
  schedule_id INT REFERENCES working_schedules(id),
  employee_type VARCHAR(30) NOT NULL DEFAULT 'full_time', -- full_time, contract, part_time
  bank_account VARCHAR(60) NOT NULL,                      -- NOT NULL since migration 011; legacy nulls backfilled to 'PENDING'
  status VARCHAR(20) NOT NULL DEFAULT 'active',           -- active, archived — employment status, NOT daily presence
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- is_present (not a column): computed at query time in hrCore.repository.findAllEmployees via an
-- EXISTS(attendances WHERE check_in::date = CURRENT_DATE AND status IN ('in_progress','done')) subquery.

-- Department change approval workflow (migration 008)
CREATE TABLE department_change_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  current_department_id INT REFERENCES departments(id),
  requested_department_id INT NOT NULL REFERENCES departments(id),
  requested_by INT NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',            -- draft, approved, rejected
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Working Schedule
CREATE TABLE working_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  calendar_type VARCHAR(30) NOT NULL DEFAULT 'standard',  -- standard, flexible, shift
  company_id INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  grace_period_minutes INT NOT NULL DEFAULT 15,           -- migration 006
  overtime_buffer_minutes INT NOT NULL DEFAULT 15,        -- migration 006
  target_weekly_hours NUMERIC(6,2)                        -- migration 006; only meaningful for calendar_type='flexible'
);

CREATE TABLE schedule_lines (
  id SERIAL PRIMARY KEY,
  schedule_id INT NOT NULL REFERENCES working_schedules(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,                                  -- may be <= start_time for a 'shift' schedule (overnight line)
  break_minutes INT NOT NULL DEFAULT 0
  -- weekly hours = computed in service layer, rolling end_time into the next day when end <= start.
  -- 'flexible' schedules have zero rows here — see target_weekly_hours above instead.
);

-- Payroll configuration (must exist before contracts reference it)
CREATE TABLE salary_structures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  company_id INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE salary_rules (
  id SERIAL PRIMARY KEY,
  structure_id INT NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(40) NOT NULL,                  -- referenced by other rules / formulas, unique per structure
  category VARCHAR(20) NOT NULL,              -- basic, allowance, deduction, gross, net
                                               -- NOTE: only 'basic'/'allowance' feed gross_total, only 'deduction' feeds
                                               -- the deduction subtracted for net_total — 'gross'/'net' categories are
                                               -- informational line items only, see ARCHITECTURE.md §2.3.
  sequence INT NOT NULL,                      -- execution + dependency order — a rule can reference any earlier rule's code
  calc_method VARCHAR(20) NOT NULL,           -- fixed, percentage, formula
  amount NUMERIC(12,4),                       -- used by fixed/percentage
  base_code VARCHAR(40),                      -- used by percentage, e.g. 'BASIC' or 'GROSS' — must have already run
  formula_text TEXT,                          -- used by formula, sandboxed eval (see ARCHITECTURE.md §7)
  UNIQUE(structure_id, code)
);

-- Contracts
CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  department_id INT REFERENCES departments(id),
  job_position VARCHAR(120),
  wage NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,                              -- NULL = open-ended
  structure_id INT NOT NULL REFERENCES salary_structures(id),
  schedule_id INT REFERENCES working_schedules(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, cancelled, archived
  flexibility VARCHAR(20) NOT NULL DEFAULT 'flexible'
    CHECK (flexibility IN ('flexible', 'rigid')),        -- migration 007
  joining_bonus NUMERIC(12,2) NOT NULL DEFAULT 0,          -- migration 007
  joining_bonus_payslip_id INT REFERENCES payslips(id),    -- migration 007; set once the bonus has been paid out
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- App-level invariant (enforced in service layer, not a DB constraint):
-- no two 'active' contracts for the same employee_id may have overlapping [start_date, end_date] ranges.
-- App-level invariant (enforced in service layer): a 'rigid' contract's wage/start_date/end_date/structure_id
-- cannot change via update — only status transitions remain possible.

-- Attendance
CREATE TABLE attendances (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  worked_hours NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE WHEN check_out IS NOT NULL
      THEN EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0
      ELSE NULL END
  ) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, done, corrected, flagged
  corrected_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- is_late / late_minutes / overtime_hours are NEVER stored — always computed at read time in
-- timeOps.service.js#decorateAttendanceSchedule, joined against the employee's working_schedules
-- row for grace_period_minutes/overtime_buffer_minutes and schedule_lines for the matching day-of-week.
-- An employee with no schedule_id gets is_late:false / overtime_hours:0 (never borrows another schedule).

-- Time Off
CREATE TABLE time_off_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(10) NOT NULL DEFAULT 'days',   -- days, hours
  requires_allocation BOOLEAN NOT NULL DEFAULT true,
  affects_payroll BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE allocations (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  type_id INT NOT NULL REFERENCES time_off_types(id),
  allocated NUMERIC(6,2) NOT NULL,
  taken NUMERIC(6,2) NOT NULL DEFAULT 0,
  remaining NUMERIC(6,2) GENERATED ALWAYS AS (allocated - taken) STORED,
  valid_from DATE NOT NULL,
  valid_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'approved'
);

CREATE TABLE time_off_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  type_id INT NOT NULL REFERENCES time_off_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration NUMERIC(6,2) NOT NULL,             -- auto-calculated (weekdays only) unless caller passes duration < 1
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, approved, refused
  approved_by INT REFERENCES users(id),
  is_deferred BOOLEAN NOT NULL DEFAULT false,       -- migration 002
  deferred_to_date DATE,                             -- migration 002
  responsible_id INT REFERENCES users(id),           -- migration 002
  deferral_reason TEXT,                              -- migration 002
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- on status -> 'approved' AND type.requires_allocation = true:
--   UPDATE allocations SET taken = taken + duration WHERE employee_id=... AND type_id=... (transaction)
-- on creation, if start_date falls inside an already validated/paid payrun period:
--   is_deferred=true, deferred_to_date = that payrun's period_end + 1 day, deferral_reason explains why.

-- Payroll processing
CREATE TABLE payruns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  structure_id INT NOT NULL REFERENCES salary_structures(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  employee_type_filter VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft -> computed -> validated -> paid (enforced state machine)
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payslips (
  id SERIAL PRIMARY KEY,
  payrun_id INT NOT NULL REFERENCES payruns(id) ON DELETE CASCADE,
  employee_id INT NOT NULL REFERENCES employees(id),
  contract_id INT NOT NULL REFERENCES contracts(id),
  worked_days NUMERIC(6,2),
  gross_total NUMERIC(12,2),
  net_total NUMERIC(12,2),
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, computed, validated, paid
  has_warning BOOLEAN NOT NULL DEFAULT false,
  warning_reason TEXT,
  UNIQUE(payrun_id, employee_id)               -- structural duplicate-payslip prevention
);

CREATE TABLE payslip_lines (
  id SERIAL PRIMARY KEY,
  payslip_id INT NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  rule_id INT REFERENCES salary_rules(id),     -- nullable since migration 010, for the injected joining-bonus line
  label VARCHAR(120) NOT NULL,
  category VARCHAR(20) NOT NULL,
  sequence INT NOT NULL,
  value NUMERIC(12,2) NOT NULL
);
-- A line with rule_id IS NULL is always the injected one-time "Joining Bonus" line (category='allowance'),
-- never a rule-engine output — see contracts.joining_bonus_payslip_id above.

-- Cross-cutting: audit + AI
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(50) NOT NULL,                -- create, update, approve, mark_paid, ai_flag, auto_deduct, defer_time_off, ...
  entity VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  note TEXT,                                   -- e.g. AI anomaly explanation, deferral reason
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Written by: the Express API (department approval, time-off approve/refuse/auto-deduct, defer) AND
-- POST /api/dashboard/audit-logs, which is CALLED BY THE PYTHON ai-service and has NO auth middleware
-- of its own (see ARCHITECTURE.md §7 — known gap, not yet a shared-secret-protected endpoint).
```

## 3. REST API Contract

All routes prefixed `/api`. Auth via `Authorization: Bearer <JWT>` unless marked public. Role column = allowed roles (flat allowlist, no implicit hierarchy — see `ARCHITECTURE.md` §7).

### Auth & Users (`hr-core`)
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | returns `{token, user: {id, email, role, employeeId}}` |
| GET | `/users/me` | any authenticated | includes `onboarding_seen_at` |
| PATCH | `/users/me/password` | any authenticated | `{current_password, new_password}` |
| PATCH | `/users/me/onboarding-seen` | any authenticated | sets `onboarding_seen_at = now()` |
| GET | `/users` | admin | |
| POST | `/users` | admin | link an *existing* employee to a new login (no dedicated UI; provisioning UI uses `/employees/provision` instead) |
| PATCH | `/users/:id/role` | admin | rejects if `id === req.user.id` |
| DELETE | `/users/:id` | admin | deactivate; rejects if `id === req.user.id` |
| POST | `/users/:id/reactivate` | admin | rejects if `id === req.user.id`; generates a new temp password |
| GET | `/roles` | admin | |

### HR Core — Departments, Employees, Contracts, Schedules
| Method | Path | Role | Notes |
|---|---|---|---|
| GET/POST | `/departments` | read: admin/hr_manager/hr_payroll_manager/hr_payroll_user; write: admin/hr_manager | |
| GET | `/employees` | admin, hr_manager, hr_payroll_manager, hr_payroll_user | **paginated**: `?page=&limit=&search=&department_id=&status=&employee_type=` → `{data, total, page, limit}` |
| GET | `/employees/:id` | any authenticated | includes `department_name` (joined) |
| POST | `/employees` | admin, hr_manager | direct create, no login account |
| POST | `/employees/provision` | admin, hr_manager | create employee + login account together, emails (or returns) temp credentials |
| PUT | `/employees/:id` | admin, hr_manager | `department_id` is structurally rejected — see workflow below |
| POST | `/employees/:id/department-requests` | admin, hr_manager | creates a `draft` request |
| GET | `/department-requests` | admin, hr_manager | `?status=&employee_id=` |
| PATCH | `/department-requests/:id/approve` | admin only | transactional: applies `department_id` + audit log |
| PATCH | `/department-requests/:id/reject` | admin only | |
| GET | `/contracts` | admin, hr_manager, hr_payroll_manager, hr_payroll_user | all contracts |
| GET | `/contracts/:id` | same | |
| GET | `/employees/:id/contracts` | any authenticated | |
| POST | `/contracts` | admin, hr_manager | validates no overlapping active contract |
| PUT | `/contracts/:id` | admin, hr_manager | rejects wage/date/structure changes if `flexibility='rigid'` |
| PATCH | `/contracts/:id/status` | admin, hr_manager | |
| GET | `/schedules` | admin, hr_manager, hr_payroll_manager, hr_payroll_user | |
| GET | `/schedules/:id` | any authenticated | includes computed `weekly_hours` + `lines` |
| POST | `/schedules` | admin, hr_manager | `calendar_type='flexible'` requires `target_weekly_hours`; others require ≥1 line |
| PUT | `/schedules/:id` | admin, hr_manager | |
| DELETE | `/schedules/:id` | admin, hr_manager | archives (soft-delete) |

### Time Ops
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/attendance` | admin, hr_manager, hr_payroll_manager, hr_payroll_user, employee (self only) | `?employee_id=&status=&date_from=&date_to=` |
| GET | `/attendance/active` | any authenticated | current open attendance for self (or `?employee_id=` for managers) |
| POST | `/attendance` | admin, hr_manager | direct insert, no schedule decoration on the response |
| POST | `/attendance/check-in` | any authenticated | rejects if an open attendance already exists |
| POST | `/attendance/check-out` | any authenticated | rejects if no open attendance |
| PATCH | `/attendance/:id` | admin, hr_manager | correction; rejects `check_out <= check_in` |
| GET/POST | `/time-off/types` | admin, hr_manager | |
| GET/POST | `/time-off/allocations` | read: any (self-filtered for `employee` role); write: admin, hr_manager | |
| GET/POST | `/time-off/requests` | create own (any role); managers can create on behalf of another employee | |
| GET | `/time-off/responsible-users` | any authenticated | admins/hr_manager/hr_payroll_manager, for the deferred-time-off "responsible person" field |
| PATCH | `/time-off/requests/:id/approve` \| `/refuse` | admin, hr_manager | transactional allocation adjustment + audit log |

### Payroll
| Method | Path | Role | Notes |
|---|---|---|---|
| GET/POST | `/payroll/structures` | read: +hr_payroll_user/hr_manager; write: admin/hr_payroll_manager | |
| PUT | `/payroll/structures/:id` | admin, hr_payroll_manager | |
| GET/POST | `/payroll/rules` | read: +hr_payroll_user/hr_manager; write: admin/hr_payroll_manager | |
| PUT/DELETE | `/payroll/rules/:id` | admin, hr_payroll_manager | |
| GET | `/payroll/payruns` | admin, hr_payroll_manager, hr_payroll_user, hr_manager | |
| GET | `/payroll/payruns/:id` | same | payrun + its payslips composed together |
| GET | `/payroll/payruns/:id/payslips` | same | |
| POST | `/payroll/payruns/draft` | admin, hr_payroll_manager, hr_payroll_user | step 1: scope+period → eligible employees |
| POST | `/payroll/payruns` | admin, hr_payroll_manager, hr_payroll_user | step 2: creates payrun + payslips (injects joining bonus where applicable) |
| PATCH | `/payroll/payruns/:id/compute` \| `/validate` \| `/mark-paid` | admin, hr_payroll_manager, hr_payroll_user | enforced state machine; `validate` fires async AI anomaly scan (fire-and-forget) |
| POST | `/payroll/payruns/:id/send-payslips` | admin, hr_payroll_manager | bulk PDF-generate + email, per-recipient failure non-fatal |
| GET | `/payroll/payslips/:id` | **any authenticated — no ownership check** | ⚠ see `ARCHITECTURE.md` §7 |
| GET | `/payroll/payslips/:id/explanation` | **any authenticated — no ownership check** | AI-copilot-style breakdown, computed from stored totals (no LLM call) |
| GET | `/payroll/payslips/:id/pdf` | **any authenticated — no ownership check** | streams PDF |

### Dashboard (read-only aggregates, no owned tables)
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/dashboard/summary` | admin, hr_manager, hr_payroll_manager, hr_payroll_user | `?period_start=&period_end=&department_id=&employee_type=` — `company_id` accepted but unused |
| GET | `/dashboard/salary-by-department` | same | only `period_start`/`period_end` honored, `dept` filter ignored |
| GET | `/dashboard/salary-trend` | same | **no params honored** |
| GET | `/dashboard/attendance-overview` | same | **no params honored**, fixed trailing-30-day window |
| GET | `/dashboard/time-off-overview` | same | **no params honored** |
| GET | `/dashboard/warnings` | same | payslip warnings + `ai_flag` audit-log entries, 50 each |
| POST | `/dashboard/audit-logs` | **⚠ no auth middleware at all** | called by the Python `ai-service` to record anomaly findings |

### AI (Node bridge, `/api/ai/*`) — what the frontend actually calls
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/ai/query` | any authenticated | `{question}` (2–300 chars) → rate-limited (10/min/user) → cached (10 min) → intent-classified (Python service, local fallback) → DB data fetched → Gemini-composed answer (template fallback) |
| POST | `/ai/anomaly-scan` | any authenticated | proxies to Python `ai-service`; forwards `Authorization` header |
| GET | `/ai/forecast` | any authenticated | proxies to Python `ai-service`; JS-side linear approximation fallback if unreachable |
| GET | `/ai/usage-stats` | any authenticated | in-memory telemetry: query counts, cache hit rate, avg latency, recent log entries |

### AI Service (Python, separate process, called server-to-server by the Node `ai` module — never called directly by the frontend)
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | |
| POST | `/ai/query` | `{question}` → `{intent, params}` — keyword classification only, **no LLM call happens here** |
| POST | `/ai/anomaly-scan` | `{payrun_id}`, forwards `Authorization` → fetches payslips from the Node API, flags duplicates / >₹150,000 net-salary outliers / missing bank info, POSTs each finding to the Node API's unauthenticated `/dashboard/audit-logs` |
| GET | `/ai/forecast` | linear regression over `GET /dashboard/salary-trend`; silently substitutes a hardcoded 2-point stub dataset if that call fails |

## 4. Seed Data

`npm run seed` (`backend/scripts/seed.js`) creates, via the same service-layer/schema-respecting inserts the app uses: an admin user, 3 departments, ~15+ employees with realistic names, 1–2 contracts each, 1 working schedule assigned to all, ~2 weeks of attendance, a couple of time-off types + allocations + requests (mix of approved/pending), one salary structure with rule set (Basic formula off `contract_wage`, HRA %, Transport fixed, PF deduction %, Net formula), and at least one fully processed (paid) payrun so the dashboard has real historical data on first run. Every seeded employee is created with a real (non-`'PENDING'`) `bank_account` so the migration-011 backfill placeholder only ever shows up for genuinely legacy/incomplete rows.
