// analyticsScope.js
//
// Server-side enforcement of the financial/operational role split for the
// analytics API. The UI hiding a number is not a security boundary — this is.
const FINANCIAL_ROLES = new Set([
  'admin', 'super_admin', 'director', 'sales_manager', 'assistant_sales', 'business_developer'
]);

function resolveScope(req) {
  const role = req.user && req.user.role;
  return FINANCIAL_ROLES.has(role) ? 'financial' : 'operational';
}

function requireFinancialScope() {
  return (req, res, next) => {
    if (resolveScope(req) !== 'financial') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: this data requires a financial role'
      });
    }
    return next();
  };
}

module.exports = { resolveScope, requireFinancialScope, FINANCIAL_ROLES };
