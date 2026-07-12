/**
 * modules/auth/auth.service.js
 *
 * Business logic layer for authentication.
 * All rules, validations, bcrypt, and JWT operations live here.
 *
 * Rules:
 * - Services call repositories (never Prisma directly)
 * - Services throw AppError for expected business failures
 * - Services never touch req/res objects
 */

const bcrypt = require('bcrypt');
const authRepository = require('./auth.repository');
const { signToken } = require('../../config/jwt');
const { AppError } = require('../../middleware/errorHandler');

const SALT_ROUNDS = 10;

const authService = {
  /**
   * Register the one-time Admin account.
   *
   * Business rule: Only ONE admin allowed in the system.
   * If an admin already exists → throw 409 Conflict.
   *
   * @param {{ name, email, password }} data
   * @returns {{ user: object }} Created admin (without password)
   */
  register: async ({ name, email, password }) => {
    // ── Rule: Admin can only be created once ─────────────────────
    const adminCount = await authRepository.countAdmins();
    if (adminCount > 0) {
      throw new AppError(
        'Admin already exists. Admin registration is a one-time operation.',
        409
      );
    }

    // ── Hash the password ─────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Create admin with role forced to ADMIN ────────────────────
    const user = await authRepository.createUser({
      name,
      email,
      password: hashedPassword,
      role: 'ADMIN',
      isFirstLogin: false, // Admin doesn't need first-login password change
    });

    return { user };
  },

  /**
   * Login — works for both ADMIN and EMPLOYEE.
   *
   * Returns a signed JWT and a flag indicating if first-login
   * password change is required.
   *
   * Security note: We return the SAME error message for
   * "email not found" and "wrong password" to prevent
   * user enumeration attacks.
   *
   * @param {{ email, password }} credentials
   * @returns {{ token: string, user: object, requirePasswordChange: boolean }}
   */
  login: async ({ email, password }) => {
    // ── Find user by email ────────────────────────────────────────
    const user = await authRepository.findByEmail(email);

    // ── Generic error — don't reveal if email exists ──────────────
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // ── Check account status ──────────────────────────────────────
    if (!user.isActive) {
      throw new AppError('Your account has been suspended. Contact the administrator.', 403);
    }

    // ── Verify password ───────────────────────────────────────────
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // ── Sign JWT ──────────────────────────────────────────────────
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // ── Return user without password ──────────────────────────────
    const { password: _pw, ...safeUser } = user;

    return {
      token,
      user: safeUser,
      requirePasswordChange: user.isFirstLogin,
    };
  },

  /**
   * Change password — for first-login or general use.
   *
   * Validates old password before allowing update.
   * Sets isFirstLogin = false after successful change.
   *
   * @param {string} userId - From req.user (JWT payload)
   * @param {{ oldPassword, newPassword }} data
   * @returns {{ message: string }}
   */
  changePassword: async (userId, { oldPassword, newPassword }) => {
    // ── Find the user ─────────────────────────────────────────────
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // ── Verify old password ───────────────────────────────────────
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new AppError('Old password is incorrect', 400);
    }

    // ── Hash the new password ─────────────────────────────────────
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // ── Update password and clear first-login flag ────────────────
    await authRepository.updatePassword(userId, hashedNewPassword);

    return { message: 'Password updated successfully. Please login again.' };
  },

  /**
   * Get the current authenticated user's profile.
   *
   * @param {string} userId - From req.user (JWT payload)
   * @returns {{ user: object }} User without password
   */
  getMe: async (userId) => {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Strip password before returning
    const { password: _pw, ...safeUser } = user;
    return { user: safeUser };
  },
};

module.exports = authService;
