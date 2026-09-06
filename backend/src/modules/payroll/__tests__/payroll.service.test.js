// Mock dependencies
jest.mock('../../../config', () => ({}));
jest.mock('../../../db');
jest.mock('../payroll.repository');
jest.mock('../../performance/performance.service');
jest.mock('http', () => ({
  request: jest.fn(() => ({
    on: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  })),
}));
jest.mock('../../hr-core/hrCore.service', () => ({
  getApplicableContract: jest.fn(),
  getEmployee: jest.fn(),
}));

const service = require('../payroll.service');
const repo = require('../payroll.repository');
const db = require('../../../db');
const hrCoreService = require('../../hr-core/hrCore.service');
const performanceService = require('../../performance/performance.service');
const { NotFoundError, ValidationError } = require('../../../shared/errors');

describe('payroll.service - Payrun Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock db client
    const mockClient = {
      query: jest.fn().mockResolvedValue({}),
      release: jest.fn()
    };
    db.getClient.mockResolvedValue(mockClient);
    repo.findPayslipsByPayrun.mockResolvedValue([]);
    performanceService.findApprovedPerformancePay.mockResolvedValue(null);
  });

  it('should transition payrun from draft to computed', async () => {
    repo.findPayrunById.mockResolvedValue({ id: 1, status: 'draft' });
    repo.updatePayrunStatus.mockResolvedValue({ id: 1, status: 'computed' });
    repo.updatePayslipStatus.mockResolvedValue();

    const result = await service.transitionPayrun(1, 'computed');

    expect(repo.findPayrunById).toHaveBeenCalledWith(1);
    expect(repo.updatePayrunStatus).toHaveBeenCalled();
    expect(repo.updatePayslipStatus).toHaveBeenCalled();
    expect(result.status).toBe('computed');
  });

  it('should recalculate payslips from attendance and leave inputs on Compute', async () => {
    repo.findPayrunById.mockResolvedValue({
      id: 1,
      status: 'draft',
      structure_id: 2,
      period_start: '2025-01-01',
      period_end: '2025-01-31',
    });
    repo.findStructureById.mockResolvedValue({ id: 2, name: 'Standard' });
    repo.findRulesByStructure.mockResolvedValue([
      { id: 10, name: 'Basic Salary', code: 'BASIC', category: 'basic', sequence: 10, calc_method: 'formula', formula_text: 'contract_wage' },
    ]);
    repo.findPayslipsByPayrun.mockResolvedValue([{ id: 7, employee_id: 3 }]);
    hrCoreService.getApplicableContract.mockResolvedValue({ id: 9, wage: 5000 });
    repo.findPayrollInputs.mockResolvedValue({
      period_working_days: 23,
      attendance_days: 20,
      attendance_hours: 160,
      paid_leave_days: 0,
      unpaid_leave_days: 3,
    });
    repo.updatePayslipCalculation.mockResolvedValue({ id: 7 });
    repo.deletePayslipLines.mockResolvedValue();
    repo.insertPayslipLine.mockResolvedValue({ id: 20 });
    repo.updatePayrunStatus.mockResolvedValue({ id: 1, status: 'computed' });

    const result = await service.transitionPayrun(1, 'computed');

    expect(repo.findPayrollInputs).toHaveBeenCalledWith(3, '2025-01-01', '2025-01-31');
    expect(repo.updatePayslipCalculation).toHaveBeenCalledWith(7, {
      worked_days: 20,
      gross_total: 4347.83,
      net_total: 4347.83,
    }, expect.any(Object));
    expect(repo.deletePayslipLines).toHaveBeenCalledWith(7, expect.any(Object));
    expect(repo.insertPayslipLine).toHaveBeenCalledWith(expect.objectContaining({
      payslip_id: 7,
      value: 4347.83,
    }), expect.any(Object));
    expect(result.status).toBe('computed');
  });

  it('should transition payrun from computed to validated', async () => {
    repo.findPayrunById.mockResolvedValue({ id: 1, status: 'computed' });
    repo.updatePayrunStatus.mockResolvedValue({ id: 1, status: 'validated' });

    const result = await service.transitionPayrun(1, 'validated');
    expect(result.status).toBe('validated');
  });

  it('should transition payrun from validated to paid', async () => {
    repo.findPayrunById.mockResolvedValue({ id: 1, status: 'validated' });
    repo.updatePayrunStatus.mockResolvedValue({ id: 1, status: 'paid' });

    const result = await service.transitionPayrun(1, 'paid');
    expect(result.status).toBe('paid');
  });

  it('should throw ValidationError if transition is invalid (e.g., draft to validated)', async () => {
    repo.findPayrunById.mockResolvedValue({ id: 1, status: 'draft' });

    await expect(service.transitionPayrun(1, 'validated')).rejects.toThrow(ValidationError);
    await expect(service.transitionPayrun(1, 'validated')).rejects.toThrow("Cannot transition payrun from 'draft' to 'validated'");

    expect(repo.updatePayrunStatus).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError if payrun does not exist', async () => {
    repo.findPayrunById.mockResolvedValue(null);

    await expect(service.transitionPayrun(999, 'computed')).rejects.toThrow(NotFoundError);
  });
});

describe('payroll.service - Payslip Explanation', () => {
  it('should summarize stored payslip totals and compliance status', async () => {
    repo.findPayslipById.mockResolvedValue({
      id: 7,
      employee_name: 'Asha Patel',
      worked_days: 26,
      gross_total: '50000.00',
      net_total: '46000.00',
      has_warning: true,
      warning_reason: 'Missing bank account information',
    });
    repo.findPayslipLines.mockResolvedValue([
      { category: 'earning', value: '50000.00' },
      { category: 'deduction', value: '4000.00' },
    ]);

    await expect(service.explainPayslip(7)).resolves.toEqual({
      payslip_id: 7,
      employee_name: 'Asha Patel',
      worked_days: 26,
      earnings_count: 1,
      deductions_count: 1,
      gross_total: 50000,
      deduction_total: 4000,
      net_total: 46000,
      compliance: {
        has_warning: true,
        warning_reason: 'Missing bank account information',
        message: 'Action needed: Missing bank account information',
      },
    });
  });
});
