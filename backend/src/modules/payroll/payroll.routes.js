const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const ctrl = require('./payroll.controller');

const router = Router();

// ───────────── Structures ─────────────
router.get('/structures', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'), ctrl.listStructures);
router.get('/structures/:id', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'), ctrl.getStructure);
router.post('/structures', authenticate, requireRole('admin', 'hr_payroll_manager'), ctrl.createStructure);

// ───────────── Rules ─────────────
router.get('/rules', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'), ctrl.listRules);
router.post('/rules', authenticate, requireRole('admin', 'hr_payroll_manager'), ctrl.createRule);
router.put('/rules/:id', authenticate, requireRole('admin', 'hr_payroll_manager'), ctrl.updateRule);
router.delete('/rules/:id', authenticate, requireRole('admin', 'hr_payroll_manager'), ctrl.deleteRule);

// ───────────── Payruns ─────────────
router.get('/payruns', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'), ctrl.listPayruns);
router.get('/payruns/:id', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'), ctrl.getPayrun);
router.get('/payruns/:id/payslips', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'), ctrl.listPayslipsByPayrun);
router.post('/payruns/draft', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.initDraft);
router.post('/payruns', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.createPayrun);
router.patch('/payruns/:id/compute', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.computePayrun);
router.patch('/payruns/:id/validate', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.validatePayrun);
router.patch('/payruns/:id/mark-paid', authenticate, requireRole('admin', 'hr_payroll_manager', 'hr_payroll_user'), ctrl.markPaid);
router.post('/payruns/:id/send-payslips', authenticate, requireRole('admin', 'hr_payroll_manager'), ctrl.sendPayslips);

// ───────────── Payslips ─────────────
router.get('/payslips/:id', authenticate, ctrl.getPayslip);
router.get('/payslips/:id/explanation', authenticate, ctrl.explainPayslip);
router.get('/payslips/:id/pdf', authenticate, ctrl.getPayslipPdf);

module.exports = router;
