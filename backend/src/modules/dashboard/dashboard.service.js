const db = require('../../db');

/**
 * Dashboard service — read-only aggregate queries across all modules.
 * No owned tables; queries join across employee/payroll/attendance/time-off data.
 */

async function getSummary({ period_start, period_end, department_id, employee_type, company_id }) {
  const params = [];
  let idx = 1;

  // 1. Total employees
  let empSql = `SELECT COUNT(*) AS total_employees FROM employees WHERE status = 'active'`;
  if (department_id) { empSql += ` AND department_id = $${idx++}`; params.push(department_id); }
  if (employee_type) { empSql += ` AND employee_type = $${idx++}`; params.push(employee_type); }
  const empResult = await db.query(empSql, params.slice(0, idx - 1));

  // 2. Net & Gross salary paid in period
  const salaryParams = [];
  let sIdx = 1;
  let salarySql = `
    SELECT COALESCE(SUM(ps.net_total), 0) AS total_net_paid,
           COALESCE(SUM(ps.gross_total), 0) AS total_gross_paid,
           COUNT(ps.id) AS total_payslips
    FROM payslips ps
    JOIN payruns pr ON ps.payrun_id = pr.id
    JOIN employees e ON ps.employee_id = e.id
    WHERE pr.status = 'paid'`;
  if (period_start) { salarySql += ` AND pr.period_start >= $${sIdx++}`; salaryParams.push(period_start); }
  if (period_end) { salarySql += ` AND pr.period_end <= $${sIdx++}`; salaryParams.push(period_end); }
  if (department_id) { salarySql += ` AND e.department_id = $${sIdx++}`; salaryParams.push(department_id); }
  if (employee_type) { salarySql += ` AND e.employee_type = $${sIdx++}`; salaryParams.push(employee_type); }
  const salaryResult = await db.query(salarySql, salaryParams);

  // 3. Pending time off requests
  const torParams = [];
  let tIdx = 1;
  let torSql = `
    SELECT COUNT(*) AS pending_requests
    FROM time_off_requests tor
    JOIN employees e ON tor.employee_id = e.id
    WHERE tor.status = 'draft'`;
  if (department_id) { torSql += ` AND e.department_id = $${tIdx++}`; torParams.push(department_id); }
  const torResult = await db.query(torSql, torParams);

  // 4. Attendance today
  const todayParams = [];
  let aIdx = 1;
  let todaySql = `
    SELECT COUNT(DISTINCT a.employee_id) AS checked_in_today
    FROM attendances a
    JOIN employees e ON a.employee_id = e.id
    WHERE DATE(a.check_in) = CURRENT_DATE`;
  if (department_id) { todaySql += ` AND e.department_id = $${aIdx++}`; todayParams.push(department_id); }
  const todayResult = await db.query(todaySql, todayParams);

  return {
    total_employees: parseInt(empResult.rows[0].total_employees, 10),
    total_net_paid: parseFloat(salaryResult.rows[0].total_net_paid),
    total_gross_paid: parseFloat(salaryResult.rows[0].total_gross_paid),
    total_payslips: parseInt(salaryResult.rows[0].total_payslips, 10),
    pending_time_off_requests: parseInt(torResult.rows[0].pending_requests, 10),
    checked_in_today: parseInt(todayResult.rows[0].checked_in_today, 10),
  };
}

async function getSalaryByDepartment({ period_start, period_end }) {
  let sql = `
    SELECT d.id AS department_id,
           d.name AS department,
           COALESCE(SUM(ps.net_total), 0) AS total_net,
           COALESCE(SUM(ps.gross_total), 0) AS total_gross,
           COUNT(DISTINCT ps.employee_id) AS employee_count
    FROM payslips ps
    JOIN payruns pr ON ps.payrun_id = pr.id
    JOIN employees e ON ps.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE pr.status = 'paid'`;
  const params = [];
  let idx = 1;
  if (period_start) { sql += ` AND pr.period_start >= $${idx++}`; params.push(period_start); }
  if (period_end) { sql += ` AND pr.period_end <= $${idx++}`; params.push(period_end); }
  sql += ' GROUP BY d.id, d.name ORDER BY total_net DESC';

  const { rows } = await db.query(sql, params);
  return rows.map((r) => ({
    department_id: parseInt(r.department_id, 10),
    department: r.department,
    total_net: parseFloat(r.total_net),
    total_gross: parseFloat(r.total_gross),
    employee_count: parseInt(r.employee_count, 10),
  }));
}

async function getSalaryTrend() {
  const { rows } = await db.query(`
    SELECT pr.period_start, pr.period_end, pr.name AS payrun_name,
           COALESCE(SUM(ps.net_total), 0) AS total_net,
           COALESCE(SUM(ps.gross_total), 0) AS total_gross,
           COUNT(ps.id) AS payslip_count
    FROM payslips ps
    JOIN payruns pr ON ps.payrun_id = pr.id
    WHERE pr.status = 'paid'
    GROUP BY pr.period_start, pr.period_end, pr.name
    ORDER BY pr.period_start ASC
  `);

  return rows.map((r) => ({
    period_start: r.period_start,
    period_end: r.period_end,
    payrun_name: r.payrun_name,
    total_net: parseFloat(r.total_net),
    total_gross: parseFloat(r.total_gross),
    payslip_count: parseInt(r.payslip_count, 10),
  }));
}

async function getAttendanceOverview() {
  const { rows } = await db.query(`
    SELECT DATE(check_in) AS date,
           COUNT(*) AS total_records,
           COUNT(check_out) AS completed,
           COUNT(*) - COUNT(check_out) AS in_progress,
           COALESCE(ROUND(AVG(worked_hours)::numeric, 2), 0) AS avg_hours
    FROM attendances
    WHERE check_in >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(check_in)
    ORDER BY date DESC
  `);

  return rows.map((r) => ({
    date: r.date,
    total_records: parseInt(r.total_records, 10),
    completed: parseInt(r.completed, 10),
    in_progress: parseInt(r.in_progress, 10),
    avg_hours: parseFloat(r.avg_hours),
  }));
}

async function getTimeOffOverview() {
  const { rows } = await db.query(`
    SELECT tot.id AS type_id,
           tot.name AS type_name,
           COUNT(CASE WHEN tor.status = 'draft' THEN 1 END) AS pending,
           COUNT(CASE WHEN tor.status = 'approved' THEN 1 END) AS approved,
           COUNT(CASE WHEN tor.status = 'refused' THEN 1 END) AS refused,
           COALESCE(SUM(CASE WHEN tor.status = 'approved' THEN tor.duration ELSE 0 END), 0) AS total_days_taken
    FROM time_off_types tot
    LEFT JOIN time_off_requests tor ON tor.type_id = tot.id
    GROUP BY tot.id, tot.name
    ORDER BY tot.name ASC
  `);

  return rows.map((r) => ({
    type_id: parseInt(r.type_id, 10),
    type_name: r.type_name,
    pending: parseInt(r.pending, 10),
    approved: parseInt(r.approved, 10),
    refused: parseInt(r.refused, 10),
    total_days_taken: parseFloat(r.total_days_taken),
  }));
}

async function getWarnings() {
  // Payslip warnings
  const payslipWarnings = await db.query(`
    SELECT ps.id AS entity_id, 'payslip' AS entity_type,
           ps.warning_reason AS message,
           e.id AS employee_id,
           e.name AS employee_name,
           d.name AS department_name,
           pr.name AS payrun_name
    FROM payslips ps
    JOIN employees e ON ps.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    JOIN payruns pr ON ps.payrun_id = pr.id
    WHERE ps.has_warning = true
    ORDER BY ps.id DESC
    LIMIT 50
  `);

  // AI/audit log warnings
  const auditWarnings = await db.query(`
    SELECT id AS entity_id, entity AS entity_type, note AS message, action, created_at
    FROM audit_logs
    WHERE action = 'ai_flag'
    ORDER BY created_at DESC
    LIMIT 50
  `);

  return {
    payslip_warnings: payslipWarnings.rows,
    ai_warnings: auditWarnings.rows,
  };
}

async function createAuditLog({ user_id = null, action = 'ai_flag', entity = 'payrun', entity_id = 0, note = '', before_json = null, after_json = null }) {
  const { rows } = await db.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, note, before_json, after_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [user_id, action, entity, entity_id, note, before_json ? JSON.stringify(before_json) : null, after_json ? JSON.stringify(after_json) : null]
  );
  return rows[0];
}

module.exports = {
  getSummary,
  getSalaryByDepartment,
  getSalaryTrend,
  getAttendanceOverview,
  getTimeOffOverview,
  getWarnings,
  createAuditLog,
};
