/**
 * Wraps an async Express route handler so thrown errors
 * are forwarded to next() instead of crashing the process.
 *
 * Usage:
 *   router.get('/foo', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn - Async request handler (req, res, next) => Promise
 * @returns {import('express').RequestHandler}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
