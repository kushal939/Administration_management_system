/**
 * Authentication Middleware
 * Validates user session and role-based access
 */

const requireAuth = (req, res, next) => {
  // In a real application, this would validate JWT or session
  // For this implementation, we expect user data in request body or headers
  const user = req.body.user || req.headers['x-user-data'];
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Parse user data if it's a string
  if (typeof user === 'string') {
    try {
      req.user = JSON.parse(user);
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } else {
    req.user = user;
  }

  next();
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    const allowed = allowedRoles.map(r => String(r).toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
