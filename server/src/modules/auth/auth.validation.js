/**
 * modules/auth/auth.validation.js
 *
 * Zod schemas for all auth endpoints.
 * These are passed to the validate() middleware — never imported in controllers.
 */

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// Reusable field definitions
// ─────────────────────────────────────────────────────────────

const emailField = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email format')
  .toLowerCase()
  .trim();

const strongPassword = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ─────────────────────────────────────────────────────────────
// POST /auth/register — Admin one-time registration
// ─────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be under 60 characters')
    .trim(),
  email: emailField,
  password: strongPassword,
});

// ─────────────────────────────────────────────────────────────
// POST /auth/login — Login for Admin & Employee
// ─────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});



module.exports = { registerSchema, loginSchema };
