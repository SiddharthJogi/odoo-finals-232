const { asyncHandler } = require('../../shared/asyncHandler');
const service = require('./performance.service');
const { reviewSchema, payRuleSchema } = require('./performance.validation');

const listReviews = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = 6;
  const employeeId = req.user.role === 'employee' ? req.user.employeeId : (req.query.employee_id ? parseInt(req.query.employee_id, 10) : undefined);
  const result = await service.listReviews({ employeeId, status: req.user.role === 'employee' ? 'approved' : req.query.status, search: req.query.search?.trim(), limit, offset: (page - 1) * limit });
  res.json({ reviews: result.rows, pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) } });
});
const getReview = asyncHandler(async (req, res) => res.json(await service.getReview(parseInt(req.params.id, 10))));
const createReview = asyncHandler(async (req, res) => res.status(201).json(await service.createReview(reviewSchema.parse(req.body), req.user.id)));
const updateReview = asyncHandler(async (req, res) => res.json(await service.updateReview(parseInt(req.params.id, 10), reviewSchema.parse(req.body), req.user.id)));
const status = (target) => asyncHandler(async (req, res) => res.json(await service.changeStatus(parseInt(req.params.id, 10), target, req.user.id)));
const listRules = asyncHandler(async (_req, res) => res.json(await service.listRules()));
const createRule = asyncHandler(async (req, res) => res.status(201).json(await service.createRule(payRuleSchema.parse(req.body))));
const updateRule = asyncHandler(async (req, res) => res.json(await service.updateRule(parseInt(req.params.id, 10), payRuleSchema.parse(req.body))));
const listEmployeeReviews = asyncHandler(async (req, res) => res.json(await service.listEmployeeReviews(parseInt(req.params.id, 10), req.user)));
module.exports = { listReviews, getReview, createReview, updateReview, submit: status('submitted'), approve: status('approved'), reject: status('rejected'), listRules, createRule, updateRule, listEmployeeReviews };
