const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const ctrl = require('./dashboard.controller');

const router = Router();

router.get('/summary', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.getSummary);
router.get('/salary-by-department', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.getSalaryByDepartment);
router.get('/salary-trend', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.getSalaryTrend);
router.get('/attendance-overview', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.getAttendanceOverview);
router.get('/time-off-overview', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.getTimeOffOverview);
router.get('/warnings', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'), ctrl.getWarnings);

module.exports = router;
