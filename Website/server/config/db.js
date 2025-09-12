const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../../.env' });

// Adaptive SSL: enable only when DB_SSL=true (e.g., production cloud DB). Default off for local dev.
const useSsl = (process.env.DB_SSL || '').toLowerCase() === 'true';
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

if (!useSsl) {
  console.log('[DB] SSL disabled (DB_SSL!=true).');
} else {
  console.log('[DB] SSL enabled.');
}

module.exports = pool;