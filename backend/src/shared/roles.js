// Single source of truth for role sets used in requireRole(...) across every routes file.
// Role hierarchy (most to least privileged): admin > hr_manager > hr_payroll_manager > hr_payroll_user > employee
// Previously these sets were retyped as string literals at each call site (60+ times) — one
// site drifting out of sync (e.g. hr_manager missing from a payroll route) was a real bug.
const ADMIN = ['admin'];
const ADMIN_HR = ['admin', 'hr_manager'];
const ADMIN_HR_PAYROLL_MANAGER = ['admin', 'hr_manager', 'hr_payroll_manager'];
const HR_PAYROLL_ALL = ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'];
const HR_PAYROLL_ALL_AND_EMPLOYEE = [...HR_PAYROLL_ALL, 'employee'];
const ADMIN_PAYROLL_MANAGER = ['admin', 'hr_payroll_manager'];

module.exports = {
  ADMIN,
  ADMIN_HR,
  ADMIN_HR_PAYROLL_MANAGER,
  HR_PAYROLL_ALL,
  HR_PAYROLL_ALL_AND_EMPLOYEE,
  ADMIN_PAYROLL_MANAGER,
};
