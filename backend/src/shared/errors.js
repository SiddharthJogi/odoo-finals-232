/**
 * Typed error classes for domain-specific error handling.
 * These are caught by the centralized errorHandler middleware
 * and mapped to appropriate HTTP status codes.
 */

class PayrollError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PayrollError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Unauthenticated') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(entity, id) {
    super(`${entity} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

module.exports = {
  PayrollError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
};
