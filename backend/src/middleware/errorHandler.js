const { ZodError } = require('zod');
const { PayrollError, ValidationError, AuthenticationError, ForbiddenError, NotFoundError } = require('../shared/errors');

/**
 * Centralized Express error handler.
 * Must be registered LAST with app.use(errorHandler).
 */
function errorHandler(err, _req, res, _next) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Custom typed errors
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof AuthenticationError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof ForbiddenError) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof PayrollError) {
    return res.status(422).json({ error: err.message, code: 'PAYROLL_ERROR' });
  }

  // Unexpected errors — log full stack, return generic message
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
