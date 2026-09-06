const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { HR_PAYROLL_ALL } = require('../../shared/roles');
const ctrl = require('./dashboard.controller');

const router = Router();

router.get('/summary', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getSummary);
router.get('/salary-by-department', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getSalaryByDepartment);
router.get('/salary-trend', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getSalaryTrend);
router.get('/attendance-overview', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getAttendanceOverview);
router.get('/time-off-overview', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getTimeOffOverview);
router.get('/warnings', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getWarnings);
router.post('/audit-logs', ctrl.createAuditLog);

module.exports = router;
