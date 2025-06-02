import axios from 'axios';
import config from '../config';

// Create a base axios instance with common config
const createAxiosInstance = (contentType = 'application/json') => {
  const instance = axios.create({
    baseURL: config.API_URL,
    withCredentials: true,
    headers: {
      'Content-Type': contentType,
      'Accept': 'application/json'
    }
  });

  // Add a request interceptor to add the auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Remove Content-Type for FormData to let the browser set it with the correct boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

// Regular API instance for JSON data
const api = createAxiosInstance();

// File upload instance (no Content-Type header, will be set automatically)
const apiFileUpload = createAxiosInstance();

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      console.error('Request config:', error.config);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export { apiFileUpload };
export default api;