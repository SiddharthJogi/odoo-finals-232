const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ADMIN_HR_PAYROLL_MANAGER, HR_PAYROLL_ALL, HR_PAYROLL_ALL_AND_EMPLOYEE } = require('../../shared/roles');
const ctrl = require('./payroll.controller');

const router = Router();

// ───────────── Structures ─────────────
router.get('/structures', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.listStructures);
router.get('/structures/:id', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getStructure);
router.post('/structures', authenticate, requireRole(...ADMIN_HR_PAYROLL_MANAGER), ctrl.createStructure);
router.put('/structures/:id', authenticate, requireRole(...ADMIN_HR_PAYROLL_MANAGER), ctrl.updateStructure);

// ───────────── Rules ─────────────
router.get('/rules', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.listRules);
router.get('/performance-rules', authenticate, requireRole(...HR_PAYROLL_ALL_AND_EMPLOYEE), ctrl.listPerformanceRules);
router.post('/rules', authenticate, requireRole(...ADMIN_HR_PAYROLL_MANAGER), ctrl.createRule);
router.put('/rules/:id', authenticate, requireRole(...ADMIN_HR_PAYROLL_MANAGER), ctrl.updateRule);
router.delete('/rules/:id', authenticate, requireRole(...ADMIN_HR_PAYROLL_MANAGER), ctrl.deleteRule);

// ───────────── Payruns ─────────────
router.get('/payruns', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.listPayruns);
router.get('/payruns/:id', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.getPayrun);
router.get('/payruns/:id/payslips', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.listPayslipsByPayrun);
router.post('/payruns/draft', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.initDraft);
router.post('/payruns', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.createPayrun);
router.patch('/payruns/:id/compute', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.computePayrun);
router.patch('/payruns/:id/validate', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.validatePayrun);
router.patch('/payruns/:id/mark-paid', authenticate, requireRole(...HR_PAYROLL_ALL), ctrl.markPaid);
router.post('/payruns/:id/send-payslips', authenticate, requireRole(...ADMIN_HR_PAYROLL_MANAGER), ctrl.sendPayslips);

// ───────────── Payslips ─────────────
router.get('/payslips/:id', authenticate, ctrl.getPayslip);
router.get('/payslips/:id/explanation', authenticate, ctrl.explainPayslip);
router.get('/payslips/:id/pdf', authenticate, ctrl.getPayslipPdf);

module.exports = router;
