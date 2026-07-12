const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Access token missing or unauthorized.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforassetflow', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired access token.' });
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient role permissions.' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};
