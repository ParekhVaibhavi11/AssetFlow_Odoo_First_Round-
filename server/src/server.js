/**
 * server.js
 *
 * HTTP server entry point.
 * Starts the Express app and handles graceful shutdown.
 */

require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║         AssetFlow API Server             ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  🚀 Running on   : http://localhost:${PORT}  ║`);
  console.log(`║  🌍 Environment  : ${process.env.NODE_ENV || 'development'}          ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

// ─────────────────────────────────────────────────────────────
// Graceful Shutdown
// Properly close DB connection on SIGTERM/SIGINT
// ─────────────────────────────────────────────────────────────

const shutdown = async (signal) => {
  console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('🔌 HTTP server closed.');
    await prisma.$disconnect();
    console.log('🗄️  Prisma DB connection closed.');
    console.log('✅ Shutdown complete.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─────────────────────────────────────────────────────────────
// Unhandled Promise Rejections & Exceptions
// ─────────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  shutdown('uncaughtException');
});
