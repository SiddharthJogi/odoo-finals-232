const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const repo = require('./hrCore.repository');
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

  const passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);
  return repo.insertUser({
    email: data.email,
    passwordHash,
    roleId: data.role_id,
    employeeId: data.employee_id,
  });
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

async function getUserProfile(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError('User', userId);
  return user;
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

async function updateEmployee(id, data) {
  const updated = await repo.updateEmployee(id, data);
  if (!updated) throw new NotFoundError('Employee', id);
  return updated;
}

// ───────────── Contracts ─────────────
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
  getUserProfile,
  listDepartments,
  createDepartment,
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  listContractsByEmployee,
  getApplicableContract,
  createContract,
  listSchedules,
  getScheduleWithLines,
  createSchedule,
};
