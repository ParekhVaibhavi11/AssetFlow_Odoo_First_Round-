/**
 * modules/auth/auth.repository.js
 *
 * Data access layer for auth operations.
 * Contains ONLY Prisma queries — no business logic here.
 *
 * Rule: If it touches the DB, it belongs here.
 *       If it has conditions or calculations, it belongs in service.js.
 */

const prisma = require('../../config/prisma');

const authRepository = {
  /**
   * Count total admins in the database.
   * Used to enforce the "one admin only" rule during registration.
   * @returns {Promise<number>}
   */
  countAdmins: async () => {
    return prisma.user.count({
      where: { role: 'ADMIN' },
    });
  },

  /**
   * Find a user by their email address.
   * Used during login to locate the account.
   * @param {string} email - Lowercase email address
   * @returns {Promise<User|null>}
   */
  findByEmail: async (email) => {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  /**
   * Find a user by their UUID.
   * Used during /auth/me and change-password flows.
   * @param {string} id - UUID
   * @returns {Promise<User|null>}
   */
  findById: async (id) => {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  /**
   * Create a new user record.
   * @param {{ name, email, password, role, department?, phone? }} data
   * @returns {Promise<User>}
   */
  createUser: async (data) => {
    return prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        isFirstLogin: true,
        isActive: true,
        createdAt: true,
        // password intentionally excluded from select
      },
    });
  },

  /**
   * Update a user's password and reset isFirstLogin flag.
   * Called after successful first-login password change.
   * @param {string} id - User UUID
   * @param {string} hashedPassword - New bcrypt hash
   * @returns {Promise<User>}
   */
  updatePassword: async (id, hashedPassword) => {
    return prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        isFirstLogin: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isFirstLogin: true,
        updatedAt: true,
      },
    });
  },
};

module.exports = authRepository;
