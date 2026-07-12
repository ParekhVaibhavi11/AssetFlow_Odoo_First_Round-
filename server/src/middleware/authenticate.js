const { verifyToken } = require('../config/jwt');
const { sendError } = require('../utils/response');

const authenticate = (req, res, next) => {
  try {
    // ── 1. Extract the Authorization header ──────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, 401, 'Access denied. No token provided.');
    }

    // ── 2. Validate "Bearer <token>" format ──────────────────────
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return sendError(res, 401, 'Invalid token format. Use: Bearer <token>');
    }

    const token = parts[1];

    // ── 3. Verify token (throws on invalid/expired) ───────────────
    const decoded = verifyToken(token);

    // ── 4. Attach decoded payload to req.user ─────────────────────
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    // JsonWebTokenError / TokenExpiredError → forwarded to global errorHandler
    next(err);
  }
};

module.exports = authenticate;
