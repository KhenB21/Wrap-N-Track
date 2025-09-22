import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import './UnauthorizedAccess.css';

const UnauthorizedAccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);

  const state = location.state || {};
  const { from, reason, message, userType } = state;

  useEffect(() => {
    // Start countdown to redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Redirect to appropriate home page based on user type
          if (user?.source === 'customer') {
            navigate('/customer-home');
          } else {
            navigate('/');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, user]);

  const handleGoHome = () => {
    if (user?.source === 'customer') {
      navigate('/customer-home');
    } else {
      navigate('/');
    }
  };

  const handleLogin = () => {
    if (user?.source === 'customer') {
      navigate('/customer-login');
    } else {
      navigate('/login-employee-pensee');
    }
  };

  const getReasonMessage = () => {
    switch (reason) {
      case 'no_auth':
        return 'You need to be logged in to access this page.';
      case 'wrong_user_type':
        return `This page is only accessible to employees. You are logged in as a ${userType || 'customer'}.`;
      default:
        return message || 'You do not have permission to access this page.';
    }
  };

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <div className="unauthorized-icon">
          🚫
        </div>
        <h1 className="unauthorized-title">Access Denied</h1>
        <p className="unauthorized-message">
          {getReasonMessage()}
        </p>
        
        {from && (
          <p className="unauthorized-attempt">
            Attempted to access: <code>{from}</code>
          </p>
        )}

        <div className="unauthorized-actions">
          <button 
            className="unauthorized-btn primary" 
            onClick={handleGoHome}
          >
            Go to Homepage
          </button>
          <button 
            className="unauthorized-btn secondary" 
            onClick={handleLogin}
          >
            {user?.source === 'customer' ? 'Customer Login' : 'Employee Login'}
          </button>
        </div>

        <p className="unauthorized-countdown">
          Redirecting in {countdown} seconds...
        </p>

        <div className="unauthorized-security-note">
          <p>
            <strong>Security Notice:</strong> Unauthorized access attempts are logged for security purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedAccess;
