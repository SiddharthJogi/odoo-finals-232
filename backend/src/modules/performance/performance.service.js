const repo = require('./performance.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../shared/errors');

function calculatePay(totalPoints, rule, wage = null) {
  if (totalPoints < Number(rule.minimum_points)) return 0;
  let amount = totalPoints * Number(rule.point_value);
  if (rule.maximum_payout !== null && rule.maximum_payout !== undefined) amount = Math.min(amount, Number(rule.maximum_payout));
  if (rule.maximum_wage_percent !== null && wage !== null) amount = Math.min(amount, Number(wage) * Number(rule.maximum_wage_percent) / 100);
  return Math.round(Math.max(0, amount) * 100) / 100;
}

function normalizeLines(lines) {
  const seen = new Set();
  for (const line of lines) {
    if (seen.has(line.criterion)) throw new ValidationError('Each performance criterion may appear only once');
    seen.add(line.criterion);
  }
  return lines;
}

async function enrich(data) {
  const employee = await repo.findEmployee(data.employee_id);
  if (!employee) throw new NotFoundError('Employee', data.employee_id);
  if (employee.status !== 'active') throw new ValidationError('Inactive employees cannot receive new performance reviews');
  const rule = (data.pay_rule_id && await repo.findRule(data.pay_rule_id)) || (await repo.listRules()).find((item) => item.is_active);
  if (!rule) throw new ValidationError('No active performance pay rule configured');
  const lines = normalizeLines(data.lines);
  const totalPoints = Math.round(lines.reduce((sum, line) => sum + Number(line.score), 0) * 100) / 100;
  return { ...data, lines, total_points: totalPoints, performance_pay: calculatePay(totalPoints, rule, data.wage), pay_rule_id: rule.id };
}

async function listReviews(filters) { return repo.listReviews(filters); }
async function getReview(id) { const review = await repo.findReview(id); if (!review) throw new NotFoundError('PerformanceReview', id); return review; }
async function createReview(data, reviewerId) { const enriched = await enrich({ ...data, reviewer_id: reviewerId }); const id = await repo.insertReview(enriched); return getReview(id); }
async function updateReview(id, data, reviewerId) {
  const existing = await getReview(id);
  if (existing.reviewer_id !== reviewerId) throw new ForbiddenError('Only the reviewer may edit this review');
  const enriched = await enrich({ ...data, employee_id: existing.employee_id, reviewer_id: reviewerId });
  const updated = await repo.updateReview(id, enriched);
  if (!updated) throw new ValidationError('Only draft reviews can be edited');
  return updated;
}
async function changeStatus(id, status, userId) {
  const review = await getReview(id);
  if (status === 'submitted' && review.status !== 'draft') throw new ValidationError('Only draft reviews can be submitted');
  if (status === 'approved' && review.status !== 'submitted') throw new ValidationError('Only submitted reviews can be approved');
  if (status === 'rejected' && !['submitted', 'approved'].includes(review.status)) throw new ValidationError('Only submitted or approved reviews can be rejected');
  return repo.changeStatus(id, status, userId);
}
async function listRules() { return repo.listRules(); }
async function createRule(data) { return repo.insertRule(data); }
async function updateRule(id, data) { const updated = await repo.updateRule(id, data); if (!updated) throw new NotFoundError('PerformancePayRule', id); return updated; }
async function listEmployeeReviews(employeeId, user) {
  if (user.role === 'employee' && user.employeeId !== employeeId) throw new ForbiddenError('Employees may only view their own reviews');
  return listReviews({ employeeId, status: 'approved', limit: 50, offset: 0 });
}

module.exports = { calculatePay, listReviews, getReview, createReview, updateReview, changeStatus, listRules, createRule, updateRule, listEmployeeReviews };
