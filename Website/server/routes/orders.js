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

// Get all customer orders with product details
router.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Fetch all orders
      const ordersResult = await client.query('SELECT * FROM orders ORDER BY order_date DESC');
      const orders = ordersResult.rows;

      // For each order, fetch its products
      for (let order of orders) {
        const productsResult = await client.query(`
          SELECT op.sku, op.quantity, op.profit_margin, i.name, i.image_data, i.unit_price
          FROM order_products op
          JOIN inventory_items i ON op.sku = i.sku
          WHERE op.order_id = $1
        `, [order.order_id]);
        order.products = productsResult.rows.map(p => ({
          ...p,
          image_data: p.image_data ? p.image_data.toString('base64') : null
        }));
      }

      res.json(orders);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});


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
      products, // array of { sku, quantity, profit_margin }
      wedding_details // for wedding orders
    } = req.body;

    // Validate required fields (excluding order_id since we'll generate it if needed)
    if (!account_name || !name || !order_date || !expected_delivery || !status || !package_name) {
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

      // If this is a wedding order, insert into customer_wedding_orders
      if (package_name === 'wedding' && wedding_details) {
        // First get the customer_id from customer_details
        const customerResult = await client.query(
          'SELECT customer_id FROM customer_details WHERE email_address = $1',
          [email_address]
        );

        if (!customerResult.rows.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Customer not found' });
        }

        const customer_id = customerResult.rows[0].customer_id;

        // Insert into customer_wedding_orders
        await client.query(`
          INSERT INTO customer_wedding_orders (
            customer_id,
            wedding_style,
            wedding_date,
            guest_count,
            color_scheme,
            special_requests,
            total_cost,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          customer_id,
          wedding_details.wedding_style,
          wedding_details.wedding_date,
          wedding_details.guest_count,
          wedding_details.color_scheme || null,
          wedding_details.special_requests || null,
          total_cost,
          status
        ]);
      }

      // Insert order products if provided
      if (products && Array.isArray(products) && products.length > 0) {
        for (const product of products) {
          // If itemName is provided instead of SKU, look up SKU
          if (product.itemName && !product.sku) {
            const skuResult = await client.query('SELECT sku FROM inventory_items WHERE name = $1', [product.itemName]);
            if (skuResult.rows.length === 0) {
              await client.query('ROLLBACK');
              return res.status(400).json({ error: `Product not found in inventory: ${product.itemName}` });
            }
            product.sku = skuResult.rows[0].sku;
          }

          // Validate that SKU and quantity are present
          if (!product.sku || product.quantity === undefined) { // Check quantity for undefined specifically
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Each product must have a valid SKU and quantity' });
          }

          await client.query(`
            INSERT INTO order_products (order_id, sku, quantity, profit_margin)
            VALUES ($1, $2, $3, $4)
          `, [order_id, product.sku, product.quantity, product.profit_margin || 0]);
        }
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
      items,
      status,
      package_name
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update order (now includes status and package_name)
      const orderResult = await client.query(`
        UPDATE orders SET
          order_date = $1,
          expected_delivery = $2,
          remarks = $3,
          status = COALESCE($4, status),
          package_name = COALESCE($5, package_name)
        WHERE order_id = $6 RETURNING *
      `, [
        order_date,
        expected_delivery,
        remarks,
        status,
        package_name,
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

// Get wedding order details by order ID
router.get('/wedding-orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // First get the order to get the customer email
    const orderResult = await pool.query(
      'SELECT email_address FROM orders WHERE order_id = $1',
      [orderId]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { email_address } = orderResult.rows[0];

    // Get the customer ID
    const customerResult = await pool.query(
      'SELECT customer_id FROM customer_details WHERE email_address = $1',
      [email_address]
    );

    if (!customerResult.rows.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { customer_id } = customerResult.rows[0];

    // Get the wedding order details
    const weddingResult = await pool.query(
      'SELECT * FROM customer_wedding_orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1',
      [customer_id]
    );

    if (!weddingResult.rows.length) {
      return res.status(404).json({ error: 'Wedding order details not found' });
    }

    res.json(weddingResult.rows[0]);
  } catch (error) {
    console.error('Error fetching wedding order details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
