const { evaluateFormula } = require('../safeFormula');

describe('safeFormula Sandbox', () => {
  it('should evaluate simple arithmetic', () => {
    const context = { basic: 5000, allowance: 200 };
    const result = evaluateFormula('basic + allowance * 2', context);
    expect(result).toBe(5400); // 5000 + 400
  });

  it('should evaluate expressions with parens', () => {
    const context = { a: 100, b: 50, c: 2 };
    const result = evaluateFormula('(a + b) * c', context);
    expect(result).toBe(300);
  });

  it('should throw error for disallowed characters', () => {
    const context = { a: 10 };
    // The pattern allows a-z0-9_ +\-*/().
    // So something like '%' or '^' should fail
    expect(() => evaluateFormula('a % 2', context)).toThrow('Formula contains disallowed characters');
    expect(() => evaluateFormula('a ^ 2', context)).toThrow('Formula contains disallowed characters');
  });

  it('should throw error for blocked keywords', () => {
    const context = { a: 10 };
    const blocked = ['require', 'import', 'process', 'global', 'eval', 'Function', '__proto__', 'constructor'];
    
    blocked.forEach(word => {
      expect(() => evaluateFormula(`a + ${word}`, context)).toThrow(`Formula contains blocked keyword: ${word}`);
    });
  });

  it('should throw error for empty or non-string inputs', () => {
    const context = { a: 10 };
    expect(() => evaluateFormula('', context)).toThrow('Formula text must be a non-empty string');
    expect(() => evaluateFormula('   ', context)).toThrow('Formula text must be a non-empty string');
    expect(() => evaluateFormula(null, context)).toThrow('Formula text must be a non-empty string');
  });

  it('should throw error if result is not a finite number', () => {
    const context = { a: 10, b: 0 };
    // Division by zero gives Infinity in JS, which is not finite
    expect(() => evaluateFormula('a / b', context)).toThrow('Formula did not evaluate to a finite number: a / b');
  });
});
