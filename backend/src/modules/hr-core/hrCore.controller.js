const { asyncHandler } = require('../../shared/asyncHandler');
const service = require('./hrCore.service');
const {
  loginSchema,
  createUserSchema,
  updateRoleSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  createContractSchema,
  createScheduleSchema,
  createDepartmentSchema,
} = require('./hrCore.validation');

// ───────────── Auth ─────────────
const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await service.login(data.email, data.password);
  res.json(result);
});

// ───────────── Users ─────────────
const createUser = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const user = await service.createUser(data);
  res.status(201).json(user);
});

const updateUserRole = asyncHandler(async (req, res) => {
  const data = updateRoleSchema.parse(req.body);
  const user = await service.updateUserRole(req.user.id, parseInt(req.params.id, 10), data.role_id);
  res.json(user);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await service.getUserProfile(req.user.id);
  res.json(user);
});

// ───────────── Departments ─────────────
const listDepartments = asyncHandler(async (_req, res) => {
  const departments = await service.listDepartments();
  res.json(departments);
});

const createDepartment = asyncHandler(async (req, res) => {
  const data = createDepartmentSchema.parse(req.body);
  const dept = await service.createDepartment(data);
  res.status(201).json(dept);
});

// ───────────── Employees ─────────────
const listEmployees = asyncHandler(async (req, res) => {
  const filters = {
    department_id: req.query.department_id ? parseInt(req.query.department_id, 10) : undefined,
    status: req.query.status,
    employee_type: req.query.employee_type,
  };
  const employees = await service.listEmployees(filters);
  res.json(employees);
});

const getEmployee = asyncHandler(async (req, res) => {
  const employee = await service.getEmployee(parseInt(req.params.id, 10));
  res.json(employee);
});

const createEmployee = asyncHandler(async (req, res) => {
  const data = createEmployeeSchema.parse(req.body);
  const employee = await service.createEmployee(data);
  res.status(201).json(employee);
});

const updateEmployee = asyncHandler(async (req, res) => {
  const data = updateEmployeeSchema.parse(req.body);
  const employee = await service.updateEmployee(parseInt(req.params.id, 10), data);
  res.json(employee);
});

// ───────────── Contracts ─────────────
const listContracts = asyncHandler(async (req, res) => {
  const contracts = await service.listContractsByEmployee(parseInt(req.params.id, 10));
  res.json(contracts);
});

const createContract = asyncHandler(async (req, res) => {
  const data = createContractSchema.parse(req.body);
  const contract = await service.createContract(data);
  res.status(201).json(contract);
});

// ───────────── Schedules ─────────────
const listSchedules = asyncHandler(async (_req, res) => {
  const schedules = await service.listSchedules();
  res.json(schedules);
});

const getSchedule = asyncHandler(async (req, res) => {
  const schedule = await service.getScheduleWithLines(parseInt(req.params.id, 10));
  res.json(schedule);
});

const createSchedule = asyncHandler(async (req, res) => {
  const data = createScheduleSchema.parse(req.body);
  const schedule = await service.createSchedule(data);
  res.status(201).json(schedule);
});

module.exports = {
  login,
  createUser,
  updateUserRole,
  getMe,
  listDepartments,
  createDepartment,
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  listContracts,
  createContract,
  listSchedules,
  getSchedule,
  createSchedule,
};
