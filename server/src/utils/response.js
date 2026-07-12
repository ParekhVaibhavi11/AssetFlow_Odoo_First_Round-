/**
 * utils/response.js
 *
 * Consistent JSON response helpers.
 * Every controller uses these — never build raw res.json() objects.
 *
 * Success shape:
 * {
 *   success: true,
 *   message: "...",
 *   data: { ... }
 * }
 *
 * Error shape:
 * {
 *   success: false,
 *   message: "...",
 *   error: "..." | null
 * }
 */

/**
 * Send a successful JSON response.
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status (200, 201, etc.)
 * @param {string} message - Human-readable success message
 * @param {object|null} data - Response payload (omit sensitive fields before passing)
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

/**
 * Send an error JSON response.
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status (400, 401, 403, 404, 409, 500, etc.)
 * @param {string} message - Human-readable error message
 * @param {string|null} error - Technical error detail (omit in production for 5xx)
 */
const sendError = (res, statusCode = 500, message = 'Something went wrong', error = null) => {
  const payload = { success: false, message };
  if (error !== null) payload.error = error;
  return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess, sendError };
