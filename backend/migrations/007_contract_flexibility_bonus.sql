-- A 'rigid' contract's core terms (wage/dates/structure) become immutable after creation.
-- A joining bonus, paid out once as an extra line on the employee's first payslip.
-- joining_bonus_payslip_id (rather than a plain boolean) records *which* payslip carried the
-- bonus, so recomputing that same payslip (draft -> computed) can keep re-adding the line
-- idempotently without ever paying the bonus out on a second payslip.
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS flexibility VARCHAR(20) NOT NULL DEFAULT 'flexible'
    CHECK (flexibility IN ('flexible', 'rigid')),
  ADD COLUMN IF NOT EXISTS joining_bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  DROP COLUMN IF EXISTS joining_bonus_paid,
  ADD COLUMN IF NOT EXISTS joining_bonus_payslip_id INT REFERENCES payslips(id);
