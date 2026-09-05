ALTER TABLE salary_rules
  ADD COLUMN IF NOT EXISTS performance_based BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_salary_rules_performance_based
  ON salary_rules(structure_id)
  WHERE performance_based IS NOT NULL;