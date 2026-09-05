const db = require('../../db');

// ───────────── Roles ─────────────
async function findAllRoles() {
  const { rows } = await db.query('SELECT * FROM roles ORDER BY id');
  return rows;
}

async function findRoleById(id) {
  const { rows } = await db.query('SELECT * FROM roles WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findRoleByName(name) {
  const { rows } = await db.query('SELECT * FROM roles WHERE name = $1', [name]);
  return rows[0] || null;
}

// ───────────── Users ─────────────
async function findUserByEmail(email) {
  const { rows } = await db.query(
    `SELECT u.*, r.name AS role
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.role_id, u.employee_id, u.is_active, u.created_at, r.name AS role
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findUserPasswordById(id) {
  const { rows } = await db.query(
    'SELECT password_hash, is_active FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function findUserByEmployeeId(employeeId) {
  const { rows } = await db.query(
    'SELECT id FROM users WHERE employee_id = $1',
    [employeeId]
  );
  return rows[0] || null;
}

async function insertUser({ email, passwordHash, roleId, employeeId }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role_id, employee_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role_id, employee_id, is_active, created_at`,
    [email, passwordHash, roleId, employeeId]
  );
  return rows[0];
}

async function findAllUsers(filters = {}) {
  const where = ['1=1'];
  const params = [];
  let idx = 1;

  if (filters.search) {
    where.push(`(u.email ILIKE $${idx} OR e.name ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }
  if (filters.status) {
    where.push(`u.is_active = $${idx++}`);
    params.push(filters.status === 'active');
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM users u
     LEFT JOIN employees e ON u.employee_id = e.id
     WHERE ${whereSql}`,
    params
  );
  const total = countResult.rows[0].total;
  const dataParams = [...params, filters.limit, filters.offset];
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.is_active, u.created_at, u.employee_id,
            r.name AS role, r.id AS role_id,
            e.name AS employee_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN employees e ON u.employee_id = e.id
     WHERE ${whereSql}
     ORDER BY u.id
     LIMIT $${idx} OFFSET $${idx + 1}`,
    dataParams
  );
  return { rows, total };
}

async function updateUserRole(userId, roleId) {
  const { rows } = await db.query(
    `UPDATE users SET role_id = $1 WHERE id = $2
     RETURNING id, email, role_id, employee_id, is_active`,
    [roleId, userId]
  );
  return rows[0] || null;
}

async function updateUserPassword(userId, passwordHash) {
  const { rows } = await db.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2
     RETURNING id, email, role_id, employee_id, is_active`,
    [passwordHash, userId]
  );
  return rows[0] || null;
}

async function deactivateUser(userId) {
  const { rows } = await db.query(
    `UPDATE users SET is_active = false WHERE id = $1
     RETURNING id, email, role_id, employee_id, is_active`,
    [userId]
  );
  return rows[0] || null;
}

async function reactivateUser(userId, passwordHash) {
  const { rows } = await db.query(
    `UPDATE users
     SET is_active = true, password_hash = $2
     WHERE id = $1
     RETURNING id, email, role_id, employee_id, is_active`,
    [userId, passwordHash]
  );
  return rows[0] || null;
}

// ───────────── Departments ─────────────
async function findAllDepartments() {
  const { rows } = await db.query('SELECT * FROM departments ORDER BY id');
  return rows;
}

async function insertDepartment({ name, parentId }) {
  const { rows } = await db.query(
    'INSERT INTO departments (name, parent_id) VALUES ($1, $2) RETURNING *',
    [name, parentId || null]
  );
  return rows[0];
}

// ───────────── Employees ─────────────
async function findAllEmployees(filters = {}) {
  const where = ['1=1'];
  const params = [];
  let idx = 1;

  if (filters.department_id) {
    where.push(`e.department_id = $${idx++}`);
    params.push(filters.department_id);
  }
  if (filters.status) {
    where.push(`e.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.employee_type) {
    where.push(`e.employee_type = $${idx++}`);
    params.push(filters.employee_type);
  }
  if (filters.search) {
    where.push(`(e.name ILIKE $${idx} OR e.email ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }
  if (filters.assignment === 'assigned') {
    where.push('e.department_id IS NOT NULL');
  } else if (filters.assignment === 'unassigned') {
    where.push('e.department_id IS NULL');
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM employees e WHERE ${whereSql}`,
    params
  );
  const total = countResult.rows[0].total;

  const paginationSql = filters.all ? '' : `LIMIT $${idx} OFFSET $${idx + 1}`;
  const dataParams = filters.all ? params : [...params, filters.limit, filters.offset];
  const { rows } = await db.query(
    `SELECT e.*, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE ${whereSql}
     ORDER BY e.id DESC
     ${paginationSql}`,
    dataParams
  );
  return { rows, total };
}

async function findEmployeeById(id) {
  const { rows } = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
  return rows[0] || null;
}

async function insertEmployee(data) {
  const { rows } = await db.query(
    `INSERT INTO employees (name, email, department_id, manager_id, job_position, schedule_id, employee_type, bank_account, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [data.name, data.email, data.department_id || null, data.manager_id || null,
    data.job_position || null, data.schedule_id || null, data.employee_type,
    data.bank_account || null, data.status]
  );
  return rows[0];
}

async function insertEmployeeAndUser(client, { employee, passwordHash, roleId }) {
  const employeeResult = await client.query(
    `INSERT INTO employees (name, email, department_id, manager_id, job_position, schedule_id, employee_type, bank_account, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [employee.name, employee.email, employee.department_id || null, employee.manager_id || null,
    employee.job_position || null, employee.schedule_id || null, employee.employee_type,
    employee.bank_account || null, employee.status]
  );
  const createdEmployee = employeeResult.rows[0];
  const userResult = await client.query(
    `INSERT INTO users (email, password_hash, role_id, employee_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role_id, employee_id, is_active, created_at`,
    [employee.email, passwordHash, roleId, createdEmployee.id]
  );
  return { employee: createdEmployee, user: userResult.rows[0] };
}

async function updateEmployee(id, data) {
  const fields = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = $${idx++}`);
    params.push(value);
  }
  if (fields.length === 0) return findEmployeeById(id);

  params.push(id);
  const { rows } = await db.query(
    `UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0] || null;
}

// ───────────── Contracts ─────────────
async function findAllContracts(filters = {}) {
  const where = ['1=1'];
  const params = [];
  let idx = 1;

  if (filters.status) {
    where.push(`c.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.search) {
    where.push(`(e.name ILIKE $${idx} OR e.email ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM contracts c
     JOIN employees e ON c.employee_id = e.id
     WHERE ${whereSql}`,
    params
  );
  const total = countResult.rows[0].total;
  const { rows } = await db.query(
    `SELECT c.*, e.name AS employee_name
     FROM contracts c
     JOIN employees e ON c.employee_id = e.id
     WHERE ${whereSql}
     ORDER BY c.start_date DESC, c.id DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { rows, total };
}

async function findContractById(id) {
  const { rows } = await db.query(
    `SELECT c.*, e.name as employee_name
     FROM contracts c
     JOIN employees e ON c.employee_id = e.id
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findContractsByEmployee(employeeId) {
  const { rows } = await db.query(
    'SELECT * FROM contracts WHERE employee_id = $1 ORDER BY start_date DESC',
    [employeeId]
  );
  return rows;
}

async function findApplicableContract(employeeId, periodStart, periodEnd) {
  const { rows } = await db.query(
    `SELECT * FROM contracts
     WHERE employee_id = $1
       AND status = 'active'
       AND start_date <= $3
       AND (end_date IS NULL OR end_date >= $2)
     ORDER BY start_date DESC
     LIMIT 1`,
    [employeeId, periodStart, periodEnd]
  );
  return rows[0] || null;
}

async function findOverlappingActiveContracts(employeeId, startDate, endDate, excludeId) {
  let sql = `SELECT id FROM contracts
             WHERE employee_id = $1
               AND status = 'active'
               AND start_date <= $3
               AND (end_date IS NULL OR end_date >= $2)`;
  const params = [employeeId, startDate, endDate || '9999-12-31'];
  if (excludeId) {
    sql += ' AND id != $4';
    params.push(excludeId);
  }
  const { rows } = await db.query(sql, params);
  return rows;
}

async function insertContract(data) {
  const { rows } = await db.query(
    `INSERT INTO contracts (employee_id, department_id, job_position, wage, start_date, end_date, structure_id, schedule_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [data.employee_id, data.department_id || null, data.job_position || null,
    data.wage, data.start_date, data.end_date || null, data.structure_id,
    data.schedule_id || null, data.status]
  );
  return rows[0];
}

async function updateContract(id, data) {
  const fields = [];
  const params = [];

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = $${params.length + 1}`);
    params.push(value);
  }
  if (fields.length === 0) return findContractById(id);

  params.push(id);
  const { rows } = await db.query(
    `UPDATE contracts SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

// ───────────── Working Schedules ─────────────
async function findAllSchedules() {
  const { rows } = await db.query('SELECT * FROM working_schedules ORDER BY id');
  return rows;
}

async function findScheduleById(id) {
  const { rows } = await db.query('SELECT * FROM working_schedules WHERE id = $1', [id]);
  return rows[0] || null;
}

async function insertSchedule({ name, calendarType }) {
  const { rows } = await db.query(
    `INSERT INTO working_schedules (name, calendar_type)
     VALUES ($1, $2) RETURNING *`,
    [name, calendarType]
  );
  return rows[0];
}

async function findScheduleLines(scheduleId) {
  const { rows } = await db.query(
    'SELECT * FROM schedule_lines WHERE schedule_id = $1 ORDER BY day_of_week, start_time',
    [scheduleId]
  );
  return rows;
}

async function insertScheduleLine({ scheduleId, dayOfWeek, startTime, endTime, breakMinutes }) {
  const { rows } = await db.query(
    `INSERT INTO schedule_lines (schedule_id, day_of_week, start_time, end_time, break_minutes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [scheduleId, dayOfWeek, startTime, endTime, breakMinutes]
  );
  return rows[0];
}

async function updateSchedule(id, { name, calendarType, lines }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE working_schedules
       SET name = COALESCE($1, name), calendar_type = COALESCE($2, calendar_type)
       WHERE id = $3 AND status = 'active'
       RETURNING *`,
      [name || null, calendarType || null, id]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    if (lines) {
      await client.query('DELETE FROM schedule_lines WHERE schedule_id = $1', [id]);
      for (const line of lines) {
        await client.query(
          `INSERT INTO schedule_lines (schedule_id, day_of_week, start_time, end_time, break_minutes)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, line.day_of_week, line.start_time, line.end_time, line.break_minutes]
        );
      }
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function archiveSchedule(id) {
  const { rows } = await db.query(
    `UPDATE working_schedules SET status = 'archived'
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findAllRoles,
  findRoleById,
  findRoleByName,
  findUserByEmail,
  findUserById,
  findUserPasswordById,
  findUserByEmployeeId,
  findAllUsers,
  insertUser,
  updateUserRole,
  updateUserPassword,
  deactivateUser,
  reactivateUser,
  findAllDepartments,
  insertDepartment,
  findAllEmployees,
  findEmployeeById,
  insertEmployee,
  insertEmployeeAndUser,
  updateEmployee,
  findAllContracts,
  findContractById,
  findContractsByEmployee,
  findApplicableContract,
  findOverlappingActiveContracts,
  insertContract,
  updateContract,
  findAllSchedules,
  findScheduleById,
  insertSchedule,
  findScheduleLines,
  insertScheduleLine,
  updateSchedule,
  archiveSchedule,
};
