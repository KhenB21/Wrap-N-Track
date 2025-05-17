const { Pool } = require('pg');
const WebSocket = require('ws');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'wrap_n_track',
  password: process.env.DB_PASSWORD || '123qwe123!', 
  port: process.env.DB_PORT || 5432,
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