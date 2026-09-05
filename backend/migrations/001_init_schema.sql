-- PeoplePay360: Initial Schema
-- See DATA_MODEL_AND_API.md for full documentation

-- Auth & RBAC
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'
);

-- Seed the 5 required roles
INSERT INTO roles (name, permissions) VALUES
  ('admin', '{"all": true}'),
  ('hr_manager', '{"employees": true, "contracts": true, "attendance": true, "time_off": true, "schedules": true, "departments": true}'),
  ('hr_payroll_manager', '{"payroll": true, "structures": true, "rules": true, "payruns": true}'),
  ('hr_payroll_user', '{"payroll_read": true, "payruns": true}'),
  ('employee', '{"self": true}');

-- Working Schedule (must exist before employees reference it)
CREATE TABLE working_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  calendar_type VARCHAR(30) NOT NULL DEFAULT 'standard',
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
  employee_type VARCHAR(30) NOT NULL DEFAULT 'full_time',
  bank_account VARCHAR(60),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  employee_id INT REFERENCES employees(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  code VARCHAR(40) NOT NULL,
  category VARCHAR(20) NOT NULL,
  sequence INT NOT NULL,
  calc_method VARCHAR(20) NOT NULL,
  amount NUMERIC(12,4),
  base_code VARCHAR(40),
  formula_text TEXT,
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
  end_date DATE,
  structure_id INT NOT NULL REFERENCES salary_structures(id),
  schedule_id INT REFERENCES working_schedules(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  corrected_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time Off
CREATE TABLE time_off_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(10) NOT NULL DEFAULT 'days',
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
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  approved_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll processing
CREATE TABLE payruns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  structure_id INT NOT NULL REFERENCES salary_structures(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  employee_type_filter VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
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
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  has_warning BOOLEAN NOT NULL DEFAULT false,
  warning_reason TEXT,
  UNIQUE(payrun_id, employee_id)
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
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Useful indexes
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_contracts_employee ON contracts(employee_id);
CREATE INDEX idx_contracts_active_period ON contracts(employee_id, status, start_date, end_date);
CREATE INDEX idx_attendances_employee_date ON attendances(employee_id, check_in);
CREATE INDEX idx_time_off_requests_employee ON time_off_requests(employee_id);
CREATE INDEX idx_payslips_payrun ON payslips(payrun_id);
CREATE INDEX idx_payslip_lines_payslip ON payslip_lines(payslip_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
