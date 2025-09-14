const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
// Prefer .env.local if present, else fallback to .env (keeps prod safe)
const envLocal = path.join(__dirname, '..', '.env.local');
const envProd = path.join(__dirname, '..', '.env');
const envPath = fs.existsSync(envLocal) ? envLocal : envProd;
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