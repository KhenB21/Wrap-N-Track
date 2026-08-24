// requireTestDataAccess.js
//
// Guards the /test-data/insert and /test-data/clear endpoints. These mutate real
// inventory and order rows, so they must never be reachable in production and must
// never be reachable by a non-admin. Previously they were exposed with no auth at
// all via the `app.use('/api/test', inventoryReportsRouter)` mount in index.js.
module.exports = function requireTestDataAccess() {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No authenticated user' });
    }
    const role = req.user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: test data operations require an admin account'
      });
    }
    return next();
  };
};
