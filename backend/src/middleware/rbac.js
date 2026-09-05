/**
 * RBAC middleware factory.
 * Checks req.user.role against the list of allowed roles.
 * Must be used AFTER authenticate middleware.
 *
 * Role hierarchy (from most to least privileged):
 *   admin > hr_manager > hr_payroll_manager > hr_payroll_user > employee
 *
 * @param {...string} allowedRoles - Role names that may access this route
 * @returns {import('express').RequestHandler}
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { requireRole };
