const { asyncHandler } = require('../../shared/asyncHandler');
const service = require('./dashboard.service');

const getSummary = asyncHandler(async (req, res) => {
  const filters = {
    period_start: req.query.period_start,
    period_end: req.query.period_end,
    department_id: req.query.dept ? parseInt(req.query.dept, 10) : undefined,
    employee_type: req.query.type,
    company_id: req.query.company ? parseInt(req.query.company, 10) : undefined,
  };
  const summary = await service.getSummary(filters);
  res.json(summary);
});

const getSalaryByDepartment = asyncHandler(async (req, res) => {
  const data = await service.getSalaryByDepartment({
    period_start: req.query.period_start,
    period_end: req.query.period_end,
  });
  res.json(data);
});

const getSalaryTrend = asyncHandler(async (_req, res) => {
  const data = await service.getSalaryTrend();
  res.json(data);
});

const getAttendanceOverview = asyncHandler(async (_req, res) => {
  const data = await service.getAttendanceOverview();
  res.json(data);
});

const getTimeOffOverview = asyncHandler(async (_req, res) => {
  const data = await service.getTimeOffOverview();
  res.json(data);
});

const getWarnings = asyncHandler(async (_req, res) => {
  const data = await service.getWarnings();
  res.json(data);
});

const createAuditLog = asyncHandler(async (req, res) => {
  const log = await service.createAuditLog(req.body);
  res.status(201).json(log);
});

module.exports = {
  getSummary,
  getSalaryByDepartment,
  getSalaryTrend,
  getAttendanceOverview,
  getTimeOffOverview,
  getWarnings,
  createAuditLog,
};
