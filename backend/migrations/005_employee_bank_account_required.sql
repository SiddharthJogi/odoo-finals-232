-- Bank account becomes mandatory going forward. Backfill existing NULLs with a
-- clearly-fake placeholder so HR can find and correct them without breaking the constraint.
UPDATE employees SET bank_account = 'PENDING' WHERE bank_account IS NULL;
ALTER TABLE employees ALTER COLUMN bank_account SET NOT NULL;
