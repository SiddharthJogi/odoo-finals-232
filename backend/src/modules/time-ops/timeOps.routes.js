const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ADMIN_HR } = require('../../shared/roles');
const ctrl = require('./timeOps.controller');

const router = Router();

// ───────────── Attendance ─────────────
router.get('/attendance', authenticate, ctrl.listAttendances);
router.get('/attendance/active', authenticate, ctrl.getActiveAttendance);
router.get('/attendance/summary', authenticate, ctrl.getAttendanceSummary);
router.post('/attendance', authenticate, requireRole(...ADMIN_HR), ctrl.createAttendance);
router.post('/attendance/check-in', authenticate, ctrl.doCheckIn);
router.post('/attendance/check-out', authenticate, ctrl.doCheckOut);
router.patch('/attendance/:id', authenticate, requireRole(...ADMIN_HR), ctrl.correctAttendance);

// ───────────── Time Off Types ─────────────
router.get('/time-off/types', authenticate, ctrl.listTimeOffTypes);
router.get('/time-off/types/:id', authenticate, ctrl.getTimeOffType);
router.post('/time-off/types', authenticate, requireRole(...ADMIN_HR), ctrl.createTimeOffType);
router.put('/time-off/types/:id', authenticate, requireRole(...ADMIN_HR), ctrl.updateTimeOffType);

// ───────────── Allocations ─────────────
router.get('/time-off/allocations', authenticate, ctrl.listAllocations);
router.post('/time-off/allocations', authenticate, requireRole(...ADMIN_HR), ctrl.createAllocation);

// ───────────── Time Off Requests ─────────────
router.get('/time-off/responsible-users', authenticate, ctrl.listResponsibleUsers);
router.get('/time-off/requests', authenticate, ctrl.listTimeOffRequests);
router.post('/time-off/requests', authenticate, ctrl.createTimeOffRequest);
router.patch('/time-off/requests/:id/approve', authenticate, requireRole(...ADMIN_HR), ctrl.approveTimeOffRequest);
router.patch('/time-off/requests/:id/refuse', authenticate, requireRole(...ADMIN_HR), ctrl.refuseTimeOffRequest);

module.exports = router;
