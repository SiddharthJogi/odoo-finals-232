const { evaluateFormula } = require('./safeFormula');
const { PayrollError } = require('../../shared/errors');

/**
 * Config-driven salary rule engine — the core of the payroll module.
 * See ARCHITECTURE.md §4.2.
 *
 * Fixed / Percentage / Formula rule types, executed in sequence order,
 * reading/writing a shared computation context. New allowance/deduction
 * = new DB row, zero code change.
 *
 * @param {object} params
 * @param {object} params.contract - Employee's applicable contract (must have .wage)
 * @param {object} params.structure - Salary structure record
 * @param {Array}  params.rules - Salary rules sorted by sequence
 * @param {number} params.workedDays - Number of payable days in the period
 * @param {object} params.payrollInputs - Attendance and leave metrics for the period
 * @returns {{ lines: Array, gross_total: number, net_total: number }}
 */
async function computePayslip({ contract, structure, rules, workedDays, payrollInputs = {} }) {
  const baseContractWage = Number(contract.wage);
  const payrollFactor = Number(payrollInputs.payroll_factor ?? 1);
  const context = {
    base_contract_wage: baseContractWage,
    contract_wage: Math.round(baseContractWage * payrollFactor * 100) / 100,
    payroll_wage: Math.round(baseContractWage * payrollFactor * 100) / 100,
    worked_days: workedDays,
    attendance_days: Number(payrollInputs.attendance_days || 0),
    attendance_hours: Number(payrollInputs.attendance_hours || 0),
    leave_days: Number(payrollInputs.leave_days || 0),
    unpaid_leave_days: Number(payrollInputs.unpaid_leave_days || 0),
    payroll_factor: payrollFactor,
  };
  const lines = [];

  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  for (const rule of sortedRules) {
    let value;

    switch (rule.calc_method) {
      case 'fixed':
        value = Number(rule.amount);
        break;

      case 'percentage': {
        const baseKey = (rule.base_code || '').toLowerCase();
        const baseValue = context[baseKey];
        if (baseValue === undefined) {
          throw new PayrollError(
            `Rule "${rule.name}" (code: ${rule.code}) references base_code "${rule.base_code}" which is not yet computed. Check rule sequence order.`
          );
        }
        value = baseValue * (Number(rule.amount) / 100);
        break;
      }

      case 'formula':
        if (!rule.formula_text) {
          throw new PayrollError(
            `Rule "${rule.name}" (code: ${rule.code}) has calc_method 'formula' but no formula_text`
          );
        }
        value = evaluateFormula(rule.formula_text, context);
        break;

      default:
        throw new PayrollError(`Unknown calc_method: ${rule.calc_method} on rule "${rule.name}"`);
    }

    // Store in context for downstream rules to reference
    context[rule.code.toLowerCase()] = value;

    lines.push({
      rule_id: rule.id,
      label: rule.name,
      category: rule.category,
      sequence: rule.sequence,
      value,
    });
  }

  const gross = lines
    .filter((l) => ['basic', 'allowance'].includes(l.category))
    .reduce((sum, l) => sum + l.value, 0);

  const deductions = lines
    .filter((l) => l.category === 'deduction')
    .reduce((sum, l) => sum + l.value, 0);

  return {
    lines,
    gross_total: Math.round(gross * 100) / 100,
    net_total: Math.round((gross - deductions) * 100) / 100,
  };
}

module.exports = { computePayslip };
