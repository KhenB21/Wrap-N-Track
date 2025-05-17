const config = {
  API_URL: process.env.REACT_APP_API_URL || 'https://wrap-n-track.onrender.com',
  WS_URL: process.env.REACT_APP_WS_URL || 'wss://wrap-n-track.onrender.com',
  isDevelopment: process.env.NODE_ENV === 'development'
};

if (config.isDevelopment) {
  config.API_URL = 'http://localhost:3001';
  config.WS_URL = 'ws://localhost:3001';
}

export default config; 