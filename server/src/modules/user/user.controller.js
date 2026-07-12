/**
 * modules/user/user.controller.js
 *
 * HTTP layer for user management routes.
 * Thin controller — delegates all logic to userService.
 */

const userService = require('./user.service');
const { sendSuccess } = require('../../utils/response');

const userController = {
  /**
   * POST /users
   * Admin creates a new employee account.
   */
  create: async (req, res, next) => {
    try {
      const { name, email, department, temporaryPassword, phone } = req.body;
      const result = await userService.createEmployee({
        name,
        email,
        department,
        temporaryPassword,
        phone,
      });

      return sendSuccess(res, 201, 'Employee created successfully', result.employee);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /users
   * Admin views all users in the system.
   */
  list: async (req, res, next) => {
    try {
      const result = await userService.getAllUsers();

      return sendSuccess(res, 200, 'Users retrieved successfully', {
        users: result.users,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /users/:id
   * Get a specific user by ID.
   */
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await userService.getUserById(id);

      return sendSuccess(res, 200, 'User retrieved successfully', result.user);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userController;
