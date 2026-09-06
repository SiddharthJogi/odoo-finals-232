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

async function updateStructure(id, { name, status }) {
  const fields = [];
  const values = [];
  let paramIdx = 1;
  if (name !== undefined) { fields.push(`name = $${paramIdx++}`); values.push(name); }
  if (status !== undefined) { fields.push(`status = $${paramIdx++}`); values.push(status); }

  if (fields.length === 0) return findStructureById(id);

  values.push(id);
  const { rows } = await db.query(
    `UPDATE salary_structures SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    values
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
    `SELECT p.*, e.name AS employee_name, e.email AS employee_email
     FROM payslips p JOIN employees e ON p.employee_id = e.id
     WHERE p.payrun_id = $1
     ORDER BY e.name`,
    [payrunId]
  );
  return rows;
}

async function findPayslipById(id) {
  const { rows } = await db.query(
    `SELECT p.*, e.name AS employee_name, e.email AS employee_email
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

async function findPayrollInputs(employeeId, periodStart, periodEnd) {
  const { rows } = await db.query(
    `SELECT
       (SELECT COUNT(*)
        FROM generate_series($2::date, $3::date, interval '1 day') AS days(day)
        WHERE EXTRACT(ISODOW FROM days.day) < 6) AS period_working_days,
       (SELECT COUNT(DISTINCT DATE(a.check_in))
        FROM attendances a
        WHERE a.employee_id = $1
          AND a.check_in >= $2::date
          AND a.check_in < ($3::date + interval '1 day')
          AND a.check_in::date
            NOT IN (SELECT r.start_date + series.day
                    FROM time_off_requests r
                    CROSS JOIN LATERAL generate_series(0, r.duration::int - 1) AS series(day)
                    WHERE r.employee_id = $1 AND r.status = 'approved'
                      AND r.start_date <= $3::date AND r.end_date >= $2::date)) AS attendance_days,
       (SELECT COALESCE(SUM(a.worked_hours), 0)
        FROM attendances a
        WHERE a.employee_id = $1
          AND a.check_in >= $2::date
          AND a.check_in < ($3::date + interval '1 day')) AS attendance_hours,
       (SELECT COALESCE(SUM(
          (SELECT COUNT(*)
           FROM generate_series(GREATEST(r.start_date, $2::date), LEAST(r.end_date, $3::date), interval '1 day') AS days(day)
           WHERE EXTRACT(ISODOW FROM days.day) < 6)
        ), 0)
        FROM time_off_requests r
        JOIN time_off_types t ON t.id = r.type_id
        WHERE r.employee_id = $1 AND r.status = 'approved'
          AND t.affects_payroll = false
          AND r.start_date <= $3::date AND r.end_date >= $2::date) AS paid_leave_days,
       (SELECT COALESCE(SUM(
          (SELECT COUNT(*)
           FROM generate_series(GREATEST(r.start_date, $2::date), LEAST(r.end_date, $3::date), interval '1 day') AS days(day)
           WHERE EXTRACT(ISODOW FROM days.day) < 6)
        ), 0)
        FROM time_off_requests r
        JOIN time_off_types t ON t.id = r.type_id
        WHERE r.employee_id = $1 AND r.status = 'approved'
          AND t.affects_payroll = true
          AND r.start_date <= $3::date AND r.end_date >= $2::date) AS unpaid_leave_days`,
    [employeeId, periodStart, periodEnd]
  );
  return rows[0];
}

async function updatePayslipCalculation(id, data, client) {
  const queryFn = client || db;
  const { rows } = await queryFn.query(
    `UPDATE payslips
     SET worked_days = $1, gross_total = $2, net_total = $3,
         has_warning = $4, warning_reason = $5
     WHERE id = $6
     RETURNING *`,
    [data.worked_days, data.gross_total, data.net_total, data.has_warning || false,
     data.warning_reason || null, id]
  );
  return rows[0] || null;
}

async function deletePayslipLines(payslipId, client) {
  const queryFn = client || db;
  await queryFn.query('DELETE FROM payslip_lines WHERE payslip_id = $1', [payslipId]);
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
    SELECT DISTINCT e.id, e.name, e.email, e.employee_type, e.bank_account, 
      c.id AS contract_id, c.wage, TO_CHAR(c.start_date, 'YYYY-MM-DD') AS contract_start_date,
      ws.name AS working_schedule_name
    FROM employees e
    JOIN contracts c ON c.employee_id = e.id
    LEFT JOIN working_schedules ws ON e.schedule_id = ws.id
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
  updateStructure,
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
  findPayrollInputs,
  updatePayslipCalculation,
  deletePayslipLines,
  findPayslipLines,
  insertPayslipLine,
  findEligibleEmployees,
  findExistingPayslip,
};
