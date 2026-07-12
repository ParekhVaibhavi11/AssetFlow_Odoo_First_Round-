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

// ─────────────────────────────────────────────────────────────
// POST /auth/change-password — First login password change
// ─────────────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    oldPassword: z
      .string({ required_error: 'Old password is required' })
      .min(1, 'Old password cannot be empty'),
    newPassword: strongPassword,
    confirmPassword: z
      .string({ required_error: 'Confirm password is required' })
      .min(1, 'Confirm password cannot be empty'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: 'New password must be different from old password',
    path: ['newPassword'],
  });

module.exports = { registerSchema, loginSchema, changePasswordSchema };
