/**
 * config/prisma.js
 *
 * Singleton PrismaClient instance.
 *
 * WHY SINGLETON?
 * Prisma recommends one instance per app. Creating multiple instances
 * causes connection pool exhaustion. We export a single shared instance.
 *
 * In development, we attach to `global` to survive hot reloads (nodemon).
 * In production, we always create a fresh instance once.
 */

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'], // Log only errors/warnings in production
  });
} else {
  // Prevent multiple instances during dev hot reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'], // Full logging in development
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
