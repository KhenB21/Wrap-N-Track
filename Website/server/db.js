const { Pool } = require('pg');
const WebSocket = require('ws');
require('dotenv').config({ path: __dirname + '/.env' });

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Create a new pool using the configuration
const pool = new Pool(dbConfig);

// Log database configuration (without sensitive data)
console.log('Database configuration:', {
  connectionString: process.env.DATABASE_URL ? '[REDACTED]' : 'Not set',
  ssl: dbConfig.ssl
});

// Test the connection immediately
pool.connect()
  .then(client => {
    console.log('Successfully connected to PostgreSQL database');
    console.log('Database connection details:', {
      host: client.connectionParameters.host,
      port: client.connectionParameters.port,
      database: client.connectionParameters.database,
      user: client.connectionParameters.user,
      ssl: client.connectionParameters.ssl
    });
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to PostgreSQL database:', err);
    console.error('Error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
    console.error('Database configuration:', {
      connectionString: process.env.DATABASE_URL ? '[REDACTED]' : 'Not set',
      ssl: dbConfig.ssl
    });
    process.exit(1);
  });

// Add error handler for pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  console.error('Error details:', {
    code: err.code,
    message: err.message,
    stack: err.stack
  });
  process.exit(-1);
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