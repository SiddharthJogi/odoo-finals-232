const repo = require('./payroll.repository');
const { computePayslip } = require('./ruleEngine');
const hrCoreService = require('../hr-core/hrCore.service');
const db = require('../../db');
const { PayrollError, ValidationError, NotFoundError } = require('../../shared/errors');

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

      // Compute payslip via rule engine
      // workedDays: for skeleton, default to calendar days in period
      const periodDays = Math.ceil(
        (new Date(data.period_end) - new Date(data.period_start)) / (1000 * 60 * 60 * 24)
      ) + 1;

      const result = await computePayslip({
        contract,
        structure,
        rules,
        workedDays: periodDays,
      });

      // Insert payslip
      const payslip = await repo.insertPayslip({
        payrun_id: payrun.id,
        employee_id: empId,
        contract_id: contract.id,
        worked_days: periodDays,
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
    const updated = await repo.updatePayrunStatus(payrunId, targetStatus, client);
    await repo.updatePayslipStatus(payrunId, targetStatus, client);
    await client.query('COMMIT');
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

module.exports = {
  listStructures,
  getStructure,
  createStructure,
  listRulesByStructure,
  createRule,
  updateRule,
  deleteRule,
  initDraft,
  createPayrun,
  transitionPayrun,
  getPayslipWithLines,
  listPayslipsByPayrun,
  listPayruns,
  getPayrun,
};
