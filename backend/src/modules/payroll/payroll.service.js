const repo = require('./payroll.repository');
const { computePayslip } = require('./ruleEngine');
const hrCoreService = require('../hr-core/hrCore.service');
const db = require('../../db');
const { PayrollError, ValidationError, NotFoundError } = require('../../shared/errors');

async function getPayrollInputs(employeeId, periodStart, periodEnd) {
  const raw = await repo.findPayrollInputs(employeeId, periodStart, periodEnd);
  const periodWorkingDays = Number(raw.period_working_days || 0);
  const attendanceDays = Number(raw.attendance_days || 0);
  const paidLeaveDays = Number(raw.paid_leave_days || 0);
  const unpaidLeaveDays = Number(raw.unpaid_leave_days || 0);
  const payableDays = Math.max(0, Math.min(
    periodWorkingDays,
    attendanceDays + paidLeaveDays
  ));

  return {
    ...raw,
    attendance_days: attendanceDays,
    attendance_hours: Number(raw.attendance_hours || 0),
    leave_days: paidLeaveDays + unpaidLeaveDays,
    unpaid_leave_days: unpaidLeaveDays,
    worked_days: payableDays,
    payroll_factor: periodWorkingDays > 0 ? payableDays / periodWorkingDays : 0,
  };
}

async function calculateEmployeePayslip({ employeeId, contract, structure, rules, periodStart, periodEnd }) {
  const payrollInputs = await getPayrollInputs(employeeId, periodStart, periodEnd);
  const result = await computePayslip({
    contract,
    structure,
    rules,
    workedDays: payrollInputs.worked_days,
    payrollInputs,
  });
  return { ...result, payrollInputs };
}

// ───────────── Salary Structures ─────────────
async function listStructures() {
  return repo.findAllStructures();
}

async function getStructure(id) {
  const structure = await repo.findStructureById(id);
  if (!structure) throw new NotFoundError('SalaryStructure', id);
  return structure;
}

async function createStructure(data) {
  return repo.insertStructure(data);
}

async function updateStructure(id, data) {
  const structure = await getStructure(id);
  if (!structure) throw new NotFoundError('Salary Structure', id);
  return repo.updateStructure(id, data);
}

// ───────────── Salary Rules ─────────────
async function listRulesByStructure(structureId) {
  return repo.findRulesByStructure(structureId);
}

async function createRule(data) {
  return repo.insertRule(data);
}

async function updateRule(id, data) {
  const rule = await repo.updateRule(id, data);
  if (!rule) throw new NotFoundError('SalaryRule', id);
  return rule;
}

async function deleteRule(id) {
  const deleted = await repo.deleteRule(id);
  if (!deleted) throw new NotFoundError('SalaryRule', id);
  return { deleted: true };
}

// ───────────── Payrun Lifecycle ─────────────

/**
 * Step 1: Draft — given a structure and period, return eligible employees.
 */
async function initDraft(structureId, periodStart, periodEnd, employeeTypeFilter) {
  const structure = await repo.findStructureById(structureId);
  if (!structure) throw new ValidationError('Invalid structure_id');

  const eligible = await repo.findEligibleEmployees(structureId, periodStart, periodEnd, employeeTypeFilter);
  return { structure, eligible_employees: eligible };
}

/**
 * Step 2: Create payrun + compute payslips for selected employees.
 */
async function createPayrun(data, createdBy) {
  const structure = await repo.findStructureById(data.structure_id);
  if (!structure) throw new ValidationError('Invalid structure_id');

  const rules = await repo.findRulesByStructure(data.structure_id);
  if (rules.length === 0) {
    throw new PayrollError('Salary structure has no rules configured');
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Create the payrun
    const payrun = await repo.insertPayrun({
      name: data.name,
      structure_id: data.structure_id,
      period_start: data.period_start,
      period_end: data.period_end,
      employee_type_filter: data.employee_type_filter,
      created_by: createdBy,
    });

    const warnings = [];

    // Create payslip per employee
    for (const empId of data.employee_ids) {
      // Check for duplicate
      const existing = await repo.findExistingPayslip(payrun.id, empId);
      if (existing) {
        warnings.push({ employee_id: empId, reason: 'Duplicate payslip — skipped' });
        continue;
      }

      // Get applicable contract (cross-module via service, not direct SQL)
      let contract;
      try {
        contract = await hrCoreService.getApplicableContract(empId, data.period_start, data.period_end);
      } catch (err) {
        if (err instanceof PayrollError) {
          warnings.push({ employee_id: empId, reason: err.message });
          continue;
        }
        throw err;
      }

      // Check for missing bank info
      const employee = await hrCoreService.getEmployee(empId);
      let hasWarning = false;
      let warningReason = null;
      if (!employee.bank_account) {
        hasWarning = true;
        warningReason = 'Missing bank account information';
      }

      const result = await calculateEmployeePayslip({
        employeeId: empId,
        contract,
        structure,
        rules,
        periodStart: data.period_start,
        periodEnd: data.period_end,
      });

      // Insert payslip
      const payslip = await repo.insertPayslip({
        payrun_id: payrun.id,
        employee_id: empId,
        contract_id: contract.id,
        worked_days: result.payrollInputs.worked_days,
        gross_total: result.gross_total,
        net_total: result.net_total,
        has_warning: hasWarning,
        warning_reason: warningReason,
      }, client);

      // Insert payslip lines
      for (const line of result.lines) {
        await repo.insertPayslipLine({
          payslip_id: payslip.id,
          rule_id: line.rule_id,
          label: line.label,
          category: line.category,
          sequence: line.sequence,
          value: line.value,
        }, client);
      }
    }

    await client.query('COMMIT');
    return { payrun, warnings };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Status transitions: draft → computed → validated → paid
 */
const VALID_TRANSITIONS = {
  draft: 'computed',
  computed: 'validated',
  validated: 'paid',
};

const config = require('../../config');
const http = require('http');

function triggerAsyncAnomalyScan(payrunId) {
  try {
    const aiUrl = new URL(config.aiServiceUrl || 'http://localhost:8001');
    const postData = JSON.stringify({ payrun_id: parseInt(payrunId, 10) });
    const req = http.request({
      hostname: aiUrl.hostname,
      port: aiUrl.port || 8001,
      path: '/ai/anomaly-scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      res.on('data', () => { });
    });
    req.on('error', (err) => {
      console.warn('AI Anomaly Scan trigger failed silently:', err.message);
    });
    req.write(postData);
    req.end();
  } catch (err) {
    console.warn('Failed to trigger AI anomaly scan:', err.message);
  }
}

async function transitionPayrun(payrunId, targetStatus) {
  const payrun = await repo.findPayrunById(payrunId);
  if (!payrun) throw new NotFoundError('Payrun', payrunId);

  const expectedNext = VALID_TRANSITIONS[payrun.status];
  if (expectedNext !== targetStatus) {
    throw new ValidationError(
      `Cannot transition payrun from '${payrun.status}' to '${targetStatus}'. Expected next: '${expectedNext || 'none (already terminal)'}'`
    );
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    if (targetStatus === 'computed') {
      const structure = await repo.findStructureById(payrun.structure_id);
      const rules = await repo.findRulesByStructure(payrun.structure_id);
      const payslips = (await repo.findPayslipsByPayrun(payrunId)) || [];

      for (const payslip of payslips) {
        const contract = await hrCoreService.getApplicableContract(
          payslip.employee_id,
          payrun.period_start,
          payrun.period_end
        );
        const result = await calculateEmployeePayslip({
          employeeId: payslip.employee_id,
          contract,
          structure,
          rules,
          periodStart: payrun.period_start,
          periodEnd: payrun.period_end,
        });
        await repo.updatePayslipCalculation(payslip.id, {
          worked_days: result.payrollInputs.worked_days,
          gross_total: result.gross_total,
          net_total: result.net_total,
        }, client);
        await repo.deletePayslipLines(payslip.id, client);
        for (const line of result.lines) {
          await repo.insertPayslipLine({
            payslip_id: payslip.id,
            rule_id: line.rule_id,
            label: line.label,
            category: line.category,
            sequence: line.sequence,
            value: line.value,
          }, client);
        }
      }
    }
    const updated = await repo.updatePayrunStatus(payrunId, targetStatus, client);
    await repo.updatePayslipStatus(payrunId, targetStatus, client);
    await client.query('COMMIT');

    if (targetStatus === 'validated') {
      triggerAsyncAnomalyScan(payrunId);
    }

    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ───────────── Payslip View ─────────────
async function getPayslipWithLines(id) {
  const payslip = await repo.findPayslipById(id);
  if (!payslip) throw new NotFoundError('Payslip', id);

  const lines = await repo.findPayslipLines(id);
  return { ...payslip, lines };
}

async function explainPayslip(id) {
  const payslip = await getPayslipWithLines(id);
  const earnings = payslip.lines.filter((line) => line.category !== 'deduction');
  const deductions = payslip.lines.filter((line) => line.category === 'deduction');
  const grossTotal = Number(payslip.gross_total);
  const netTotal = Number(payslip.net_total);
  const deductionTotal = Math.round((grossTotal - netTotal) * 100) / 100;

  return {
    payslip_id: payslip.id,
    employee_name: payslip.employee_name,
    worked_days: payslip.worked_days,
    earnings_count: earnings.length,
    deductions_count: deductions.length,
    gross_total: grossTotal,
    deduction_total: deductionTotal,
    net_total: netTotal,
    compliance: {
      has_warning: Boolean(payslip.has_warning),
      warning_reason: payslip.warning_reason || null,
      message: payslip.has_warning
        ? `Action needed: ${payslip.warning_reason}`
        : 'No compliance warnings were found for this payslip.',
    },
  };
}

async function listPayslipsByPayrun(payrunId) {
  return repo.findPayslipsByPayrun(payrunId);
}

async function listPayruns() {
  return repo.findAllPayruns();
}

async function getPayrun(id) {
  const payrun = await repo.findPayrunById(id);
  if (!payrun) throw new NotFoundError('Payrun', id);
  return payrun;
}

async function sendPayslips(payrunId, userId) {
  const payrun = await repo.findPayrunById(payrunId);
  if (!payrun) throw new NotFoundError('Payrun', payrunId);

  const payslips = await repo.findPayslipsByPayrun(payrunId);
  if (payslips.length === 0) {
    throw new ValidationError('No payslips found for this payrun');
  }

  const mailer = require('../hr-core/mailer');
  const { generatePayslipPdfBuffer } = require('./pdfGenerator');
  let successCount = 0;

  for (const p of payslips) {
    try {
      if (!p.employee_email) continue;
      
      const fullPayslip = await getPayslipWithLines(p.id);
      const pdfBuffer = await generatePayslipPdfBuffer(fullPayslip);
      
      await mailer.sendPayslipEmail({
        email: p.employee_email,
        name: p.employee_name || 'Employee',
        payrunName: payrun.name,
        pdfBuffer,
      });
      successCount++;
    } catch (error) {
      console.error(`Failed to send payslip ${p.id} to ${p.employee_email}:`, error);
    }
  }

  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId || null, 'send_payslips', 'payrun', payrunId, `Dispatched ${successCount} payslips via email service for payrun #${payrunId} (${payrun.name})`]
  );

  return {
    success: true,
    count: successCount,
    message: `Dispatched ${successCount} payslips via email to registered employees.`,
  };
}

module.exports = {
  listStructures,
  getStructure,
  createStructure,
  updateStructure,
  listRulesByStructure,
  createRule,
  updateRule,
  deleteRule,
  initDraft,
  createPayrun,
  transitionPayrun,
  getPayslipWithLines,
  explainPayslip,
  listPayslipsByPayrun,
  listPayruns,
  getPayrun,
  sendPayslips,
};

