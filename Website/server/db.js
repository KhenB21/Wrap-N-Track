const { Pool } = require('pg');
const WebSocket = require('ws');
require('dotenv').config({ path: __dirname + '/../.env' });

// Debug: Log the database URL (with password masked)
const dbUrl = process.env.DATABASE_URL;
console.log('Database URL:', dbUrl ? 'Present' : 'Missing');
console.log('Database Host:', process.env.DB_HOST || 'Not set');

// Parse and log connection details (safely)
if (dbUrl) {
  try {
    const url = new URL(dbUrl);
    console.log('Connection details:', {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      database: url.pathname.split('/')[1],
      user: url.username
    });
  } catch (err) {
    console.error('Error parsing DATABASE_URL:', err.message);
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const pool = new Pool({

  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false // Required for Render's PostgreSQL
  }
});

// Test the connection immediately
pool.connect()
  .then(client => {
    console.log('Successfully connected to PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to PostgreSQL database:', err);
    process.exit(1);
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
  } finally {
    client.release();
  }
};

// Initialize database listeners
setupDatabaseListeners();

module.exports = {
  pool,
  wss,
  notifyChange
}; 