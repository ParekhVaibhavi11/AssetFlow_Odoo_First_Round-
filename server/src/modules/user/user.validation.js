/**
 * modules/user/user.validation.js
 *
 * Zod schemas for user management endpoints.
 */

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// POST /users — Admin creates an employee
// ─────────────────────────────────────────────────────────────

const createEmployeeSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be under 60 characters')
    .trim(),

  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),

  department: z
    .string({ required_error: 'Department is required' })
    .min(1, 'Department cannot be empty')
    .trim(),

  temporaryPassword: z
    .string({ required_error: 'Temporary password is required' })
    .min(8, 'Temporary password must be at least 8 characters'),

  phone: z
    .string()
    .optional()
    .nullable(),
});

module.exports = { createEmployeeSchema };
