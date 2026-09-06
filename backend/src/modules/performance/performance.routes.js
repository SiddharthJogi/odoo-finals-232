const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const ctrl = require('./performance.controller');

const router = Router();
const managers = ['admin', 'hr_manager', 'hr_payroll_manager'];
const viewers = ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user', 'employee'];

router.get('/performance/reviews', authenticate, requireRole(...viewers), ctrl.listReviews);
router.get('/performance/reviews/:id', authenticate, requireRole(...viewers), ctrl.getReview);
router.post('/performance/reviews', authenticate, requireRole(...managers), ctrl.createReview);
router.put('/performance/reviews/:id', authenticate, requireRole(...managers), ctrl.updateReview);
router.post('/performance/reviews/:id/submit', authenticate, requireRole(...managers), ctrl.submit);
router.post('/performance/reviews/:id/approve', authenticate, requireRole(...managers), ctrl.approve);
router.post('/performance/reviews/:id/reject', authenticate, requireRole(...managers), ctrl.reject);
router.get('/performance/rules', authenticate, requireRole(...viewers), ctrl.listRules);
router.post('/performance/rules', authenticate, requireRole('admin', 'hr_payroll_manager'), ctrl.createRule);
router.put('/performance/rules/:id', authenticate, requireRole('admin', 'hr_payroll_manager'), ctrl.updateRule);
router.get('/employees/:id/performance-reviews', authenticate, requireRole(...viewers), ctrl.listEmployeeReviews);

module.exports = router;
