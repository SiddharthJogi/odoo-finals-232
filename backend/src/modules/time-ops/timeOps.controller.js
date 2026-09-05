const { asyncHandler } = require('../../shared/asyncHandler');
const service = require('./timeOps.service');
const { ValidationError } = require('../../shared/errors');
const {
  createAttendanceSchema,
  checkInSchema,
  checkOutSchema,
  correctAttendanceSchema,
  createTimeOffTypeSchema,
  createAllocationSchema,
  createTimeOffRequestSchema,
} = require('./timeOps.validation');

// ───────────── Attendance ─────────────
const listAttendances = asyncHandler(async (req, res) => {
  let employeeId = req.query.employee_id ? parseInt(req.query.employee_id, 10) : undefined;
  // Non-admin/HR roles are locked to viewing their own records
  if (req.user.role === 'employee') {
    employeeId = req.user.employeeId;
  }
  const filters = {
    employee_id: employeeId,
    status: req.query.status,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };
  const attendances = await service.listAttendances(filters);
  res.json(attendances);
});

const getActiveAttendance = asyncHandler(async (req, res) => {
  const employeeId = req.query.employee_id
    ? parseInt(req.query.employee_id, 10)
    : req.user.employeeId;

  if (!employeeId) {
    return res.json(null);
  }
  const active = await service.getActiveAttendance(employeeId);
  res.json(active);
});

const createAttendance = asyncHandler(async (req, res) => {
  const data = createAttendanceSchema.parse(req.body);
  const attendance = await service.createAttendance(data);
  res.status(201).json(attendance);
});

const doCheckIn = asyncHandler(async (req, res) => {
  const data = checkInSchema.parse(req.body);
  const employeeId = data.employee_id || req.user.employeeId;
  if (!employeeId) {
    throw new ValidationError('No employee profile linked to user');
  }
  const attendance = await service.checkIn(employeeId);
  res.status(201).json(attendance);
});

const doCheckOut = asyncHandler(async (req, res) => {
  const data = checkOutSchema.parse(req.body);
  const employeeId = data.employee_id || req.user.employeeId;
  if (!employeeId) {
    throw new ValidationError('No employee profile linked to user');
  }
  const attendance = await service.checkOut(employeeId);
  res.json(attendance);
});

const correctAttendance = asyncHandler(async (req, res) => {
  const data = correctAttendanceSchema.parse(req.body);
  const attendance = await service.correctAttendance(
    parseInt(req.params.id, 10),
    data,
    req.user.id
  );
  res.json(attendance);
});

// ───────────── Time Off Types ─────────────
const listTimeOffTypes = asyncHandler(async (_req, res) => {
  const types = await service.listTimeOffTypes();
  res.json(types);
});

const createTimeOffType = asyncHandler(async (req, res) => {
  const data = createTimeOffTypeSchema.parse(req.body);
  const type = await service.createTimeOffType(data);
  res.status(201).json(type);
});

// ───────────── Allocations ─────────────
const listAllocations = asyncHandler(async (req, res) => {
  let employeeId = req.query.employee_id ? parseInt(req.query.employee_id, 10) : undefined;
  if (req.user.role === 'employee') {
    employeeId = req.user.employeeId;
  }
  const filters = {
    employee_id: employeeId,
    type_id: req.query.type_id ? parseInt(req.query.type_id, 10) : undefined,
  };
  const allocations = await service.listAllocations(filters);
  res.json(allocations);
});

const createAllocation = asyncHandler(async (req, res) => {
  const data = createAllocationSchema.parse(req.body);
  const allocation = await service.createAllocation(data);
  res.status(201).json(allocation);
});

// ───────────── Time Off Requests ─────────────
const listTimeOffRequests = asyncHandler(async (req, res) => {
  let employeeId = req.query.employee_id ? parseInt(req.query.employee_id, 10) : undefined;
  if (req.user.role === 'employee') {
    employeeId = req.user.employeeId;
  }
  const filters = {
    employee_id: employeeId,
    status: req.query.status,
  };
  const requests = await service.listTimeOffRequests(filters);
  res.json(requests);
});

const createTimeOffRequest = asyncHandler(async (req, res) => {
  const data = createTimeOffRequestSchema.parse(req.body);
  const employeeId = req.user.role === 'employee'
    ? req.user.employeeId
    : (data.employee_id || req.user.employeeId);

  if (!employeeId) {
    throw new ValidationError('Employee ID is required to create a time off request');
  }

  const request = await service.createTimeOffRequest({
    ...data,
    employee_id: employeeId,
  });
  res.status(201).json(request);
});

const approveTimeOffRequest = asyncHandler(async (req, res) => {
  const request = await service.approveTimeOffRequest(
    parseInt(req.params.id, 10),
    req.user.id
  );
  res.json(request);
});

const refuseTimeOffRequest = asyncHandler(async (req, res) => {
  const request = await service.refuseTimeOffRequest(
    parseInt(req.params.id, 10),
    req.user.id
  );
  res.json(request);
});

module.exports = {
  listAttendances,
  getActiveAttendance,
  createAttendance,
  doCheckIn,
  doCheckOut,
  correctAttendance,
  listTimeOffTypes,
  createTimeOffType,
  listAllocations,
  createAllocation,
  listTimeOffRequests,
  createTimeOffRequest,
  approveTimeOffRequest,
  refuseTimeOffRequest,
};
