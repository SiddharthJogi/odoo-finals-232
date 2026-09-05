ALTER TABLE salary_structures
  ADD COLUMN IF NOT EXISTS code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS pay_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'INR';

UPDATE salary_structures
SET code = 'STRUCT-' || id
WHERE code IS NULL;

ALTER TABLE salary_structures
  ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_salary_structures_code ON salary_structures(code);
