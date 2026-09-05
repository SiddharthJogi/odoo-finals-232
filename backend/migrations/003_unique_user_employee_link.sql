-- A provisioned employee may have at most one login account.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_employee_id
  ON users (employee_id)
