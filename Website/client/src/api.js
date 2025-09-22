// Central Axios instance using environment base URL.
// Priority: REACT_APP_API_URL (new) then legacy REACT_APP_API_BASE_URL then fallback to deployed URL.
import axios from 'axios';

// For local development, use localhost if no environment variable is set
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const defaultURL = isLocalDev ? 'http://localhost:3001' : 'https://wrapntracwebservice-2g22j.ondigitalocean.app';

const baseURL = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || defaultURL;

const api = axios.create({ baseURL });

// Attach appropriate token automatically (employee/admin token OR customer token) if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('customerToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
