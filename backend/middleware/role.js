/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Compares req.user.role against permitted roles.
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    // Admin role has full system access across endpoints
    if (userRole === 'admin' || userRole === 'super_admin') {
      return next();
    }

    // Match exact role or standard synonyms (rescue_team <-> station, etc.)
    const isAllowed = normalizedAllowed.some(role => {
      if (role === userRole) return true;
      if (role === 'official' && ['station', 'collector', 'admin', 'rescue_team', 'station_admin'].includes(userRole)) return true;
      if (role === 'rescue_team' && userRole === 'station') return true;
      if (role === 'station' && userRole === 'rescue_team') return true;
      return false;
    });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: `Access Denied. Your account role (${req.user.role}) is not authorized to perform this operation.`
      });
    }

    next();
  };
};

module.exports = { requireRole };
