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
      console.log('Making request to:', config.url);
      console.log('Request headers:', config.headers);
      console.log('Request origin:', window.location.origin);
      
      // Prefer admin/employee token stored under 'token'. If not present, use customer token.
      let token = localStorage.getItem('token');
      if (!token) token = localStorage.getItem('customerToken');
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
      console.error('Request interceptor error:', error);
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
  (response) => {
    console.log('Response received:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', {
        request: error.request,
        config: error.config,
        message: error.message,
        origin: window.location.origin
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', {
        message: error.message,
        stack: error.stack
      });
    }
    return Promise.reject(error);
  }
);

export { apiFileUpload };
export default api;