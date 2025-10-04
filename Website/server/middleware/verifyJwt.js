const jwt = require('jsonwebtoken');

// verifyJwt(options) -> returns middleware that verifies JWT and attaches decoded payload to req.user
// options: { secret } - optional, falls back to process.env.JWT_SECRET
module.exports = (options = {}) => {
  const secret = options.secret || process.env.JWT_SECRET;

  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log('[verifyJwt] Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('[verifyJwt] Request path:', req.path);
    console.log('[verifyJwt] Request method:', req.method);
    
    if (!authHeader) {
      console.log('[verifyJwt] No authorization header found');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('[verifyJwt] Token extraction failed from header');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      console.log('[verifyJwt] Attempting to verify token...');
      const decoded = jwt.verify(token, secret);
      console.log('[verifyJwt] Token verified successfully for user:', decoded.customer_id || decoded.user_id);
      req.user = decoded;
      return next();
    } catch (err) {
      console.error('[verifyJwt] JWT verification failed:', err.message);
      console.error('[verifyJwt] Error name:', err.name);
      console.error('[verifyJwt] Has JWT_SECRET:', !!secret);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  };
};
