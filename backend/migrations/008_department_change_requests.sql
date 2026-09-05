-- Department reassignment must go through an admin-approved request rather than
-- writing employees.department_id directly.
CREATE TABLE IF NOT EXISTS department_change_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  current_department_id INT REFERENCES departments(id),
  requested_department_id INT NOT NULL REFERENCES departments(id),
  requested_by INT NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, approved, rejected
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_department_change_requests_employee ON department_change_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_department_change_requests_status ON department_change_requests(status);
