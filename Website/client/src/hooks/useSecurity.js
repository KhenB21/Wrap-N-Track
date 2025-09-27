import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

/**
 * Security hook that prevents unauthorized access and browser history manipulation
 */
export const useSecurity = (allowedUserTypes = ['employee']) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prevent browser back button from accessing unauthorized pages
    const handlePopState = (event) => {
      if (!isAuthenticated || !allowedUserTypes.includes(user?.source)) {
        // If user tries to go back to an unauthorized page, redirect them
        navigate('/unauthorized', { 
          state: { 
            from: location.pathname,
            reason: 'browser_back_blocked',
            message: 'Browser navigation blocked for security'
          }
        });
      }
    };

    // Add event listener for browser back/forward buttons
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated, user, navigate, location, allowedUserTypes]);

  // Additional security: Monitor for direct URL access attempts
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Optional: Add confirmation when leaving sensitive pages
      if (location.pathname.includes('/employee-dashboard') || 
          location.pathname.includes('/inventory') ||
          location.pathname.includes('/account-management')) {
        // You can add a confirmation dialog here if needed
        // event.preventDefault();
        // event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname]);

  return {
    isAuthorized: isAuthenticated && allowedUserTypes.includes(user?.source),
    userType: user?.source
  };
};

export default useSecurity;
