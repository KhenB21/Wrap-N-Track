const express = require('express');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

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

// Get low stock notifications
router.get('/low-stock', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Get items with quantity less than or equal to 300
      const result = await client.query(`
        SELECT sku, name, quantity, unit_price, category, image_data
        FROM inventory_items
        WHERE quantity <= 300
        ORDER BY quantity ASC
      `);

      // Convert image_data to base64 if it exists
      const notifications = result.rows.map(item => ({
        ...item,
        image_data: item.image_data ? item.image_data.toString('base64') : null
      }));

      res.json(notifications);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching low stock notifications:', error);
    res.status(500).json({ error: 'Failed to fetch low stock notifications' });
  }
});

module.exports = router; 