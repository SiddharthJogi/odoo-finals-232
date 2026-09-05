const db = require('../../db');

/**
 * Dashboard service — read-only aggregate queries across all modules.
 * No owned tables; queries join across employee/payroll/attendance/time-off data.
 */

async function getSummary({ period_start, period_end, department_id, employee_type, company_id }) {
  const params = [];
  let idx = 1;

  // Total employees
  let empSql = `SELECT COUNT(*) AS total_employees FROM employees WHERE status = 'active'`;
  if (department_id) { empSql += ` AND department_id = $${idx++}`; params.push(department_id); }
  if (employee_type) { empSql += ` AND employee_type = $${idx++}`; params.push(employee_type); }
  const empResult = await db.query(empSql, params.slice(0, idx - 1));

  // Net salary paid in period
  const salaryParams = [];
  let sIdx = 1;
  let salarySql = `
    SELECT COALESCE(SUM(ps.net_total), 0) AS total_net_paid,
           COUNT(ps.id) AS total_payslips
    FROM payslips ps
    JOIN payruns pr ON ps.payrun_id = pr.id
    WHERE pr.status = 'paid'`;
  if (period_start) { salarySql += ` AND pr.period_start >= $${sIdx++}`; salaryParams.push(period_start); }
  if (period_end) { salarySql += ` AND pr.period_end <= $${sIdx++}`; salaryParams.push(period_end); }
  const salaryResult = await db.query(salarySql, salaryParams);

  // Pending time off requests
  const torResult = await db.query(
    `SELECT COUNT(*) AS pending_requests FROM time_off_requests WHERE status = 'draft'`
  );

  // Attendance today
  const todayResult = await db.query(
    `SELECT COUNT(DISTINCT employee_id) AS checked_in_today
     FROM attendances
     WHERE DATE(check_in) = CURRENT_DATE`
  );

  return {
    total_employees: parseInt(empResult.rows[0].total_employees, 10),
    total_net_paid: parseFloat(salaryResult.rows[0].total_net_paid),
    total_payslips: parseInt(salaryResult.rows[0].total_payslips, 10),
    pending_time_off_requests: parseInt(torResult.rows[0].pending_requests, 10),
    checked_in_today: parseInt(todayResult.rows[0].checked_in_today, 10),
  };
}

async function getSalaryByDepartment({ period_start, period_end }) {
  let sql = `
    SELECT d.name AS department, COALESCE(SUM(ps.net_total), 0) AS total_net
    FROM payslips ps
    JOIN payruns pr ON ps.payrun_id = pr.id
    JOIN employees e ON ps.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE pr.status = 'paid'`;
  const params = [];
  let idx = 1;
  if (period_start) { sql += ` AND pr.period_start >= $${idx++}`; params.push(period_start); }
  if (period_end) { sql += ` AND pr.period_end <= $${idx++}`; params.push(period_end); }
  sql += ' GROUP BY d.name ORDER BY total_net DESC';

  const { rows } = await db.query(sql, params);
  return rows;
}

async function getSalaryTrend() {
  const { rows } = await db.query(`
    SELECT pr.period_start, pr.period_end,
           SUM(ps.net_total) AS total_net,
           SUM(ps.gross_total) AS total_gross,
           COUNT(ps.id) AS payslip_count
    FROM payslips ps
    JOIN payruns pr ON ps.payrun_id = pr.id
    WHERE pr.status = 'paid'
    GROUP BY pr.period_start, pr.period_end
    ORDER BY pr.period_start
  `);
  return rows;
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
  return rows;
}

async function getTimeOffOverview() {
  const { rows } = await db.query(`
    SELECT tot.name AS type_name,
           COUNT(CASE WHEN tor.status = 'draft' THEN 1 END) AS pending,
           COUNT(CASE WHEN tor.status = 'approved' THEN 1 END) AS approved,
           COUNT(CASE WHEN tor.status = 'refused' THEN 1 END) AS refused,
           COALESCE(SUM(CASE WHEN tor.status = 'approved' THEN tor.duration ELSE 0 END), 0) AS total_days_taken
    FROM time_off_requests tor
    JOIN time_off_types tot ON tor.type_id = tot.id
    GROUP BY tot.name
    ORDER BY tot.name
  `);
  return rows;
}

async function getWarnings() {
  // Payslip warnings
  const payslipWarnings = await db.query(`
    SELECT ps.id AS entity_id, 'payslip' AS entity_type,
           ps.warning_reason AS message, e.name AS employee_name
    FROM payslips ps
    JOIN employees e ON ps.employee_id = e.id
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

module.exports = {
  getSummary,
  getSalaryByDepartment,
  getSalaryTrend,
  getAttendanceOverview,
  getTimeOffOverview,
  getWarnings,
};
