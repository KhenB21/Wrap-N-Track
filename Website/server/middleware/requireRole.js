// requireRole.js - middleware factory to allow only certain roles
module.exports = function requireRole(allowed) {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'No authenticated user' });
    const role = req.user.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    }
    return next();
  };
};
