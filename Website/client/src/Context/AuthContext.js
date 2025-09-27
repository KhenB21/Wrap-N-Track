import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Can be employee or customer
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const employeeToken = localStorage.getItem('token');
      const customerToken = localStorage.getItem('customerToken');
      
      let sessionUser = null;

      if (customerToken) {
        try {
          const response = await api.get('/api/customer/profile');
          if (response.data?.success) {
            sessionUser = { ...response.data.customer, source: 'customer' };
            localStorage.setItem('customer', JSON.stringify(sessionUser));
          }
        } catch (error) {
          console.error('Failed to fetch customer profile, logging out.', error);
          localStorage.removeItem('customerToken');
          localStorage.removeItem('customer');
        }
      } else if (employeeToken) {
        try {
          const response = await api.get('/api/user/details');
          if (response.data) {
            sessionUser = { ...response.data, source: 'employee' };
            localStorage.setItem('user', JSON.stringify(sessionUser));
          }
        } catch (error) {
          console.error('Failed to fetch employee details, logging out.', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setUser(sessionUser);
      setLoading(false);
    };

    initializeAuth();

    const handleStorageChange = () => {
        initializeAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (userData, token, userType = 'employee') => {
    if (userType === 'employee') {
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customer');
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser({ ...userData, source: 'employee' });
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem('customerToken', token);
      localStorage.setItem('customer', JSON.stringify(userData));
      setUser({ ...userData, source: 'customer' });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    setUser(null);
  };

  // Security function to clear conflicting tokens
  const clearConflictingTokens = (currentUserType) => {
    if (currentUserType === 'employee') {
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customer');
    } else if (currentUserType === 'customer') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  // Security function to validate user access
  const validateAccess = (requiredUserType) => {
    if (!user) return false;
    if (user.source !== requiredUserType) return false;
    return true;
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isEmployee: user?.source === 'employee',
    isCustomer: user?.source === 'customer',
    isLoading: loading,
    login,
    logout,
    clearConflictingTokens,
    validateAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
