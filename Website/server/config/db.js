const { Pool } = require('pg');
// Load environment variables from the server .env (one level up from this config directory)
require('dotenv').config({ path: __dirname + '/../.env' });

// Adaptive SSL: explicit DB_SSL=true enables; also auto-enable for DigitalOcean managed PG hostname or port 25060
let useSsl = (process.env.DB_SSL || '').toLowerCase() === 'true';
const host = process.env.DB_HOST || '';
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;

// Force SSL for DigitalOcean managed databases
if (/\.ondigitalocean\.com$/i.test(host) || port === 25060) {
  console.log('[DB] Auto-enabling SSL for DigitalOcean managed database');
  useSsl = true;
}
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  ssl: useSsl ? { 
    rejectUnauthorized: false,
    require: true
  } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

if (!useSsl) {
  console.log('[DB] SSL disabled (DB_SSL!=true).');
} else {
  console.log('[DB] SSL enabled.');
}

module.exports = pool;