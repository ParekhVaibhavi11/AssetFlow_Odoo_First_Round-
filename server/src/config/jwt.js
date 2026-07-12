/**
 * config/jwt.js
 *
 * JWT sign and verify helpers.
 *
 * TOKEN PAYLOAD:
 * {
 *   userId: string (UUID)
 *   email:  string
 *   role:   "ADMIN" | "EMPLOYEE"
 * }
 *
 * NEVER store: password, isFirstLogin, or any sensitive field in the token.
 * SECRET: loaded from process.env.JWT_SECRET (min 64 chars recommended).
 * EXPIRY: 7 days (process.env.JWT_EXPIRES_IN).
 */

const jwt = require('jsonwebtoken');

/**
 * Sign a new JWT token.
 * @param {{ userId: string, email: string, role: string }} payload
 * @returns {string} Signed JWT token
 */
const signToken = (payload) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256',
  });
};

/**
 * Verify and decode a JWT token.
 * @param {string} token - Raw JWT string (without "Bearer " prefix)
 * @returns {{ userId: string, email: string, role: string, iat: number, exp: number }}
 * @throws {JsonWebTokenError | TokenExpiredError} if token is invalid or expired
 */
const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };
