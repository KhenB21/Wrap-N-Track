import React from 'react';
import RouteGuard from './RouteGuard';

/**
 * Higher-Order Component that wraps employee pages with authentication
 * Prevents customers from accessing employee-only areas
 */
const withEmployeeAuth = (WrappedComponent) => {
  const EmployeeProtectedComponent = (props) => {
    return (
      <RouteGuard requiredUserType="employee" redirectTo="/unauthorized">
        <WrappedComponent {...props} />
      </RouteGuard>
    );
  };

  // Set display name for debugging
  EmployeeProtectedComponent.displayName = `withEmployeeAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return EmployeeProtectedComponent;
};

export default withEmployeeAuth;
