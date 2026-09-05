const { asyncHandler } = require('../../shared/asyncHandler');
const service = require('./hrCore.service');
const {
  loginSchema,
  createUserSchema,
  updateRoleSchema,
  changePasswordSchema,
  createEmployeeSchema,
  provisionEmployeeSchema,
  updateEmployeeSchema,
  createContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
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

const changePassword = asyncHandler(async (req, res) => {
  const data = changePasswordSchema.parse(req.body);
  const user = await service.changePassword(req.user.id, data.current_password, data.new_password);
  res.json({ id: user.id, email: user.email, message: 'Password changed successfully' });
});

const deactivateUser = asyncHandler(async (req, res) => {
  const user = await service.deactivateUser(req.user.id, parseInt(req.params.id, 10));
  res.json(user);
});

const reactivateUser = asyncHandler(async (req, res) => {
  const user = await service.reactivateUser(req.user.id, parseInt(req.params.id, 10));
  res.json(user);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await service.getUserProfile(req.user.id);
  res.json(user);
});

const listUsers = asyncHandler(async (_req, res) => {
  const users = await service.listAllUsers();
  res.json(users);
});

const listRoles = asyncHandler(async (_req, res) => {
  const roles = await service.listAllRoles();
  res.json(roles);
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

const provisionEmployee = asyncHandler(async (req, res) => {
  const data = provisionEmployeeSchema.parse(req.body);
  const result = await service.provisionEmployee(req.user, data);
  res.status(201).json(result);
});

const updateEmployee = asyncHandler(async (req, res) => {
  const data = updateEmployeeSchema.parse(req.body);
  const employee = await service.updateEmployee(parseInt(req.params.id, 10), data);
  res.json(employee);
});

// ───────────── Contracts ─────────────
const listAllContracts = asyncHandler(async (req, res) => {
  const contracts = await service.listAllContracts();
  res.json(contracts);
});

const getContract = asyncHandler(async (req, res) => {
  const contract = await service.getContract(parseInt(req.params.id, 10));
  res.json(contract);
});

const listContracts = asyncHandler(async (req, res) => {
  const contracts = await service.listContractsByEmployee(parseInt(req.params.id, 10));
  res.json(contracts);
});

const createContract = asyncHandler(async (req, res) => {
  const data = createContractSchema.parse(req.body);
  const contract = await service.createContract(data);
  res.status(201).json(contract);
});

const updateContract = asyncHandler(async (req, res) => {
  const data = updateContractSchema.parse(req.body);
  const contract = await service.updateContract(parseInt(req.params.id, 10), data);
  res.json(contract);
});

const updateContractStatus = asyncHandler(async (req, res) => {
  const { status } = updateContractStatusSchema.parse(req.body);
  const contract = await service.updateContractStatus(parseInt(req.params.id, 10), status);
  res.json(contract);
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
  changePassword,
  deactivateUser,
  reactivateUser,
  getMe,
  listUsers,
  listRoles,
  listDepartments,
  createDepartment,
  listEmployees,
  getEmployee,
  createEmployee,
  provisionEmployee,
  updateEmployee,
  listAllContracts,
  getContract,
  listContracts,
  createContract,
  updateContract,
  updateContractStatus,
  listSchedules,
  getSchedule,
  createSchedule,
};
