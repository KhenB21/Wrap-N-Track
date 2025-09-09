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
      
      // Only log if in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 AuthContext: Initializing auth...', {
          hasEmployeeToken: !!employeeToken,
          hasCustomerToken: !!customerToken
        });
      }
      
      let sessionUser = null;

      // Priority: Check employee token first, then customer token
      if (employeeToken) {
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 AuthContext: Trying to authenticate as employee...');
        }
        try {
          const response = await api.get('/api/user/details');
          if (response.data) {
            sessionUser = { ...response.data, source: 'employee' };
            localStorage.setItem('user', JSON.stringify(sessionUser));
            // Clear any customer data when employee is logged in
            localStorage.removeItem('customerToken');
            localStorage.removeItem('customer');
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ AuthContext: Employee authentication successful', sessionUser.name);
            }
          }
        } catch (error) {
          console.error('❌ AuthContext: Failed to fetch employee details, logging out.', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } else if (customerToken) {
        if (process.env.NODE_ENV === 'development') {
          console.log('👥 AuthContext: Trying to authenticate as customer...');
        }
        try {
          const response = await api.get('/api/customer/profile');
          if (response.data?.success) {
            sessionUser = { ...response.data.customer, source: 'customer' };
            localStorage.setItem('customer', JSON.stringify(sessionUser));
            // Clear any employee data when customer is logged in
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ AuthContext: Customer authentication successful', sessionUser.name);
            }
          }
        } catch (error) {
          console.error('❌ AuthContext: Failed to fetch customer profile, logging out.', error);
          localStorage.removeItem('customerToken');
          localStorage.removeItem('customer');
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 AuthContext: No tokens found, user not authenticated');
        }
      }
      
      setUser(sessionUser);
      setLoading(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('🏁 AuthContext: Initialization complete', { 
          authenticated: !!sessionUser, 
          userType: sessionUser?.source || 'none' 
        });
      }
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

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading: loading,
    login,
    logout,
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
