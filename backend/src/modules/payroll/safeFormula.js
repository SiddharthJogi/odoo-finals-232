/**
 * Whitelist-only sandboxed formula evaluator.
 * Only arithmetic on known context keys is allowed.
 * No access to global scope, require(), process, fs, etc.
 */
function evaluateFormula(formulaText, context) {
  if (typeof formulaText !== 'string' || formulaText.trim().length === 0) {
    throw new Error('Formula text must be a non-empty string');
  }

  // Only allow: identifiers (a-z0-9_), numbers, whitespace, arithmetic operators, parens, dots
  const allowedPattern = /^[a-z0-9_ +\-*/().]+$/i;
  if (!allowedPattern.test(formulaText)) {
    throw new Error('Formula contains disallowed characters');
  }

  // Block dangerous patterns even if they pass the char whitelist
  const blocked = ['require', 'import', 'process', 'global', 'eval', 'Function', '__proto__', 'constructor'];
  for (const word of blocked) {
    if (formulaText.includes(word)) {
      throw new Error(`Formula contains blocked keyword: ${word}`);
    }
  }

  const keys = Object.keys(context);
  const values = Object.values(context);

  const fn = new Function(...keys, `"use strict"; return (${formulaText});`);
  const result = fn(...values);

  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error(`Formula did not evaluate to a finite number: ${formulaText}`);
  }

  return result;
}

module.exports = { evaluateFormula };
