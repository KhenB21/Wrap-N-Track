import React from 'react';
import RouteGuard from './RouteGuard';

/**
 * Higher-Order Component that wraps customer pages with authentication
 * Prevents employees from accessing customer-only areas
 */
const withCustomerAuth = (WrappedComponent) => {
  const CustomerProtectedComponent = (props) => {
    return (
      <RouteGuard requiredUserType="customer" redirectTo="/unauthorized">
        <WrappedComponent {...props} />
      </RouteGuard>
    );
  };

  // Set display name for debugging
  CustomerProtectedComponent.displayName = `withCustomerAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return CustomerProtectedComponent;
};

export default withCustomerAuth;
