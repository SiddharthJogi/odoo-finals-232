const db = require('../../db');

async function listReviews({ employeeId, status, search, limit, offset }) {
  const where = ['1=1'];
  const params = [];
  let index = 1;
  if (employeeId) { where.push(`pr.employee_id = $${index++}`); params.push(employeeId); }
  if (status) { where.push(`pr.status = $${index++}`); params.push(status); }
  if (search) { where.push(`(e.name ILIKE $${index} OR e.email ILIKE $${index})`); params.push(`%${search}%`); index++; }
  const whereSql = where.join(' AND ');
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM performance_reviews pr JOIN employees e ON e.id = pr.employee_id WHERE ${whereSql}`, params);
  const data = await db.query(
    `SELECT pr.*, e.name AS employee_name, e.email AS employee_email, u.email AS reviewer_email
     FROM performance_reviews pr JOIN employees e ON e.id = pr.employee_id JOIN users u ON u.id = pr.reviewer_id
     WHERE ${whereSql} ORDER BY pr.created_at DESC, pr.id DESC LIMIT $${index} OFFSET $${index + 1}`,
    [...params, limit, offset]
  );
  return { rows: data.rows, total: count.rows[0].total };
}

async function findReview(id) {
  const review = await db.query(
    `SELECT pr.*, e.name AS employee_name, e.email AS employee_email, u.email AS reviewer_email
     FROM performance_reviews pr JOIN employees e ON e.id = pr.employee_id JOIN users u ON u.id = pr.reviewer_id WHERE pr.id = $1`, [id]
  );
  if (!review.rows[0]) return null;
  const lines = await db.query('SELECT * FROM performance_review_lines WHERE review_id = $1 ORDER BY id', [id]);
  return { ...review.rows[0], lines: lines.rows };
}

async function findEmployee(id) {
  const { rows } = await db.query('SELECT id, name, email, status FROM employees WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findRule(id) {
  const { rows } = await db.query('SELECT * FROM performance_pay_rules WHERE id = $1 AND is_active = true', [id]);
  return rows[0] || null;
}

async function listRules() {
  const { rows } = await db.query('SELECT * FROM performance_pay_rules ORDER BY id');
  return rows;
}

async function insertRule(rule) {
  const { rows } = await db.query(
    `INSERT INTO performance_pay_rules (name, point_value, minimum_points, maximum_payout, maximum_wage_percent, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [rule.name, rule.point_value, rule.minimum_points, rule.maximum_payout || null, rule.maximum_wage_percent || null, rule.is_active]
  );
  return rows[0];
}

async function updateRule(id, rule) {
  const { rows } = await db.query(
    `UPDATE performance_pay_rules SET name = $1, point_value = $2, minimum_points = $3, maximum_payout = $4, maximum_wage_percent = $5, is_active = $6 WHERE id = $7 RETURNING *`,
    [rule.name, rule.point_value, rule.minimum_points, rule.maximum_payout || null, rule.maximum_wage_percent || null, rule.is_active, id]
  );
  return rows[0] || null;
}

async function insertReview(data, client) {
  const query = client || db;
  const result = await query.query(
    `INSERT INTO performance_reviews (employee_id, reviewer_id, period_start, period_end, project_name, description, status, total_points, performance_pay, pay_rule_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [data.employee_id, data.reviewer_id, data.period_start, data.period_end, data.project_name || null, data.description || null, data.status, data.total_points, data.performance_pay, data.pay_rule_id]
  );
  for (const line of data.lines) {
    await query.query('INSERT INTO performance_review_lines (review_id, criterion, score, remarks) VALUES ($1, $2, $3, $4)', [result.rows[0].id, line.criterion, line.score, line.remarks || null]);
  }
  return result.rows[0].id;
}

async function updateReview(id, data) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE performance_reviews SET period_start = $1, period_end = $2, project_name = $3, description = $4, status = $5, total_points = $6, performance_pay = $7, pay_rule_id = $8, updated_at = now()
       WHERE id = $9 AND status = 'draft' RETURNING id`,
      [data.period_start, data.period_end, data.project_name || null, data.description || null, data.status, data.total_points, data.performance_pay, data.pay_rule_id, id]
    );
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    await client.query('DELETE FROM performance_review_lines WHERE review_id = $1', [id]);
    for (const line of data.lines) await client.query('INSERT INTO performance_review_lines (review_id, criterion, score, remarks) VALUES ($1, $2, $3, $4)', [id, line.criterion, line.score, line.remarks || null]);
    await client.query('COMMIT');
    return findReview(id);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

async function changeStatus(id, status, userId) {
  const { rows } = await db.query(
    `UPDATE performance_reviews SET status = $1, approved_by = CASE WHEN $1 = 'approved' THEN $2 ELSE approved_by END, approved_at = CASE WHEN $1 = 'approved' THEN now() ELSE approved_at END, updated_at = now()
     WHERE id = $3 RETURNING id`, [status, userId, id]
  );
  return rows[0] ? findReview(id) : null;
}

async function insertAdjustment(data, client) {
  const query = client || db;
  const { rows } = await query.query(
    `INSERT INTO payroll_adjustments (payslip_id, employee_id, review_id, label, amount)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (payslip_id, review_id) DO UPDATE SET amount = EXCLUDED.amount RETURNING *`,
    [data.payslip_id, data.employee_id, data.review_id, data.label, data.amount]
  );
  return rows[0];
}

async function findApprovedPerformancePay(employeeId, periodStart, periodEnd) {
  const result = await db.query(
    `SELECT pr.* FROM performance_reviews pr WHERE pr.employee_id = $1 AND pr.status = 'approved' AND pr.period_start <= $3 AND pr.period_end >= $2 ORDER BY pr.approved_at DESC LIMIT 1`,
    [employeeId, periodStart, periodEnd]
  );
  if (!result) return null;
  const { rows } = result;
  return rows[0] || null;
}

module.exports = { listReviews, findReview, findEmployee, findRule, listRules, insertRule, updateRule, insertReview, updateReview, changeStatus, insertAdjustment, findApprovedPerformancePay };
