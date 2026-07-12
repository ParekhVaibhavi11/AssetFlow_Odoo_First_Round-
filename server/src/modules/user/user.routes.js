/**
 * modules/user/user.routes.js
 *
 * User management route definitions.
 * All routes here require authentication + ADMIN role.
 */

const { Router } = require('express');
const userController = require('./user.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { createEmployeeSchema } = require('./user.validation');
const { ROLES } = require('../../constants/roles');

const router = Router();

// All /users routes require: valid JWT + ADMIN role
// ─────────────────────────────────────────────────────────────

/**
 * POST /users
 * Admin creates a new employee.
 * Chain: authenticate → authorize(ADMIN) → validate → controller
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(createEmployeeSchema),
  userController.create
);

/**
 * GET /users
 * Admin gets all users.
 */
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  userController.list
);

/**
 * GET /users/:id
 * Admin gets a specific user.
 */
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  userController.getById
);

module.exports = router;
