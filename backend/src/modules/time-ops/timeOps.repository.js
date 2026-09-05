const db = require('../../db');

// ───────────── Attendance ─────────────
async function findAttendances(filters = {}) {
  let sql = 'SELECT * FROM attendances WHERE 1=1';
  const params = [];
  let idx = 1;

  if (filters.employee_id) {
    sql += ` AND employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.status) {
    sql += ` AND status = $${idx++}`;
    params.push(filters.status);
  }
  if (filters.date_from) {
    sql += ` AND check_in >= $${idx++}`;
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    sql += ` AND check_in <= $${idx++}`;
    params.push(filters.date_to);
  }

  sql += ' ORDER BY check_in DESC';
  const { rows } = await db.query(sql, params);
  return rows;
}

async function findOpenAttendance(employeeId) {
  const { rows } = await db.query(
    `SELECT * FROM attendances
     WHERE employee_id = $1 AND check_out IS NULL AND status = 'in_progress'
     ORDER BY check_in DESC LIMIT 1`,
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
  let sql = 'SELECT * FROM allocations WHERE 1=1';
  const params = [];
  let idx = 1;

  if (filters.employee_id) {
    sql += ` AND employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.type_id) {
    sql += ` AND type_id = $${idx++}`;
    params.push(filters.type_id);
  }

  sql += ' ORDER BY valid_from DESC';
  const { rows } = await db.query(sql, params);
  return rows;
}

async function findAllocationForDeduction(employeeId, typeId) {
  const { rows } = await db.query(
    `SELECT * FROM allocations
     WHERE employee_id = $1 AND type_id = $2 AND status = 'approved'
       AND valid_from <= CURRENT_DATE
       AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
     ORDER BY valid_from DESC LIMIT 1`,
    [employeeId, typeId]
  );
  return rows[0] || null;
}

async function insertAllocation(data) {
  const { rows } = await db.query(
    `INSERT INTO allocations (employee_id, type_id, allocated, valid_from, valid_to, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.employee_id, data.type_id, data.allocated, data.valid_from, data.valid_to || null, data.status]
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
  let sql = 'SELECT * FROM time_off_requests WHERE 1=1';
  const params = [];
  let idx = 1;

  if (filters.employee_id) {
    sql += ` AND employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.status) {
    sql += ` AND status = $${idx++}`;
    params.push(filters.status);
  }

  sql += ' ORDER BY created_at DESC';
  const { rows } = await db.query(sql, params);
  return rows;
}

async function findTimeOffRequestById(id) {
  const { rows } = await db.query('SELECT * FROM time_off_requests WHERE id = $1', [id]);
  return rows[0] || null;
}

async function insertTimeOffRequest(data) {
  const { rows } = await db.query(
    `INSERT INTO time_off_requests (employee_id, type_id, start_date, end_date, duration, status)
     VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
    [data.employee_id, data.type_id, data.start_date, data.end_date, data.duration]
  );
  return rows[0];
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
};
