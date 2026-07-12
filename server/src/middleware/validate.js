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
