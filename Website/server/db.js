const { Pool } = require('pg');
require('dotenv').config();

// Database configuration (read strictly from .env)
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: { rejectUnauthorized: false }, // Required for DigitalOcean
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000,       // 30 seconds
  max: 20,                        // Max clients in the pool
  min: 4                          // Min clients in the pool
};

// Create pool instance
const pool = new Pool(dbConfig);

// Test connection once on startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL:', {
      host: client.connectionParameters.host,
      database: client.connectionParameters.database,
      user: client.connectionParameters.user,
      port: client.connectionParameters.port,
    });
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1); // Exit app if DB is not reachable
  }
};

testConnection();

// Handle unexpected errors
pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = pool;
