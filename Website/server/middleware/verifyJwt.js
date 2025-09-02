const jwt = require('jsonwebtoken');

// verifyJwt(options) -> returns middleware that verifies JWT and attaches decoded payload to req.user
// options: { secret } - optional, falls back to process.env.JWT_SECRET
module.exports = (options = {}) => {
  const secret = options.secret || process.env.JWT_SECRET;

  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      return next();
    } catch (err) {
      console.error('JWT verification failed:', err && err.message);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  };
};
