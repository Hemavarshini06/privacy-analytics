const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'privacy-analytics-secret-2024';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Authorized roles: [${roles.join(', ')}]. Your current role is: ${req.user?.role || 'unassigned'}.`,
        requiredRoles: roles,
        currentRole: req.user?.role
      });
    }
    next();
  };
}

const requireAdmin = requireRole('admin');

module.exports = { authenticateToken, requireRole, requireAdmin, JWT_SECRET };
