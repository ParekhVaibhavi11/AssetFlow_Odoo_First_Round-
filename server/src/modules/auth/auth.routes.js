const { Router } = require('express');
const authController = require('./auth.controller');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema, changePasswordSchema } = require('./auth.validation');

const router = Router();

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES (no JWT required)
// ─────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Admin one-time registration.
 * Returns 409 if admin already exists.
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * POST /auth/login
 * Login for Admin and Employee.
 * Returns { token, user, requirePasswordChange }
 */
router.post('/login', validate(loginSchema), authController.login);

// ─────────────────────────────────────────────────────────────
// PROTECTED ROUTES (JWT required — any role)
// ─────────────────────────────────────────────────────────────

/**
 * POST /auth/change-password
 * First-login password change for employees.
 * Also usable for general password changes.
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * GET /auth/me
 * Get current user profile.
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
