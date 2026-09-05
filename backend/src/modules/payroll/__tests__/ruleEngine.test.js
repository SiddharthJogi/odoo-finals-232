const { computePayslip } = require('../ruleEngine');
const { PayrollError } = require('../../../shared/errors');

describe('ruleEngine', () => {
  const contract = { wage: 5000 };
  const structure = { id: 1, name: 'Standard' };

  it('should process fixed, percentage, and formula rules in sequence', async () => {
    const rules = [
      { id: 1, name: 'Basic Salary', code: 'BASIC', category: 'basic', sequence: 10, calc_method: 'fixed', amount: 5000 },
      { id: 3, name: 'Tax', code: 'TAX', category: 'deduction', sequence: 30, calc_method: 'formula', formula_text: 'basic * 0.10' },
      { id: 2, name: 'HRA', code: 'HRA', category: 'allowance', sequence: 20, calc_method: 'percentage', base_code: 'BASIC', amount: 20 }
    ];

    const result = await computePayslip({ contract, structure, rules, workedDays: 30 });
    
    // BASIC = 5000
    // HRA = 5000 * 0.20 = 1000
    // TAX = 5000 * 0.10 = 500
    // Gross = 5000 + 1000 = 6000
    // Net = 6000 - 500 = 5500

    expect(result.lines).toHaveLength(3);
    
    // Ensure sorting worked (BASIC -> HRA -> TAX)
    expect(result.lines[0].label).toBe('Basic Salary');
    expect(result.lines[0].value).toBe(5000);
    
    expect(result.lines[1].label).toBe('HRA');
    expect(result.lines[1].value).toBe(1000);
    
    expect(result.lines[2].label).toBe('Tax');
    expect(result.lines[2].value).toBe(500);

    expect(result.gross_total).toBe(6000);
    expect(result.net_total).toBe(5500);
  });

  it('should throw error if percentage rule references non-existent or uncomputed base_code', async () => {
    const rules = [
      { id: 1, name: 'HRA', code: 'HRA', category: 'allowance', sequence: 10, calc_method: 'percentage', base_code: 'BASIC', amount: 20 },
      { id: 2, name: 'Basic Salary', code: 'BASIC', category: 'basic', sequence: 20, calc_method: 'fixed', amount: 5000 }
    ];

    await expect(computePayslip({ contract, structure, rules, workedDays: 30 })).rejects.toThrow(PayrollError);
    await expect(computePayslip({ contract, structure, rules, workedDays: 30 })).rejects.toThrow('which is not yet computed. Check rule sequence order');
  });

  it('should throw error if formula rule has no formula_text', async () => {
    const rules = [
      { id: 1, name: 'Tax', code: 'TAX', category: 'deduction', sequence: 30, calc_method: 'formula' }
    ];

    await expect(computePayslip({ contract, structure, rules, workedDays: 30 })).rejects.toThrow(PayrollError);
    await expect(computePayslip({ contract, structure, rules, workedDays: 30 })).rejects.toThrow('has calc_method \'formula\' but no formula_text');
  });

  it('should throw error on unknown calc_method', async () => {
    const rules = [
      { id: 1, name: 'Bonus', code: 'BONUS', category: 'allowance', sequence: 10, calc_method: 'magic' }
    ];

    await expect(computePayslip({ contract, structure, rules, workedDays: 30 })).rejects.toThrow(PayrollError);
    await expect(computePayslip({ contract, structure, rules, workedDays: 30 })).rejects.toThrow('Unknown calc_method: magic');
  });
});
