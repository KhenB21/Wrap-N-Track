// requireReadOnly.js - middleware to restrict packers to read-only operations
module.exports = function requireReadOnly() {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'No authenticated user' });
    
    const role = req.user.role;
    const method = req.method;
    
    // If user is packer, only allow GET requests (read-only)
    if (role === 'packer' && method !== 'GET') {
      return res.status(403).json({ 
        success: false, 
        message: 'Packer role is read-only. This operation is not allowed.' 
      });
    }
    
    return next();
  };
};
