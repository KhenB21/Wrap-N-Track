// Central Axios instance using environment base URL
// REACT_APP_API_BASE_URL should be defined in .env
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || 'https://wrapntracwebservice-2g22j.ondigitalocean.app',
});

// Attach token automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
