import React from 'react';
import { Navigate } from 'react-router-dom';

// Usage: wrap route element: <RequireRole allowed={["admin"]}><Dashboard/></RequireRole>
const RequireRole = ({ allowed = [], children }) => {
  let role = null;

  const userJson = localStorage.getItem('user');
  const customerJson = localStorage.getItem('customer');
  const token = localStorage.getItem('token') || localStorage.getItem('customerToken');

  if (userJson) {
    try { role = JSON.parse(userJson).role; } catch (e) { /* ignore */ }
  } else if (customerJson) {
    try { role = JSON.parse(customerJson).role || 'customer'; } catch (e) { role = 'customer'; }
  } else if (token) {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(window.atob(payload));
      role = decoded.role;
    } catch (e) { /* ignore */ }
  }

  const allowedArr = Array.isArray(allowed) ? allowed : [allowed];

  if (!role) {
    // Not authenticated — redirect to appropriate login
    const wantsCustomer = allowedArr.includes('customer');
    return <Navigate to={wantsCustomer ? '/customer-login' : '/login'} replace />;
  }

  if (!allowedArr.includes(role)) {
    // Authenticated but forbidden
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default RequireRole;
