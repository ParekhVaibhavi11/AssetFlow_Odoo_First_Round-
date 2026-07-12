/**
 * middleware/validate.js
 *
 * Zod request body validation middleware factory.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), authController.login)
 *
 * Validates req.body against the provided Zod schema.
 * On failure → throws ZodError (caught by errorHandler → 400 with field errors).
 * On success → attaches parsed/sanitized body back to req.body and calls next().
 *
 * WHY re-assign req.body?
 * Zod's .parse() returns the sanitized, type-coerced value.
 * This ensures stripped unknown fields and properly typed values reach controllers.
 */

const validate = (schema) => (req, res, next) => {
  try {
    // .parse() throws ZodError on failure (caught by global errorHandler)
    // Returns the parsed, sanitized value
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err); // Forward ZodError to global error handler
  }
};

module.exports = validate;
