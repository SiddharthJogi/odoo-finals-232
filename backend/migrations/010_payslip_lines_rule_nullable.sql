-- Allow a payslip line that isn't produced by the rule engine (e.g. a one-time
-- joining bonus) to be inserted without fabricating a salary_rules row.
ALTER TABLE payslip_lines ALTER COLUMN rule_id DROP NOT NULL;
