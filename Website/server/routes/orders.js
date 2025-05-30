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

// Create new customer order
router.post('/', async (req, res) => {
  try {
    const {
      order_id: providedOrderId,
      account_name,
      name,
      order_date,
      expected_delivery,
      status,
      package_name,
      payment_method,
      payment_type,
      shipped_to,
      shipping_address,
      total_cost,
      remarks,
      telephone,
      cellphone,
      email_address,
      products // array of { sku, quantity, profit_margin }
    } = req.body;

    // Validate required fields (excluding order_id since we'll generate it if needed)
    if (!account_name || !name || !order_date || !expected_delivery || !status || !package_name || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Missing required fields for customer order' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate a unique order ID if not provided
      let order_id = providedOrderId;
      if (!order_id) {
        order_id = `#CO${Date.now()}`;
      } else {
        // Check if order_id already exists
        const existingOrder = await client.query(
          'SELECT order_id FROM orders WHERE order_id = $1',
          [order_id]
        );
        if (existingOrder.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: 'Order ID already exists',
            details: `An order with ID ${order_id} already exists. Please try again with a different order ID.`
          });
        }
      }

      // Insert into orders table
      const orderResult = await client.query(`
        INSERT INTO orders (
          order_id,
          account_name,
          name,
          order_date,
          expected_delivery,
          status,
          package_name,
          payment_method,
          payment_type,
          shipped_to,
          shipping_address,
          total_cost,
          remarks,
          telephone,
          cellphone,
          email_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *
      `, [
        order_id,
        account_name,
        name,
        order_date,
        expected_delivery,
        status,
        package_name,
        payment_method,
        payment_type,
        shipped_to,
        shipping_address,
        total_cost,
        remarks,
        telephone,
        cellphone,
        email_address
      ]);

      if (!orderResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Failed to create customer order' });
      }

      // Insert order products
      for (const product of products) {
        if (!product.sku || !product.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Each product must have sku and quantity' });
        }
        await client.query(`
          INSERT INTO order_products (order_id, sku, quantity, profit_margin)
          VALUES ($1, $2, $3, $4)
        `, [order_id, product.sku, product.quantity, product.profit_margin || 0]);
      }

      await client.query('COMMIT');
      res.status(201).json({
        ...orderResult.rows[0],
        products
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating customer order:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ 
          error: 'Order ID already exists',
          details: `An order with ID ${providedOrderId} already exists. Please try again with a different order ID.`
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to create customer order', 
        details: error.message 
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in customer order route:', error);
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
