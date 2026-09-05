const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const crypto = require('crypto');
const db = require('../../db');
const repo = require('./hrCore.repository');
const { isConfigured: isMailConfigured, sendWelcomeEmail } = require('./mailer');
const { ValidationError, AuthenticationError, ForbiddenError, NotFoundError, PayrollError } = require('../../shared/errors');

// ───────────── Auth ─────────────
async function login(email, password) {
  const user = await repo.findUserByEmail(email);
  if (!user) throw new AuthenticationError('Invalid email or password');
  if (!user.is_active) throw new ForbiddenError('Account is deactivated');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AuthenticationError('Invalid email or password');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, employeeId: user.employee_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role, employeeId: user.employee_id },
  };
}

// ───────────── Users ─────────────
async function createUser(data) {
  const existing = await repo.findUserByEmail(data.email);
  if (existing) throw new ValidationError('Email already in use');

  const role = await repo.findRoleById(data.role_id);
  if (!role) throw new ValidationError('Invalid role_id');

  const employee = await repo.findEmployeeById(data.employee_id);
  if (!employee) throw new ValidationError('Employee not found');

  const linkedUser = await repo.findUserByEmployeeId(data.employee_id);
  if (linkedUser) throw new ValidationError('Employee already has a user account');

  const temporaryPassword = data.password || crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, config.bcryptRounds);
  const user = await repo.insertUser({
    email: data.email,
    passwordHash,
    roleId: data.role_id,
    employeeId: data.employee_id,
  });

  if (!isMailConfigured()) {
    return {
      ...user,
      warning: 'User created, but SMTP is not configured. Share these temporary credentials manually.',
      temporary_password: temporaryPassword,
    };
  }

  try {
    await sendWelcomeEmail({
      email: data.email,
      name: data.email,
      temporaryPassword,
    });
    return user;
  } catch (error) {
    console.error('User created but welcome email failed:', error);
    return {
      ...user,
      warning: 'User created, but email dispatch failed. Share these temporary credentials manually.',
      temporary_password: temporaryPassword,
    };
  }
}

async function updateUserRole(actorId, targetUserId, roleId) {
  if (actorId === targetUserId) {
    throw new ForbiddenError('Users must not assign or elevate their own roles');
  }
  const role = await repo.findRoleById(roleId);
  if (!role) throw new ValidationError('Invalid role_id');

  const updated = await repo.updateUserRole(targetUserId, roleId);
  if (!updated) throw new NotFoundError('User', targetUserId);
  return updated;
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await repo.findUserPasswordById(userId);
  if (!user || !user.is_active) {
    throw new AuthenticationError('Account is unavailable');
  }

  const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!currentPasswordMatches) {
    throw new ValidationError('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  const updated = await repo.updateUserPassword(userId, passwordHash);
  if (!updated) throw new NotFoundError('User', userId);
  return updated;
}

async function deactivateUser(actorId, targetUserId) {
  if (actorId === targetUserId) {
    throw new ForbiddenError('You cannot revoke your own account');
  }

  const updated = await repo.deactivateUser(targetUserId);
  if (!updated) throw new NotFoundError('User', targetUserId);
  return updated;
}

async function reactivateUser(actorId, targetUserId) {
  if (actorId === targetUserId) {
    throw new ForbiddenError('You cannot reset your own account through this flow');
  }

  const existing = await repo.findUserById(targetUserId);
  if (!existing) throw new NotFoundError('User', targetUserId);
  if (existing.is_active) throw new ValidationError('User account is already active');

  const temporaryPassword = data.password || crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, config.bcryptRounds);
  const user = await repo.reactivateUser(targetUserId, passwordHash);

  if (!isMailConfigured()) {
    return {
      ...user,
      warning: 'Account reactivated, but SMTP is not configured. Share these temporary credentials manually.',
      temporary_password: temporaryPassword,
    };
  }

  try {
    await sendWelcomeEmail({
      email: user.email,
      name: user.email,
      temporaryPassword,
    });
    return user;
  } catch (error) {
    console.error('Account reactivated but welcome email failed:', error);
    return {
      ...user,
      warning: 'Account reactivated, but email dispatch failed. Share these temporary credentials manually.',
      temporary_password: temporaryPassword,
    };
  }
}

async function getUserProfile(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError('User', userId);
  return user;
}

async function listAllUsers() {
  return repo.findAllUsers();
}

async function listAllRoles() {
  return repo.findAllRoles();
}

// ───────────── Departments ─────────────
async function listDepartments() {
  return repo.findAllDepartments();
}

async function createDepartment(data) {
  return repo.insertDepartment(data);
}

// ───────────── Employees ─────────────
async function listEmployees(filters) {
  return repo.findAllEmployees(filters);
}

async function getEmployee(id) {
  const emp = await repo.findEmployeeById(id);
  if (!emp) throw new NotFoundError('Employee', id);
  return emp;
}

async function createEmployee(data) {
  return repo.insertEmployee(data);
}

async function provisionEmployee(actor, data) {
  const employeeRole = await repo.findRoleByName('employee');
  if (!employeeRole) throw new ValidationError('Employee role is not configured');

  let roleId = employeeRole.id;
  if (data.role_id) {
    if (actor.role !== 'admin') {
      throw new ForbiddenError('Only admins may assign elevated roles');
    }
    const role = await repo.findRoleById(data.role_id);
    if (!role) throw new ValidationError('Invalid role_id');
    roleId = role.id;
  }

  const existingUser = await repo.findUserByEmail(data.email);
  if (existingUser) throw new ValidationError('Email already has a user account');

  const temporaryPassword = data.password || crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, config.bcryptRounds);
  const client = await db.getClient();
  let created;
  try {
    await client.query('BEGIN');
    created = await repo.insertEmployeeAndUser(client, {
      employee: data,
      passwordHash,
      roleId,
    });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  if (!isMailConfigured()) {
    return {
      ...created,
      warning: 'Employee created, but SMTP is not configured. Share these temporary credentials manually.',
      temporary_password: temporaryPassword,
    };
  }

  try {
    await sendWelcomeEmail({
      email: data.email,
      name: data.name,
      temporaryPassword,
    });
    return created;
  } catch (error) {
    console.error('Employee created but welcome email failed:', error);
    return {
      ...created,
      warning: 'Employee created, but email dispatch failed. Share these temporary credentials manually.',
      temporary_password: temporaryPassword,
    };
  }
}

async function updateEmployee(id, data) {
  const updated = await repo.updateEmployee(id, data);
  if (!updated) throw new NotFoundError('Employee', id);
  return updated;
}

// ───────────── Contracts ─────────────
async function listAllContracts() {
  return repo.findAllContracts();
}

async function getContract(id) {
  const contract = await repo.findContractById(id);
  if (!contract) throw new NotFoundError('Contract', id);
  return contract;
}

async function listContractsByEmployee(employeeId) {
  return repo.findContractsByEmployee(employeeId);
}

/**
 * Period-aware contract resolution — see ARCHITECTURE.md §4.1.
 * Returns the single active contract applicable for [periodStart, periodEnd].
 * Throws PayrollError if none found.
 */
async function getApplicableContract(employeeId, periodStart, periodEnd) {
  const contract = await repo.findApplicableContract(employeeId, periodStart, periodEnd);
  if (!contract) {
    throw new PayrollError(`No applicable contract for employee ${employeeId} in period ${periodStart} to ${periodEnd}`);
  }
  return contract;
}

async function createContract(data) {
  if (data.end_date && data.end_date < data.start_date) {
    throw new ValidationError('Contract end date must be on or after the start date');
  }
  const overlaps = await repo.findOverlappingActiveContracts(
    data.employee_id,
    data.start_date,
    data.end_date
  );
  if (overlaps.length > 0) {
    throw new ValidationError('An active contract already exists for this employee in the given date range');
  }
  return repo.insertContract(data);
}

async function updateContract(id, data) {
  const existing = await getContract(id);
  const next = { ...existing, ...data };

  if (next.end_date && next.end_date < next.start_date) {
    throw new ValidationError('Contract end date must be on or after the start date');
  }

  if (next.status === 'active') {
    const overlaps = await repo.findOverlappingActiveContracts(
      next.employee_id,
      next.start_date,
      next.end_date,
      id
    );
    if (overlaps.length > 0) {
      throw new ValidationError('An active contract already exists for this employee in the given date range');
    }
  }

  const updateData = { ...data };
  if (Object.prototype.hasOwnProperty.call(updateData, 'end_date') && !updateData.end_date) {
    updateData.end_date = null;
  }
  return repo.updateContract(id, updateData);
}

async function updateContractStatus(id, status) {
  if (status === 'active') return updateContract(id, { status });
  await getContract(id);
  return repo.updateContract(id, { status });
}

// ───────────── Working Schedules ─────────────
async function listSchedules() {
  return repo.findAllSchedules();
}

async function getScheduleWithLines(id) {
  const schedule = await repo.findScheduleById(id);
  if (!schedule) throw new NotFoundError('Schedule', id);

  const lines = await repo.findScheduleLines(id);

  // Compute weekly hours server-side
  const weeklyHours = lines.reduce((sum, line) => {
    const start = parseTime(line.start_time);
    const end = parseTime(line.end_time);
    const worked = (end - start) / 3600 - (line.break_minutes / 60);
    return sum + Math.max(0, worked);
  }, 0);

  return { ...schedule, lines, weekly_hours: Math.round(weeklyHours * 100) / 100 };
}

async function createSchedule(data) {
  const schedule = await repo.insertSchedule({
    name: data.name,
    calendarType: data.calendar_type,
  });

  const lines = [];
  for (const line of data.lines) {
    const inserted = await repo.insertScheduleLine({
      scheduleId: schedule.id,
      dayOfWeek: line.day_of_week,
      startTime: line.start_time,
      endTime: line.end_time,
      breakMinutes: line.break_minutes,
    });
    lines.push(inserted);
  }

  return { ...schedule, lines };
}

async function updateSchedule(id, data) {
  const schedule = await repo.updateSchedule(id, data);
  if (!schedule) throw new NotFoundError('Schedule', id);
  return getScheduleWithLines(id);
}

async function archiveSchedule(id) {
  const schedule = await repo.archiveSchedule(id);
  if (!schedule) throw new NotFoundError('Active schedule', id);
  return schedule;
}

/**
 * Parses a TIME string (HH:MM or HH:MM:SS) into seconds since midnight.
 */
function parseTime(timeStr) {
  const parts = String(timeStr).split(':').map(Number);
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
}

module.exports = {
  login,
  createUser,
  updateUserRole,
  changePassword,
  deactivateUser,
  reactivateUser,
  getUserProfile,
  listAllUsers,
  listAllRoles,
  listDepartments,
  createDepartment,
  listEmployees,
  getEmployee,
  createEmployee,
  provisionEmployee,
  updateEmployee,
  listAllContracts,
  getContract,
  listContractsByEmployee,
  getApplicableContract,
  createContract,
  updateContract,
  updateContractStatus,
  listSchedules,
  getScheduleWithLines,
  createSchedule,
  updateSchedule,
  archiveSchedule,
};
