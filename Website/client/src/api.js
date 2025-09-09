// Central Axios instance using environment base URL.
// Priority: REACT_APP_API_URL (new) then legacy REACT_APP_API_BASE_URL then fallback to deployed URL.
import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || 'https://wrapntracwebservice-2g22j.ondigitalocean.app';

const api = axios.create({ baseURL });

// Attach appropriate token automatically based on the endpoint being called
api.interceptors.request.use((config) => {
  const employeeToken = localStorage.getItem('token');
  const customerToken = localStorage.getItem('customerToken');
  
  // Determine which token to use based on the URL
  let token = null;
  let tokenType = 'none';
  
  if (config.url) {
    // Customer-specific endpoints should use customer token
    if (config.url.includes('/api/customer/') || config.url.includes('/api/auth/customer/')) {
      token = customerToken;
      tokenType = customerToken ? 'customer' : 'none';
    }
    // Employee/general endpoints should use employee token if available, otherwise customer token
    else {
      token = employeeToken || customerToken;
      tokenType = employeeToken ? 'employee' : (customerToken ? 'customer' : 'none');
    }
  } else {
    // Fallback: prioritize employee token
    token = employeeToken || customerToken;
    tokenType = employeeToken ? 'employee' : (customerToken ? 'customer' : 'none');
  }
  
  // Add debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url} | Token: ${tokenType} | Has Employee Token: ${!!employeeToken} | Has Customer Token: ${!!customerToken}`);
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
