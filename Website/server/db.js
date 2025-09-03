const { Pool } = require('pg');
const WebSocket = require('ws');
require('dotenv').config({ path: __dirname + '/.env' });

// Database configuration
// Prefer environment variables but fall back to the provided DigitalOcean values so
// deployments that don't set env vars still work. For security, prefer setting
// the DB_* env vars in production rather than committing credentials.
const dbConfig = {
  user: process.env.DB_USER || 'doadmin',
  host: process.env.DB_HOST || 'wrapntrackdb-do-user-22907915-0.k.db.ondigitalocean.com',
  database: process.env.DB_NAME || 'defaultdb',
  password: process.env.DB_PASSWORD || 'AVNS_j8FcQJEuDrwQ7GpJjDk',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 25060,
  // DigitalOcean managed Postgres requires SSL. Use a permissive setting to
  // avoid certificate verification issues without a CA bundle. For stricter
  // verification, provide a CA and set rejectUnauthorized: true.
  ssl: { rejectUnauthorized: false },
  // Add connection timeout and retry settings
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  max: 20, // Maximum number of clients in the pool
  min: 4,  // Minimum number of clients in the pool
};

// Create a new pool using the configuration
const pool = new Pool(dbConfig);

// Log database configuration (without sensitive data)
console.log('Database configuration:', {
  user: dbConfig.user,
  host: dbConfig.host,
  database: dbConfig.database,
  port: dbConfig.port,
  ssl: dbConfig.ssl,
  connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
  idleTimeoutMillis: dbConfig.idleTimeoutMillis,
  max: dbConfig.max,
  min: dbConfig.min
});

// Function to test database connection with retries
const testConnection = async (retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('Successfully connected to PostgreSQL database');
      console.log('Database connection details:', {
        host: client.connectionParameters.host,
        port: client.connectionParameters.port,
        database: client.connectionParameters.database,
        user: client.connectionParameters.user,
        ssl: client.connectionParameters.ssl
      });
      client.release();
      return true;
    } catch (err) {
      console.error(`Connection attempt ${i + 1} failed:`, err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      console.error('Database configuration:', {
        user: dbConfig.user,
        host: dbConfig.host,
        database: dbConfig.database,
        port: dbConfig.port,
        ssl: dbConfig.ssl
      });
      
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('All connection attempts failed');
        process.exit(1);
      }
    }
  }
};

// Test the connection with retries
testConnection();

// Add error handler for pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  console.error('Error details:', {
    code: err.code,
    message: err.message,
    stack: err.stack
  });
  // Don't exit the process in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Create a WebSocket server instance
const wss = new WebSocket.Server({ noServer: true });

// Store active connections
const clients = new Set();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Function to broadcast updates to all connected clients
const broadcastUpdate = (channel, payload) => {
  const message = JSON.stringify({ channel, payload });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Function to listen for database changes
const setupDatabaseListeners = async () => {
  const client = await pool.connect();
  
  try {
    // Listen for changes in the database
    await client.query('LISTEN table_changes');
    
    client.on('notification', (msg) => {
      const { channel, payload } = JSON.parse(msg.payload);
      broadcastUpdate(channel, payload);
    });
    
    console.log('Database listeners set up successfully');
  } catch (error) {
    console.error('Error setting up database listeners:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
  }
};

// Function to notify about changes
const notifyChange = async (channel, payload) => {
  const client = await pool.connect();
  try {
    await client.query(
      'SELECT pg_notify($1, $2)',
      ['table_changes', JSON.stringify({ channel, payload })]
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
  } finally {
    client.release();
  }
};

// Initialize database listeners
setupDatabaseListeners();

const generateUniqueSku = () => {
  let digits = '';
  for (let i = 0; i < 12; i++) {
    digits += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
  }
  return `BC${digits}`;
};

module.exports = {
  pool,
  wss,
  notifyChange
}; 