const express = require('express');
const { pool } = require('../db');
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

// Create new supplier order
router.post('/', async (req, res) => {
  try {
    const {
      supplier_id,
      order_date,
      expected_delivery,
      remarks,
      items
    } = req.body;

    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Supplier ID and items are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate order_id
      const order_id = `ORDER-${Date.now()}`;

      // Insert into orders table
      const orderResult = await client.query(`
        INSERT INTO orders (
          order_id,
          name,
          order_date,
          expected_delivery,
          status,
          remarks,
          telephone,
          cellphone,
          email_address
        ) VALUES ($1, $2, $3, $4, $5, $6, '', '', '') RETURNING *
      `, [
        order_id,
        `Supplier Order ${order_id}`,
        order_date,
        expected_delivery,
        'pending',
        remarks
      ]);

      if (!orderResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Failed to create order' });
      }

      // Insert order products
      const productPromises = items.map(async (item) => {
        try {
          await client.query(`
            INSERT INTO order_products (order_id, sku, quantity)
            VALUES ($1, $2, $3)
          `, [order_id, item.product_id, item.quantity]);
        } catch (error) {
          console.error('Error inserting order product:', error);
          throw error;
        }
      });

      await Promise.all(productPromises);

      await client.query('COMMIT');
      res.status(201).json({
        ...orderResult.rows[0],
        items
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating supplier order:', error);
      res.status(500).json({ error: 'Failed to create supplier order' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in supplier order route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update supplier order
router.put('/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;
    const {
      order_date,
      expected_delivery,
      remarks,
      items
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update order
      const orderResult = await client.query(`
        UPDATE orders SET
          order_date = $1,
          expected_delivery = $2,
          remarks = $3
        WHERE order_id = $4 RETURNING *
      `, [
        order_date,
        expected_delivery,
        remarks,
        order_id
      ]);

      if (!orderResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }

      // Delete existing order products
      await client.query('DELETE FROM order_products WHERE order_id = $1', [order_id]);

      // Insert updated order products
      const productPromises = items.map(async (item) => {
        try {
          await client.query(`
            INSERT INTO order_products (order_id, sku, quantity)
            VALUES ($1, $2, $3)
          `, [order_id, item.product_id, item.quantity]);
        } catch (error) {
          console.error('Error updating order product:', error);
          throw error;
        }
      });

      await Promise.all(productPromises);

      await client.query('COMMIT');
      res.json({
        ...orderResult.rows[0],
        items
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating supplier order:', error);
      res.status(500).json({ error: 'Failed to update supplier order' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in supplier order update route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
