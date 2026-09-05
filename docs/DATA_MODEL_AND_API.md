# PeoplePay360 — Data Model & API Contract

> **Lock this file at Hour 1. All 4 devs build against it in parallel. Any schema change after Hour 4 must be announced in the team channel and migrated via a new file in `backend/migrations/`.**

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
                     │                                              │
Department ──< Employee (self-FK manager_id)                        │
                                                                     │
Payrun ──< Payslip >── Contract                                     │
              │                                                     │
              └──< PayslipLine >── SalaryRule ───────────────────────┘

AuditLog (references any entity by type+id, written by API + AI service)
```

## 2. Schema (PostgreSQL DDL)

```sql
-- Auth & RBAC
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,        -- admin, hr_manager, hr_payroll_user, hr_payroll_manager, employee
  permissions JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  employee_id INT REFERENCES employees(id),  -- nullable: admin may not be an employee
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  department_id INT REFERENCES departments(id),
  manager_id INT REFERENCES employees(id),
  job_position VARCHAR(120),
  schedule_id INT REFERENCES working_schedules(id),
  employee_type VARCHAR(30) NOT NULL DEFAULT 'full_time', -- full_time, contract, part_time
  bank_account VARCHAR(60),                 -- nullable on purpose -> drives "missing bank info" warning
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Working Schedule
CREATE TABLE working_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  calendar_type VARCHAR(30) NOT NULL DEFAULT 'standard', -- standard, flexible, shift
  company_id INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE schedule_lines (
  id SERIAL PRIMARY KEY,
  schedule_id INT NOT NULL REFERENCES working_schedules(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT NOT NULL DEFAULT 0
  -- weekly hours = computed in service layer: SUM((end_time - start_time) - break) across rows
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
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- App-level invariant (enforced in service layer transaction, documented here):
-- no two 'active' contracts for the same employee_id may have overlapping [start_date, end_date] ranges.

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
  duration NUMERIC(6,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, approved, refused
  approved_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- on status -> 'approved' AND type.requires_allocation = true:
--   UPDATE allocations SET taken = taken + duration WHERE employee_id=... AND type_id=... (transaction)

-- Payroll configuration
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
  sequence INT NOT NULL,
  calc_method VARCHAR(20) NOT NULL,           -- fixed, percentage, formula
  amount NUMERIC(12,4),                       -- used by fixed/percentage
  base_code VARCHAR(40),                      -- used by percentage, e.g. 'BASIC' or 'GROSS'
  formula_text TEXT,                          -- used by formula, sandboxed eval
  UNIQUE(structure_id, code)
);

-- Payroll processing
CREATE TABLE payruns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  structure_id INT NOT NULL REFERENCES salary_structures(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  employee_type_filter VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, computed, validated, paid
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
  rule_id INT NOT NULL REFERENCES salary_rules(id),
  label VARCHAR(120) NOT NULL,
  category VARCHAR(20) NOT NULL,
  sequence INT NOT NULL,
  value NUMERIC(12,2) NOT NULL
);

-- Cross-cutting: audit + AI
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(50) NOT NULL,                -- create, update, approve, mark_paid, ai_flag
  entity VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  note TEXT,                                   -- e.g. AI anomaly explanation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. REST API Contract

All routes prefixed `/api`. Auth via `Authorization: Bearer <JWT>`. Role column = minimum role required.

### Auth & Users (Dev 1)
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | returns JWT + role |
| POST | `/users` | admin | create user, link employee, assign role |
| PATCH | `/users/:id/role` | admin | reassign role — **never** callable on own user id |
| GET | `/users/me` | any | own profile |

### HR Core (Dev 1)
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/employees` | hr_manager+ | list, filter by dept/status; kanban/list both hit this |
| GET | `/employees/:id` | hr_manager+ / self | full profile incl. smart-button counts |
| POST/PUT | `/employees` / `/employees/:id` | hr_manager+ | |
| GET | `/employees/:id/contracts` | hr_manager+ / self | |
| POST | `/contracts` | hr_manager+ | validates no overlapping active contract |
| GET/POST | `/schedules`, `/schedules/:id` | hr_manager+ | weekly hours computed server-side |

### Time Ops (Dev 2)
| Method | Path | Role | Notes |
|---|---|---|---|
| GET/POST | `/attendance` | hr_manager+ / self (own only) | |
| POST | `/attendance/check-in`, `/attendance/check-out` | any employee | powers the popup widget |
| GET/POST | `/time-off/types` | hr_manager+ | |
| GET/POST | `/time-off/allocations` | hr_manager+ / self (read) | |
| GET/POST | `/time-off/requests` | any (create own) | |
| PATCH | `/time-off/requests/:id/approve` \| `/refuse` | hr_manager+ | triggers allocation deduction transaction |

### Payroll (Dev 3)
| Method | Path | Role | Notes |
|---|---|---|---|
| GET/POST | `/payroll/structures`, `/payroll/rules` | hr_payroll_manager (write) / hr_payroll_user (read) | |
| POST | `/payroll/payruns/draft` | hr_payroll_user+ | step 1: scope+period → returns eligible employees |
| POST | `/payroll/payruns` | hr_payroll_user+ | step 2: creates payrun + payslips for selected employees |
| PATCH | `/payroll/payruns/:id/compute` \| `/validate` \| `/mark-paid` | hr_payroll_user+ | workflow transitions |
| GET | `/payroll/payslips/:id` | hr_payroll_user+ / self | full computation breakdown |
| GET | `/payroll/payslips/:id/pdf` | hr_payroll_user+ / self | streams generated PDF |
| POST | `/payroll/payruns/:id/send-payslips` | hr_payroll_manager | bulk email |

### Dashboard (Dev 4)
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/dashboard/summary?period=&dept=&type=&company=` | hr_manager+ | KPI cards, all filters combinable |
| GET | `/dashboard/salary-by-department` | hr_manager+ | chart data |
| GET | `/dashboard/salary-trend` | hr_manager+ | chart data |
| GET | `/dashboard/attendance-overview` | hr_manager+ | |
| GET | `/dashboard/time-off-overview` | hr_manager+ | |
| GET | `/dashboard/warnings` | hr_payroll_user+ | duplicate/missing-data/AI anomaly feed |

### AI Service (Dev 4, separate process, proxied through `/api/ai/*`)
| Method | Path | Notes |
|---|---|---|
| POST | `/ai/query` `{question}` | NL question → intent + params → API calls dashboard endpoints → natural-language answer |
| POST | `/ai/anomaly-scan` `{payrun_id}` | called async after Validate; writes `audit_logs` rows consumed by `/dashboard/warnings` |
| GET | `/ai/forecast` | simple trend projection over last N payruns' net totals |

## 4. Seed Data Requirement

`npm run seed` must create, via the same service-layer functions the app uses (not raw SQL inserts bypassing logic): 3 departments, ~15 employees with realistic names/roles, 1-2 contracts each (some with history), 1 working schedule assigned to all, ~2 weeks of attendance, a couple of time off types + allocations + requests (mix of approved/pending), one salary structure with 5 rules (Basic, HRA 20%, Transport Allowance fixed, PF Deduction 12%, Net formula), and one fully processed (paid) Payrun so the dashboard has real historical data to chart on first run.
