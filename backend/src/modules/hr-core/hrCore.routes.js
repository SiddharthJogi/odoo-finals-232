const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const ctrl = require('./hrCore.controller');

const router = Router();

// ───────────── Auth (public) ─────────────
router.post('/auth/login', ctrl.login);

// ───────────── Users (admin only, except /me) ─────────────
router.get('/users/me', authenticate, ctrl.getMe);
router.patch('/users/me/password', authenticate, ctrl.changePassword);
router.get('/users', authenticate, requireRole('admin'), ctrl.listUsers);
router.post('/users', authenticate, requireRole('admin'), ctrl.createUser);
router.patch('/users/:id/role', authenticate, requireRole('admin'), ctrl.updateUserRole);
router.delete('/users/:id', authenticate, requireRole('admin'), ctrl.deactivateUser);
router.post('/users/:id/reactivate', authenticate, requireRole('admin'), ctrl.reactivateUser);
router.get('/roles', authenticate, requireRole('admin'), ctrl.listRoles);

// ───────────── Departments ─────────────
router.get('/departments', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.listDepartments);
router.post('/departments', authenticate, requireRole('admin', 'hr_manager'), ctrl.createDepartment);

// ───────────── Employees ─────────────
router.get('/employees', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.listEmployees);
router.get('/employees/:id', authenticate, ctrl.getEmployee);
router.post('/employees', authenticate, requireRole('admin', 'hr_manager'), ctrl.createEmployee);
router.post('/employees/provision', authenticate, requireRole('admin', 'hr_manager'), ctrl.provisionEmployee);
router.put('/employees/:id', authenticate, requireRole('admin', 'hr_manager'), ctrl.updateEmployee);

// ───────────── Contracts ─────────────
router.get('/contracts', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.listAllContracts);
router.get('/contracts/:id', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.getContract);
router.get('/employees/:id/contracts', authenticate, ctrl.listContracts);
router.post('/contracts', authenticate, requireRole('admin', 'hr_manager'), ctrl.createContract);
router.put('/contracts/:id', authenticate, requireRole('admin', 'hr_manager'), ctrl.updateContract);
router.patch('/contracts/:id/status', authenticate, requireRole('admin', 'hr_manager'), ctrl.updateContractStatus);

// ───────────── Schedules ─────────────
router.get('/schedules', authenticate, requireRole('admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.listSchedules);
router.get('/schedules/:id', authenticate, ctrl.getSchedule);
router.post('/schedules', authenticate, requireRole('admin', 'hr_manager'), ctrl.createSchedule);

module.exports = router;
