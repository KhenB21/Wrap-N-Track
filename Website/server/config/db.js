const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../../.env' });

// Basic pool (kept minimal per task). For DigitalOcean managed PostgreSQL we enable SSL.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
