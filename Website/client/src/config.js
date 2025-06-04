// Log environment variables for debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);

// Start API URL Configuration Block
// To switch between local and deployed APIs, change the value of the 'useLocalAPI' variable below.
// Set to true for local development API (http://localhost:3001).
// Set to false for deployed API (https://wrap-n-track.onrender.com).

const useLocalAPI = true; // Set to true for local development

const config = {
  API_URL: useLocalAPI ? 'http://localhost:3001' : 'https://wrap-n-track.onrender.com',
  WS_URL: useLocalAPI ? 'ws://localhost:3001' : 'wss://wrap-n-track.onrender.com',
  isDevelopment: process.env.NODE_ENV === 'development', // Keep isDevelopment based on NODE_ENV for other purposes
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