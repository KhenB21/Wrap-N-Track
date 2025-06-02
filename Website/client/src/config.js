// Log environment variables for debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  API_URL: process.env.REACT_APP_API_URL || 'https://wrap-n-track.onrender.com',
  WS_URL: process.env.REACT_APP_WS_URL || 'wss://wrap-n-track.onrender.com',
  isDevelopment,
  // Add environment verification
  verifyEnvironment: async () => {
    try {
      const response = await fetch(`${config.API_URL}/api/test/env`);
      const data = await response.json();
      console.log('Backend environment:', data);
      return data;
    } catch (error) {
      console.error('Error verifying environment:', error);
      return null;
    }
  }
};

// Log final config for debugging
console.log('Final config:', {
  API_URL: config.API_URL,
  WS_URL: config.WS_URL,
  isDevelopment: config.isDevelopment,
  hostname: window.location.hostname
});

export default config; 