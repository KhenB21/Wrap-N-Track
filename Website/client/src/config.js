// Central API / WebSocket configuration.
// Task: Use REACT_APP_API_URL or fall back to the DigitalOcean backend.
// Removed legacy auto same-origin fallback logic to enforce explicit backend usage.
const FALLBACK_API = 'https://wrapntracwebservice-2g22j.ondigitalocean.app';
const API_URL = process.env.REACT_APP_API_URL || FALLBACK_API;

// WebSocket: allow override, else derive from API host.
let WS_URL = process.env.REACT_APP_WS_URL;
if (!WS_URL) {
  try {
    const apiHost = new URL(API_URL);
    const wsScheme = apiHost.protocol === 'https:' ? 'wss:' : 'ws:';
    WS_URL = `${wsScheme}//${apiHost.host}`;
  } catch (e) {
    // Fallback to replacing scheme naïvely if URL ctor fails
    WS_URL = API_URL.replace(/^https:/,'wss:').replace(/^http:/,'ws:');
  }
}

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