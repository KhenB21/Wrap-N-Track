const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all customers
router.get('/', async (req, res) => {
  try {
    console.log('Attempting to fetch customers from database');
    const result = await pool.query('SELECT * FROM customer_details ORDER BY customer_id');
    console.log('Database query result:', result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new customer
router.post('/', async (req, res) => {
  const { name, phone_number, email_address } = req.body;
  
  if (!name || !email_address) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO customer_details (name, phone_number, email_address) VALUES ($1, $2, $3) RETURNING *',
      [name, phone_number, email_address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Edit a customer
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone_number, email_address } = req.body;

  if (!name || !email_address) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const result = await pool.query(
      'UPDATE customer_details SET name = $1, phone_number = $2, email_address = $3 WHERE customer_id = $4 RETURNING *',
      [name, phone_number, email_address, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a customer
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM customer_details WHERE customer_id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer by email
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log('Fetching customer details for email:', email);
    
    const result = await pool.query(
      'SELECT customer_id, name, email_address, phone_number, address FROM customer_details WHERE email_address = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('No customer found with email:', email);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = result.rows[0];
    console.log('Found customer:', customer);
    
    res.json({
      success: true,
      ...customer
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details'
    });
  }
});

module.exports = router; 