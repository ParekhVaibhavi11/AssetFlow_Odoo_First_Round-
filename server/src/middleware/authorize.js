/**
 * middleware/authorize.js
 *
 * Role-Based Authorization middleware factory.
 *
 * Usage:
 *   router.post('/users', authenticate, authorize('ADMIN'), userController.create)
 *   router.get('/users',  authenticate, authorize('ADMIN'), userController.list)
 *   router.get('/auth/me', authenticate, authorize('ADMIN', 'EMPLOYEE'), authController.me)
 *
 * MUST be used AFTER authenticate() — requires req.user to be set.
 *
 * @param {...string} roles - Allowed roles. Pass multiple for OR logic.
 * @returns Express middleware function
 *
 * Errors:
 * - 403 if req.user.role is not in the allowed roles list
 */

const { sendError } = require('../utils/response');

const authorize = (...roles) => (req, res, next) => {
  // ── Safety check: authenticate() must run first ──────────────
  if (!req.user) {
    return sendError(res, 401, 'Access denied. Not authenticated.');
  }

  // ── Check if user role is allowed ────────────────────────────
  if (!roles.includes(req.user.role)) {
    return sendError(
      res,
      403,
      `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
    );
  }

  next();
};

module.exports = authorize;
