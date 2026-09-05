-- A provisioned employee may have at most one login account.
-- NULL employee_id remains allowed for unlinked admin/HR accounts.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_employee_id
  ON users (employee_id)
  WHERE employee_id IS NOT NULL;