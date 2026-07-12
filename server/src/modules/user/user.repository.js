/**
 * modules/user/user.repository.js
 *
 * Data access layer for user management.
 * Contains ONLY Prisma queries — no business logic.
 */

const prisma = require('../../config/prisma');

// Fields that are safe to return (never include password)
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  phone: true,
  isFirstLogin: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const userRepository = {
  /**
   * Find a user by email.
   * Used for uniqueness check before creating employee.
   * @param {string} email
   * @returns {Promise<User|null>}
   */
  findByEmail: async (email) => {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  },

  /**
   * Create a new employee account.
   * Role is always EMPLOYEE — enforced at service layer.
   * isFirstLogin is always true — enforced at service layer.
   *
   * @param {{ name, email, password, department, phone? }} data
   * @returns {Promise<SafeUser>}
   */
  createEmployee: async (data) => {
    return prisma.user.create({
      data,
      select: SAFE_USER_SELECT,
    });
  },

  /**
   * Get all users (Admin view).
   * Returns all employees with safe fields only.
   * Ordered by creation date descending (newest first).
   * @returns {Promise<SafeUser[]>}
   */
  findAll: async () => {
    return prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Find a single user by ID.
   * @param {string} id - UUID
   * @returns {Promise<SafeUser|null>}
   */
  findById: async (id) => {
    return prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
  },
};

module.exports = userRepository;
