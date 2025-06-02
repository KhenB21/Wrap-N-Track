const { Pool } = require('pg');
const WebSocket = require('ws');
require('dotenv').config({ path: __dirname + '/.env' });

// Debug: Log the database connection details (with password masked)
const dbUser = process.env.DB_USER || 'wrapntrack_0tfj_user';
const dbHost = process.env.DB_HOST || 'dpg-d0ut1t6uk2gs73atkr10-a.singapore-postgres.render.com';
const dbName = process.env.DB_NAME || 'wrapntrack_0tfj';
const dbPort = process.env.DB_PORT || '5432';
const dbPassword = process.env.DB_PASSWORD || 'tBdOMUDQEUFHMnTfKToZatcnwecc5xod';

console.log('Database User:', dbUser);
console.log('Database Host:', dbHost);
console.log('Database Name:', dbName);
console.log('Database Port:', dbPort);

const pool = new Pool({
  user: dbUser,
  host: dbHost,
  database: dbName,
  password: dbPassword,
  port: parseInt(dbPort),
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL
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