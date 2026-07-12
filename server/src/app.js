/**
 * app.js
 *
 * Express application setup.
 * Configures:
 * - Global middleware (CORS, JSON parsing, request logging)
 * - Route mounting
 * - 404 handler
 * - Global error handler (must be LAST)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { sendError } = require('./utils/response');

const app = express();

// ─────────────────────────────────────────────────────────────
// Global Middleware
// ─────────────────────────────────────────────────────────────

// CORS — allow React dev server and production client
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: '10kb' })); // Limit body size for security

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// Request Logger (Development only)
// ─────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`📥 ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body, null, 2) : '');
    next();
  });
}

// ─────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'AssetFlow API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─────────────────────────────────────────────────────────────
// Route Mounting
// ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ─────────────────────────────────────────────────────────────
// 404 Handler — catch all unmatched routes
// ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  return sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
});

// ─────────────────────────────────────────────────────────────
// Global Error Handler — MUST be last middleware
// ─────────────────────────────────────────────────────────────

app.use(errorHandler);

module.exports = app;
