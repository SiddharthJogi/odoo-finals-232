const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ADMIN, ADMIN_HR, HR_PAYROLL_ALL } = require('../../shared/roles');
const ctrl = require('./hrCore.controller');

const router = Router();

// ───────────── Auth (public) ─────────────
router.post('/auth/login', ctrl.login);

// ───────────── Users (admin only, except /me) ─────────────
router.get('/users/me', authenticate, ctrl.getMe);
router.patch('/users/me/password', authenticate, ctrl.changePassword);
router.patch('/users/me/onboarding-seen', authenticate, ctrl.markOnboardingSeen);
router.get('/users', authenticate, requireRole(...ADMIN), ctrl.listUsers);
router.post('/users', authenticate, requireRole(...ADMIN), ctrl.createUser);
router.patch('/users/:id/role', authenticate, requireRole(...ADMIN), ctrl.updateUserRole);
router.delete('/users/:id', authenticate, requireRole(...ADMIN), ctrl.deactivateUser);
router.post('/users/:id/reactivate', authenticate, requireRole(...ADMIN), ctrl.reactivateUser);
router.get('/roles', authenticate, requireRole(...ADMIN), ctrl.listRoles);

// ───────────── Departments ─────────────
router.get('/departments', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.listDepartments);
router.post('/departments', authenticate, requireRole(...ADMIN_HR), ctrl.createDepartment);

// ───────────── Employees ─────────────
router.get('/employees', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.listEmployees);
router.get('/employees/:id', authenticate, ctrl.getEmployee);
router.post('/employees', authenticate, requireRole(...ADMIN_HR), ctrl.createEmployee);
router.post('/employees/provision', authenticate, requireRole(...ADMIN_HR), ctrl.provisionEmployee);
router.put('/employees/:id', authenticate, requireRole(...ADMIN_HR), ctrl.updateEmployee);

// ───────────── Department Change Requests ─────────────
router.post('/employees/:id/department-requests', authenticate, requireRole(...ADMIN_HR), ctrl.requestDepartmentChange);
router.get('/department-requests', authenticate, requireRole(...ADMIN_HR), ctrl.listDepartmentChangeRequests);
router.patch('/department-requests/:id/approve', authenticate, requireRole(...ADMIN), ctrl.approveDepartmentChangeRequest);
router.patch('/department-requests/:id/reject', authenticate, requireRole(...ADMIN), ctrl.rejectDepartmentChangeRequest);

// ───────────── Contracts ─────────────
router.get('/contracts', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.listAllContracts);
router.get('/contracts/:id', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getContract);
router.get('/employees/:id/contracts', authenticate, ctrl.listContracts);
router.post('/contracts', authenticate, requireRole(...ADMIN_HR), ctrl.createContract);
router.put('/contracts/:id', authenticate, requireRole(...ADMIN_HR), ctrl.updateContract);
router.patch('/contracts/:id/status', authenticate, requireRole(...ADMIN_HR), ctrl.updateContractStatus);

// ───────────── Schedules ─────────────
router.get('/schedules', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.listSchedules);
router.get('/schedules/:id', authenticate, ctrl.getSchedule);
router.post('/schedules', authenticate, requireRole(...ADMIN_HR), ctrl.createSchedule);
router.put('/schedules/:id', authenticate, requireRole(...ADMIN_HR), ctrl.updateSchedule);
router.delete('/schedules/:id', authenticate, requireRole(...ADMIN_HR), ctrl.archiveSchedule);

module.exports = router;
