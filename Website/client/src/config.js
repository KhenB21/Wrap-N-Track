// Log environment variables for debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  API_URL: process.env.REACT_APP_API_URL || 'https://wrap-n-track.onrender.com',
  WS_URL: process.env.REACT_APP_WS_URL || 'wss://wrap-n-track.onrender.com',
  isDevelopment
};

// Log final config for debugging
console.log('Final config:', {
  API_URL: config.API_URL,
  WS_URL: config.WS_URL,
  isDevelopment: config.isDevelopment,
  hostname: window.location.hostname
});

export default config; 