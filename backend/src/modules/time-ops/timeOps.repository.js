const db = require('../../db');

// ───────────── Attendance ─────────────
async function findAttendances(filters = {}) {
  let sql = `
    SELECT
      a.*,
      e.name AS employee_name,
      e.job_position,
      e.schedule_id,
      sl.start_time AS scheduled_start,
      sl.end_time AS scheduled_end,
      COALESCE(sl.break_minutes, 0) AS break_minutes,
      ws.grace_period_minutes,
      ws.overtime_buffer_minutes
    FROM attendances a
    LEFT JOIN employees e ON a.employee_id = e.id
    LEFT JOIN working_schedules ws ON ws.id = e.schedule_id
    LEFT JOIN schedule_lines sl ON sl.schedule_id = e.schedule_id
      AND sl.day_of_week = EXTRACT(DOW FROM a.check_in)
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (filters.employee_id) {
    sql += ` AND a.employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.status) {
    sql += ` AND a.status = $${idx++}`;
    params.push(filters.status);
  }
  if (filters.date_from) {
    sql += ` AND a.check_in >= $${idx++}`;
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    sql += ` AND a.check_in <= $${idx++}`;
    params.push(filters.date_to);
  }

  sql += ' ORDER BY a.check_in DESC';
  const { rows } = await db.query(sql, params);
  return rows;
}

async function findOpenAttendance(employeeId) {
  const { rows } = await db.query(
    `SELECT
       a.*,
       e.name AS employee_name,
       e.schedule_id,
       sl.start_time AS scheduled_start,
       sl.end_time AS scheduled_end,
       COALESCE(sl.break_minutes, 0) AS break_minutes,
       ws.grace_period_minutes,
       ws.overtime_buffer_minutes
     FROM attendances a
     LEFT JOIN employees e ON a.employee_id = e.id
     LEFT JOIN working_schedules ws ON ws.id = e.schedule_id
     LEFT JOIN schedule_lines sl ON sl.schedule_id = e.schedule_id
       AND sl.day_of_week = EXTRACT(DOW FROM a.check_in)
     WHERE a.employee_id = $1 AND a.check_out IS NULL AND a.status = 'in_progress'
     ORDER BY a.check_in DESC LIMIT 1`,
    [employeeId]
  );
  return rows[0] || null;
}

async function insertAttendance({ employeeId, checkIn }) {
  const { rows } = await db.query(
    `INSERT INTO attendances (employee_id, check_in, status)
     VALUES ($1, $2, 'in_progress')
     RETURNING *`,
    [employeeId, checkIn]
  );
  return rows[0];
}

async function updateAttendanceCheckOut(id, checkOut) {
  const { rows } = await db.query(
    `UPDATE attendances SET check_out = $1, status = 'done'
     WHERE id = $2 RETURNING *`,
    [checkOut, id]
  );
  return rows[0] || null;
}

async function updateAttendance(id, data, correctedBy) {
  const fields = [];
  const params = [];
  let idx = 1;

  if (data.check_in) { fields.push(`check_in = $${idx++}`); params.push(data.check_in); }
  if (data.check_out) { fields.push(`check_out = $${idx++}`); params.push(data.check_out); }
  if (data.status) { fields.push(`status = $${idx++}`); params.push(data.status); }
  if (correctedBy) { fields.push(`corrected_by = $${idx++}`); params.push(correctedBy); }

  if (fields.length === 0) return null;
  params.push(id);

  const { rows } = await db.query(
    `UPDATE attendances SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0] || null;
}

// ───────────── Time Off Types ─────────────
async function findAllTimeOffTypes() {
  const { rows } = await db.query('SELECT * FROM time_off_types ORDER BY id');
  return rows;
}

async function insertTimeOffType(data) {
  const { rows } = await db.query(
    `INSERT INTO time_off_types (name, unit, requires_allocation, affects_payroll)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.name, data.unit, data.requires_allocation, data.affects_payroll]
  );
  return rows[0];
}

// ───────────── Allocations ─────────────
async function findAllocations(filters = {}) {
  let sql = `
    SELECT al.*, e.name AS employee_name, t.name AS type_name, t.unit AS type_unit
    FROM allocations al
    LEFT JOIN employees e ON al.employee_id = e.id
    LEFT JOIN time_off_types t ON al.type_id = t.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (filters.employee_id) {
    sql += ` AND al.employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.type_id) {
    sql += ` AND al.type_id = $${idx++}`;
    params.push(filters.type_id);
  }

  sql += ' ORDER BY al.valid_from DESC';
  const { rows } = await db.query(sql, params);
  return rows;
}

async function findAllocationForDeduction(employeeId, typeId) {
  let { rows } = await db.query(
    `SELECT * FROM allocations
     WHERE employee_id = $1 AND type_id = $2 AND status = 'approved'
       AND valid_from <= CURRENT_DATE
       AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
     ORDER BY valid_from DESC LIMIT 1`,
    [employeeId, typeId]
  );
  if (rows.length === 0) {
    const fallback = await db.query(
      `SELECT * FROM allocations
       WHERE employee_id = $1 AND type_id = $2 AND status = 'approved'
       ORDER BY valid_from DESC, id DESC LIMIT 1`,
      [employeeId, typeId]
    );
    rows = fallback.rows;
  }
  return rows[0] || null;
}

async function insertAllocation(data) {
  const { rows } = await db.query(
    `INSERT INTO allocations (employee_id, type_id, allocated, valid_from, valid_to, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.employee_id, data.type_id, data.allocated, data.valid_from, data.valid_to || null, data.status || 'approved']
  );
  return rows[0];
}

async function deductAllocation(allocationId, duration, client) {
  const queryFn = client || db;
  const { rows } = await queryFn.query(
    `UPDATE allocations SET taken = taken + $1
     WHERE id = $2 RETURNING *`,
    [duration, allocationId]
  );
  return rows[0] || null;
}

async function restoreAllocation(allocationId, duration, client) {
  const queryFn = client || db;
  const { rows } = await queryFn.query(
    `UPDATE allocations SET taken = taken - $1
     WHERE id = $2 RETURNING *`,
    [duration, allocationId]
  );
  return rows[0] || null;
}

// ───────────── Time Off Requests ─────────────
async function findTimeOffRequests(filters = {}) {
  let sql = `
    SELECT 
      r.id,
      r.employee_id,
      r.type_id,
      TO_CHAR(r.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(r.end_date, 'YYYY-MM-DD') AS end_date,
      r.duration,
      r.status,
      r.is_deferred,
      TO_CHAR(r.deferred_to_date, 'YYYY-MM-DD') AS deferred_to_date,
      r.responsible_id,
      r.deferral_reason,
      r.created_at,
      r.approved_by,
      e.name AS employee_name, 
      d.name AS department_name,
      t.name AS type_name, 
      t.unit AS type_unit,
      COALESCE(re.name, u.email) AS responsible_name
    FROM time_off_requests r
    LEFT JOIN employees e ON r.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN time_off_types t ON r.type_id = t.id
    LEFT JOIN users u ON r.responsible_id = u.id
    LEFT JOIN employees re ON u.employee_id = re.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (filters.employee_id) {
    sql += ` AND r.employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.status) {
    sql += ` AND r.status = $${idx++}`;
    params.push(filters.status);
  }

  sql += ' ORDER BY r.created_at DESC';
  const { rows } = await db.query(sql, params);
  return rows;
}

async function findTimeOffRequestById(id) {
  const { rows } = await db.query(
    `SELECT 
       r.id,
       r.employee_id,
       r.type_id,
       TO_CHAR(r.start_date, 'YYYY-MM-DD') AS start_date,
       TO_CHAR(r.end_date, 'YYYY-MM-DD') AS end_date,
       r.duration,
       r.status,
       r.is_deferred,
       TO_CHAR(r.deferred_to_date, 'YYYY-MM-DD') AS deferred_to_date,
       r.responsible_id,
       r.deferral_reason,
       r.created_at,
       r.approved_by,
       e.name AS employee_name, 
       t.name AS type_name, 
       t.unit AS type_unit,
       COALESCE(re.name, u.email) AS responsible_name
     FROM time_off_requests r
     LEFT JOIN employees e ON r.employee_id = e.id
     LEFT JOIN time_off_types t ON r.type_id = t.id
     LEFT JOIN users u ON r.responsible_id = u.id
     LEFT JOIN employees re ON u.employee_id = re.id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function insertTimeOffRequest(data) {
  const { rows } = await db.query(
    `INSERT INTO time_off_requests (
       employee_id, type_id, start_date, end_date, duration, status, 
       is_deferred, deferred_to_date, responsible_id, deferral_reason
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      data.employee_id,
      data.type_id,
      data.start_date,
      data.end_date,
      data.duration,
      data.status || 'draft',
      data.is_deferred || false,
      data.deferred_to_date || null,
      data.responsible_id || null,
      data.deferral_reason || null,
    ]
  );
  return rows[0];
}

async function findValidatedPayrunForDate(dateStr) {
  const { rows } = await db.query(
    `SELECT * FROM payruns
     WHERE period_start <= $1 AND period_end >= $1
       AND status IN ('validated', 'paid')
     ORDER BY period_end DESC LIMIT 1`,
    [dateStr]
  );
  return rows[0] || null;
}

async function findResponsibleUsers() {
  const { rows } = await db.query(
    `SELECT u.id, u.email, r.name AS role_name, COALESCE(e.name, u.email) AS name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN employees e ON u.employee_id = e.id
     WHERE r.name IN ('admin', 'hr_manager', 'hr_payroll_manager')
     ORDER BY e.name ASC, u.email ASC`
  );
  return rows;
}

async function updateTimeOffRequestStatus(id, status, approvedBy, client) {
  const queryFn = client || db;
  const { rows } = await queryFn.query(
    `UPDATE time_off_requests SET status = $1, approved_by = $2
     WHERE id = $3 RETURNING *`,
    [status, approvedBy, id]
  );
  return rows[0] || null;
}

async function findTimeOffTypeById(id) {
  const { rows } = await db.query('SELECT * FROM time_off_types WHERE id = $1', [id]);
  return rows[0] || null;
}

async function countLateAttendances(employeeId) {
  const { rows } = await db.query(
    `SELECT COUNT(*) FROM attendances
     WHERE employee_id = $1 AND status = 'flagged'`,
    [employeeId]
  );
  return parseInt(rows[0].count, 10);
}

// ───────────── Audit Logging ─────────────
async function insertAuditLog({ userId, action, entity, entityId, beforeJson, afterJson, note }, client) {
  const queryFn = client || db;
  const { rows } = await queryFn.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_json, after_json, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      userId || null,
      action,
      entity,
      entityId,
      beforeJson ? JSON.stringify(beforeJson) : null,
      afterJson ? JSON.stringify(afterJson) : null,
      note || null,
    ]
  );
  return rows[0];
}

module.exports = {
  findAttendances,
  findOpenAttendance,
  insertAttendance,
  updateAttendanceCheckOut,
  updateAttendance,
  findAllTimeOffTypes,
  insertTimeOffType,
  findAllocations,
  findAllocationForDeduction,
  insertAllocation,
  deductAllocation,
  restoreAllocation,
  findTimeOffRequests,
  findTimeOffRequestById,
  insertTimeOffRequest,
  updateTimeOffRequestStatus,
  findTimeOffTypeById,
  insertAuditLog,
  countLateAttendances,
  findValidatedPayrunForDate,
  findResponsibleUsers,
};
