-- Link legacy accounts before enforcing the required user-to-employee relationship.
INSERT INTO employees (name, email, status)
SELECT split_part(u.email, '@', 1), u.email, 'active'
FROM users u
WHERE u.employee_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.email = u.email
  );

UPDATE users u
SET employee_id = e.id
FROM employees e
WHERE u.employee_id IS NULL
  AND e.email = u.email;

ALTER TABLE users
  ALTER COLUMN employee_id SET NOT NULL;