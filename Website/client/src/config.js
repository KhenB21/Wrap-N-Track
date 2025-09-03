// Prefer explicit environment variables set at build time.
// If not set, auto-detect sensible defaults based on the browser location.
const envApi = process.env.REACT_APP_API_URL;
const envWs = process.env.REACT_APP_WS_URL;

const hostname = window.location.hostname;
const protocol = window.location.protocol;

const defaultProdApi = `${protocol}//${hostname}`; // assume API is served from same origin if not specified
const defaultProdWs = (protocol === 'https:' ? 'wss://' : 'ws://') + hostname;

// Production-first: use explicitly set env variables, otherwise assume same-origin
const API_URL = envApi || defaultProdApi;
const WS_URL = envWs || defaultProdWs;

const config = {
  API_URL,
  WS_URL,
  isDevelopment: process.env.NODE_ENV === 'development',
  verifyEnvironment: async () => {
    try {
      const resp = await fetch(`${API_URL}/api/test/env`);
      const data = await resp.json();
      console.log('Backend environment:', data);
      return data;
    } catch (err) {
      console.error('Error verifying environment:', err);
      return null;
    }
  }
};

// Debug info (kept minimal)
console.log('Config loaded:', { API_URL: config.API_URL, WS_URL: config.WS_URL, isDevelopment: config.isDevelopment });

export default config;