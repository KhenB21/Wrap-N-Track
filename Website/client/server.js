const express = require('express');
const path = require('path');
const helmet = require('helmet');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Core Helmet protections; Enable HSTS in all non-development environments to cover hosts without NODE_ENV=production
const isDev = process.env.NODE_ENV === 'development';
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: !isDev ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
}));
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.noSniff());

// Explicit Permissions-Policy
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()'
  ].join(', '));
  next();
});

// CSP tailored for SPA assets
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    fontSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:', 'wss:'],
    formAction: ["'self'"],
    upgradeInsecureRequests: []
  }
}));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
