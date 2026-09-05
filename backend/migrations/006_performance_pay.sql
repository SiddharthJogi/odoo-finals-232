-- Performance-based pay: review scoring, payout rules, and auditable payroll adjustments.
CREATE TABLE performance_pay_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  point_value NUMERIC(12,2) NOT NULL CHECK (point_value >= 0),
  minimum_points NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (minimum_points BETWEEN 0 AND 100),
  maximum_payout NUMERIC(12,2) CHECK (maximum_payout IS NULL OR maximum_payout >= 0),
  maximum_wage_percent NUMERIC(6,2) CHECK (maximum_wage_percent IS NULL OR maximum_wage_percent >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE performance_reviews (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  reviewer_id INT NOT NULL REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  project_name VARCHAR(160),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  total_points NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (total_points BETWEEN 0 AND 100),
  performance_pay NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (performance_pay >= 0),
  pay_rule_id INT REFERENCES performance_pay_rules(id),
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE TABLE performance_review_lines (
  id SERIAL PRIMARY KEY,
  review_id INT NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  criterion VARCHAR(40) NOT NULL CHECK (criterion IN ('overtime', 'project_completion', 'quality', 'attendance')),
  score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 25),
  remarks TEXT,
  UNIQUE(review_id, criterion)
);

CREATE TABLE payroll_adjustments (
  id SERIAL PRIMARY KEY,
  payslip_id INT NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  employee_id INT NOT NULL REFERENCES employees(id),
  review_id INT NOT NULL REFERENCES performance_reviews(id),
  label VARCHAR(120) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payslip_id, review_id)
);

CREATE INDEX idx_performance_reviews_employee ON performance_reviews(employee_id, period_start, period_end);
CREATE INDEX idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX idx_performance_lines_review ON performance_review_lines(review_id);
CREATE INDEX idx_payroll_adjustments_payslip ON payroll_adjustments(payslip_id);

INSERT INTO performance_pay_rules (name, point_value, minimum_points, maximum_payout)
VALUES ('Standard Performance Pay', 100, 60, 10000);
