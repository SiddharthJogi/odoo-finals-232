const db = require('../../db');

// ───────────── Salary Structures ─────────────
async function findAllStructures() {
  const { rows } = await db.query('SELECT * FROM salary_structures ORDER BY id');
  return rows;
}

async function findStructureById(id) {
  const { rows } = await db.query('SELECT * FROM salary_structures WHERE id = $1', [id]);
  return rows[0] || null;
}

async function insertStructure({ name, status }) {
  const { rows } = await db.query(
    'INSERT INTO salary_structures (name, status) VALUES ($1, $2) RETURNING *',
    [name, status || 'active']
  );
  return rows[0];
}

// ───────────── Salary Rules ─────────────
async function findRulesByStructure(structureId) {
  const { rows } = await db.query(
    'SELECT * FROM salary_rules WHERE structure_id = $1 ORDER BY sequence',
    [structureId]
  );
  return rows;
}

async function findRuleById(id) {
  const { rows } = await db.query('SELECT * FROM salary_rules WHERE id = $1', [id]);
  return rows[0] || null;
}

async function insertRule(data) {
  const { rows } = await db.query(
    `INSERT INTO salary_rules (structure_id, name, code, category, sequence, calc_method, amount, base_code, formula_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [data.structure_id, data.name, data.code, data.category, data.sequence,
     data.calc_method, data.amount || null, data.base_code || null, data.formula_text || null]
  );
  return rows[0];
}

async function updateRule(id, data) {
  const fields = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = $${idx++}`);
    params.push(value);
  }
  if (fields.length === 0) return findRuleById(id);
  params.push(id);

  const { rows } = await db.query(
    `UPDATE salary_rules SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function deleteRule(id) {
  const { rowCount } = await db.query('DELETE FROM salary_rules WHERE id = $1', [id]);
  return rowCount > 0;
}

// ───────────── Payruns ─────────────
async function findAllPayruns() {
  const { rows } = await db.query('SELECT * FROM payruns ORDER BY created_at DESC');
  return rows;
}

async function findPayrunById(id) {
  const { rows } = await db.query('SELECT * FROM payruns WHERE id = $1', [id]);
  return rows[0] || null;
}

async function insertPayrun(data) {
  const { rows } = await db.query(
    `INSERT INTO payruns (name, structure_id, period_start, period_end, employee_type_filter, status, created_by)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6)
     RETURNING *`,
    [data.name, data.structure_id, data.period_start, data.period_end,
     data.employee_type_filter || null, data.created_by]
  );
  return rows[0];
}

async function updatePayrunStatus(id, status, client) {
  const queryFn = client || db;
  const { rows } = await queryFn.query(
    'UPDATE payruns SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return rows[0] || null;
}

// ───────────── Payslips ─────────────
async function findPayslipsByPayrun(payrunId) {
  const { rows } = await db.query(
    `SELECT p.*, e.name AS employee_name
     FROM payslips p JOIN employees e ON p.employee_id = e.id
     WHERE p.payrun_id = $1
     ORDER BY e.name`,
    [payrunId]
  );
  return rows;
}

async function findPayslipById(id) {
  const { rows } = await db.query(
    `SELECT p.*, e.name AS employee_name
     FROM payslips p JOIN employees e ON p.employee_id = e.id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function insertPayslip(data, client) {
  const queryFn = client || db;
  const { rows } = await queryFn.query(
    `INSERT INTO payslips (payrun_id, employee_id, contract_id, worked_days, gross_total, net_total, status, has_warning, warning_reason)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)
     RETURNING *`,
    [data.payrun_id, data.employee_id, data.contract_id, data.worked_days,
     data.gross_total, data.net_total, data.has_warning || false, data.warning_reason || null]
  );
  return rows[0];
}

async function updatePayslipStatus(payrunId, status, client) {
  const queryFn = client || db;
  await queryFn.query(
    'UPDATE payslips SET status = $1 WHERE payrun_id = $2',
    [status, payrunId]
  );
}

// ───────────── Payslip Lines ─────────────
async function findPayslipLines(payslipId) {
  const { rows } = await db.query(
    'SELECT * FROM payslip_lines WHERE payslip_id = $1 ORDER BY sequence',
    [payslipId]
  );
  return rows;
}

async function insertPayslipLine(data, client) {
  const queryFn = client || db;
  const { rows } = await queryFn.query(
    `INSERT INTO payslip_lines (payslip_id, rule_id, label, category, sequence, value)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.payslip_id, data.rule_id, data.label, data.category, data.sequence,
     Math.round(data.value * 100) / 100]
  );
  return rows[0];
}

// ───────────── Eligible Employees (for draft step) ─────────────
async function findEligibleEmployees(structureId, periodStart, periodEnd, employeeTypeFilter) {
  let sql = `
    SELECT DISTINCT e.id, e.name, e.email, e.employee_type, e.bank_account, c.id AS contract_id, c.wage
    FROM employees e
    JOIN contracts c ON c.employee_id = e.id
    WHERE e.status = 'active'
      AND c.status = 'active'
      AND c.structure_id = $1
      AND c.start_date <= $3
      AND (c.end_date IS NULL OR c.end_date >= $2)`;
  const params = [structureId, periodStart, periodEnd];

  if (employeeTypeFilter) {
    sql += ` AND e.employee_type = $4`;
    params.push(employeeTypeFilter);
  }

  sql += ' ORDER BY e.name';
  const { rows } = await db.query(sql, params);
  return rows;
}

// ───────────── Duplicate check ─────────────
async function findExistingPayslip(payrunId, employeeId) {
  const { rows } = await db.query(
    'SELECT id FROM payslips WHERE payrun_id = $1 AND employee_id = $2',
    [payrunId, employeeId]
  );
  return rows[0] || null;
}

module.exports = {
  findAllStructures,
  findStructureById,
  insertStructure,
  findRulesByStructure,
  findRuleById,
  insertRule,
  updateRule,
  deleteRule,
  findAllPayruns,
  findPayrunById,
  insertPayrun,
  updatePayrunStatus,
  findPayslipsByPayrun,
  findPayslipById,
  insertPayslip,
  updatePayslipStatus,
  findPayslipLines,
  insertPayslipLine,
  findEligibleEmployees,
  findExistingPayslip,
};
