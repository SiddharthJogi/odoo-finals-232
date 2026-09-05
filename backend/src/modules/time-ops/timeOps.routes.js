const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const ctrl = require('./timeOps.controller');

const router = Router();

// ───────────── Attendance ─────────────
router.get('/attendance', authenticate, ctrl.listAttendances);
router.get('/attendance/active', authenticate, ctrl.getActiveAttendance);
router.get('/attendance/summary', authenticate, ctrl.getAttendanceSummary);
router.post('/attendance', authenticate, requireRole('admin', 'hr_manager'), ctrl.createAttendance);
router.post('/attendance/check-in', authenticate, ctrl.doCheckIn);
router.post('/attendance/check-out', authenticate, ctrl.doCheckOut);
router.patch('/attendance/:id', authenticate, requireRole('admin', 'hr_manager'), ctrl.correctAttendance);

// ───────────── Time Off Types ─────────────
router.get('/time-off/types', authenticate, ctrl.listTimeOffTypes);
router.post('/time-off/types', authenticate, requireRole('admin', 'hr_manager'), ctrl.createTimeOffType);

// ───────────── Allocations ─────────────
router.get('/time-off/allocations', authenticate, ctrl.listAllocations);
router.post('/time-off/allocations', authenticate, requireRole('admin', 'hr_manager'), ctrl.createAllocation);

// ───────────── Time Off Requests ─────────────
router.get('/time-off/responsible-users', authenticate, ctrl.listResponsibleUsers);
router.get('/time-off/requests', authenticate, ctrl.listTimeOffRequests);
router.post('/time-off/requests', authenticate, ctrl.createTimeOffRequest);
router.patch('/time-off/requests/:id/approve', authenticate, requireRole('admin', 'hr_manager'), ctrl.approveTimeOffRequest);
router.patch('/time-off/requests/:id/refuse', authenticate, requireRole('admin', 'hr_manager'), ctrl.refuseTimeOffRequest);

module.exports = router;
