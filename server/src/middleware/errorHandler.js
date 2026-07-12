/**
 * middleware/errorHandler.js
 *
 * Global error handling middleware.
 * Must be mounted LAST in app.js after all routes.
 *
 * Handles:
 * - Prisma known request errors (P2002 unique constraint, P2025 not found, etc.)
 * - Zod validation errors (formatted nicely)
 * - JWT errors
 * - Custom AppError instances
 * - Generic unhandled errors
 *
 * NEVER expose stack traces in production responses.
 */

const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // ── Log every error in development ──────────────────────────
  if (isDev) {
    console.error('❌ Error:', err);
  }

  // ── Zod Validation Error ─────────────────────────────────────
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 400, 'Validation failed', formattedErrors);
  }

  // ── Prisma Known Request Errors ──────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 → Unique constraint violation (e.g., duplicate email)
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return sendError(res, 409, `${field} already exists`, `Unique constraint violation on ${field}`);
    }
    // P2025 → Record not found
    if (err.code === 'P2025') {
      return sendError(res, 404, 'Record not found', err.message);
    }
    return sendError(res, 400, 'Database request error', isDev ? err.message : null);
  }

  // ── Prisma Validation Error ──────────────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, 400, 'Invalid data provided to database', isDev ? err.message : null);
  }

  // ── JWT Errors ───────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token. Please login again.', null);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Token expired. Please login again.', null);
  }

  // ── Custom App Errors (thrown manually in service layer) ─────
  if (err.isOperational) {
    return sendError(res, err.statusCode || 400, err.message, null);
  }

  // ── Generic / Unhandled Errors ───────────────────────────────
  const message = isDev ? err.message : 'Internal server error';
  return sendError(res, 500, message, isDev ? err.stack : null);
};

/**
 * AppError — Custom operational error class.
 * Throw this in service/repository layer for expected failures.
 *
 * @example throw new AppError('Email already in use', 409)
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
