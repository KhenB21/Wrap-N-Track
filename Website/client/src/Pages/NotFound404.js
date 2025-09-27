import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import './NotFound404.css';

const NotFound404 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Start countdown to redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Redirect to appropriate home page based on user type
          if (isAuthenticated && user?.source === 'employee') {
            navigate('/employee-dashboard');
          } else if (isAuthenticated && user?.source === 'customer') {
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
  }, [navigate, user, isAuthenticated]);

  const handleGoHome = () => {
    if (isAuthenticated && user?.source === 'employee') {
      navigate('/employee-dashboard');
    } else if (isAuthenticated && user?.source === 'customer') {
      navigate('/customer-home');
    } else {
      navigate('/');
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const getHomePageName = () => {
    if (isAuthenticated && user?.source === 'employee') {
      return 'Employee Dashboard';
    } else if (isAuthenticated && user?.source === 'customer') {
      return 'Customer Home';
    } else {
      return 'Homepage';
    }
  };

  const getHomePagePath = () => {
    if (isAuthenticated && user?.source === 'employee') {
      return '/employee-dashboard';
    } else if (isAuthenticated && user?.source === 'customer') {
      return '/customer-home';
    } else {
      return '/';
    }
  };

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-animation">
          <div className="not-found-404">404</div>
          <div className="not-found-ghost">👻</div>
        </div>
        
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-message">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="not-found-details">
          <p className="not-found-path">
            <strong>Requested URL:</strong> <code>{location.pathname}</code>
          </p>
          <p className="not-found-time">
            <strong>Time:</strong> {new Date().toLocaleString()}
          </p>
        </div>

        <div className="not-found-actions">
          <button 
            className="not-found-btn primary" 
            onClick={handleGoHome}
          >
            Go to {getHomePageName()}
          </button>
          <button 
            className="not-found-btn secondary" 
            onClick={handleGoBack}
          >
            Go Back
          </button>
        </div>

        <div className="not-found-countdown">
          <p>
            Redirecting to {getHomePageName()} in <span className="countdown-number">{countdown}</span> seconds...
          </p>
        </div>

        <div className="not-found-help">
          <h3>What can you do?</h3>
          <ul>
            <li>Check the URL for typos</li>
            <li>Use the navigation menu to find what you're looking for</li>
            <li>Go back to the previous page</li>
            <li>Return to the {getHomePageName().toLowerCase()}</li>
          </ul>
        </div>

        <div className="not-found-suggestions">
          <h3>Popular Pages</h3>
          <div className="suggestion-links">
            {isAuthenticated && user?.source === 'employee' ? (
              <>
                <button onClick={() => navigate('/inventory')}>Inventory</button>
                <button onClick={() => navigate('/order-management')}>Order Management</button>
                <button onClick={() => navigate('/account-management')}>Account Management</button>
                <button onClick={() => navigate('/reports/inventory')}>Inventory Reports</button>
              </>
            ) : isAuthenticated && user?.source === 'customer' ? (
              <>
                <button onClick={() => navigate('/customer-cart')}>My Cart</button>
                <button onClick={() => navigate('/customer-orders')}>My Orders</button>
                <button onClick={() => navigate('/wedding')}>Wedding</button>
                <button onClick={() => navigate('/corporate')}>Corporate</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/wedding')}>Wedding</button>
                <button onClick={() => navigate('/corporate')}>Corporate</button>
                <button onClick={() => navigate('/bespoke')}>Bespoke</button>
                <button onClick={() => navigate('/about')}>About Us</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound404;
