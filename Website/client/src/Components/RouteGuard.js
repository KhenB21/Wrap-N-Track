import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { useSecurity } from '../hooks/useSecurity';

const RouteGuard = ({ children, requiredUserType = 'employee', redirectTo = '/' }) => {
  const { user, isAuthenticated, loading, clearConflictingTokens, validateAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use security hook for additional protection
  const { isAuthorized } = useSecurity([requiredUserType]);

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      console.warn('Unauthorized access attempt - no authentication');
      navigate(redirectTo, { 
        state: { 
          from: location.pathname,
          reason: 'no_auth',
          message: 'Please log in to access this page'
        }
      });
      return;
    }

    // Check if user has the required type
    if (!validateAccess(requiredUserType)) {
      console.warn(`Unauthorized access attempt - wrong user type. Expected: ${requiredUserType}, Got: ${user?.source}`);
      navigate(redirectTo, { 
        state: { 
          from: location.pathname,
          reason: 'wrong_user_type',
          message: `This page is only accessible to ${requiredUserType}s`,
          userType: user?.source
        }
      });
      return;
    }

    // Additional security: Clear conflicting tokens
    clearConflictingTokens(requiredUserType);

    // Log successful access for security monitoring
    console.log(`Authorized access: ${user?.source} accessing ${location.pathname}`);

  }, [user, isAuthenticated, loading, navigate, location, requiredUserType, redirectTo, clearConflictingTokens, validateAccess]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Verifying access...
      </div>
    );
  }

  // Don't render children if user doesn't have access
  if (!isAuthenticated || user?.source !== requiredUserType) {
    return null;
  }

  return children;
};

export default RouteGuard;
