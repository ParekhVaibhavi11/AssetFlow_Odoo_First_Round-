/**
 * modules/auth/auth.controller.js
 *
 * HTTP layer for auth routes.
 * Controllers ONLY handle:
 *   1. Extracting data from req
 *   2. Calling the appropriate service method
 *   3. Sending the HTTP response
 *
 * No business logic here. No Prisma queries here.
 * All errors are forwarded to the global errorHandler via next(err).
 */

const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/response');

const authController = {
  /**
   * POST /auth/register
   * Admin one-time registration.
   */
  register: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register({ name, email, password });

      return sendSuccess(res, 201, 'Admin registered successfully', result.user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/login
   * Login for Admin and Employee. Same endpoint, role-agnostic.
   * Response includes requirePasswordChange flag for frontend routing.
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      return sendSuccess(res, 200, 'Login successful', {
        token: result.token,
        user: result.user,
        requirePasswordChange: result.requirePasswordChange,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/change-password
   * First-login (or general) password change.
   * Requires: authenticate() middleware (req.user must be set).
   */
  changePassword: async (req, res, next) => {
    try {
      const { userId } = req.user; // Injected by authenticate middleware
      const { oldPassword, newPassword } = req.body;

      const result = await authService.changePassword(userId, { oldPassword, newPassword });

      return sendSuccess(res, 200, result.message);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /auth/me
   * Returns the current authenticated user's profile.
   * Requires: authenticate() middleware.
   */
  me: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const result = await authService.getMe(userId);

      return sendSuccess(res, 200, 'User profile retrieved', result.user);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
