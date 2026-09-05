-- Ensure the standard basic salary rule uses the payroll-adjusted contract wage.
UPDATE salary_rules
SET calc_method = 'formula', amount = NULL, formula_text = 'contract_wage'
WHERE code = 'BASIC'
  AND (formula_text = 'contract_wage' OR amount IS NULL);