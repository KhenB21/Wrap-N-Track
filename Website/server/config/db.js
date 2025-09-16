const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
// Load environment variables - prioritize .env for production, .env.local for development
const envLocal = path.join(__dirname, '..', '.env.local');
const envProd = path.join(__dirname, '..', '.env');
const envPath = process.env.NODE_ENV === 'production' ? envProd : (fs.existsSync(envLocal) ? envLocal : envProd);
require('dotenv').config({ path: envPath });

// Adaptive SSL: explicit DB_SSL=true enables; also auto-enable for DigitalOcean managed PG hostname or port 25060
let useSsl = (process.env.DB_SSL || '').toLowerCase() === 'true';
const host = process.env.DB_HOST || '';
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;

// Force SSL for DigitalOcean managed databases
if (/\.ondigitalocean\.com$/i.test(host) || port === 25060) {
  console.log('[DB] Auto-enabling SSL for DigitalOcean managed database');
  useSsl = true;
}

// Force disable SSL for localhost development
if (host === 'localhost' || host === '127.0.0.1') {
  console.log('[DB] Auto-disabling SSL for localhost development');
  useSsl = false;
}
// Create connection string with proper SSL configuration
const sslMode = useSsl ? 'require' : 'disable';
const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=${sslMode}`;

const pool = new Pool({
  connectionString: connectionString,
  ssl: useSsl ? { 
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  } : false,
  application_name: 'wrap-n-track-server',
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

console.log('[DB] SSL configuration:', {
  useSsl,
  host,
  port,
  dbSsl: process.env.DB_SSL,
  isLocalhost: host === 'localhost' || host === '127.0.0.1',
  isDigitalOcean: /\.ondigitalocean\.com$/i.test(host) || port === 25060
});

if (!useSsl) {
  console.log('[DB] SSL disabled (DB_SSL!=true).');
} else {
  console.log('[DB] SSL enabled.');
}

module.exports = pool;