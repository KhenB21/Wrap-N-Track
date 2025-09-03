const express = require('express');
const router = express.Router();
// Centralized pool import
const pool = require('../config/db');

// Get all supplier orders
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT so.*, s.name as supplier_name
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.supplier_id
      ORDER BY so.order_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({ message: 'Error fetching supplier orders' });
  }
});

// Get supplier orders by supplier ID
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT so.*, s.name as supplier_name
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.supplier_id
      WHERE so.supplier_id = $1
      ORDER BY so.order_date DESC
    `, [req.params.supplierId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({ message: 'Error fetching supplier orders' });
  }
});

// Create new supplier order
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { supplier_id, status, order_date, expected_delivery, remarks, items } = req.body;
    
    console.log('Creating order with items:', JSON.stringify(items, null, 2));

    await client.query('BEGIN');

    // Generate a unique order ID
    const orderId = `SO${Date.now()}`;

    // Insert the order
    const orderResult = await client.query(
      `INSERT INTO supplier_orders 
       (supplier_order_id, supplier_id, status, order_date, expected_delivery, remarks) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [orderId, supplier_id, status, order_date, expected_delivery, remarks]
    );

    const order = orderResult.rows[0];
    console.log('Created order:', order);

    // Insert order items
    if (items && items.length > 0) {
      console.log('Inserting order items...');
      for (const item of items) {
        console.log('Inserting item:', JSON.stringify(item, null, 2));
        await client.query(
          `INSERT INTO supplier_order_items 
           (supplier_order_id, product_id, variation, quantity) 
           VALUES ($1, $2, $3, $4)`,
          [orderId, item.product_id, item.variation, item.quantity]
        );
      }
    }

    // Fetch the complete order with items
    const itemsResult = await client.query(
      `SELECT soi.*, i.name as product_name 
       FROM supplier_order_items soi 
       JOIN inventory_items i ON soi.product_id = i.sku 
       WHERE soi.supplier_order_id = $1`,
      [orderId]
    );

    console.log('Fetched order items:', itemsResult.rows);

    await client.query('COMMIT');

    res.status(201).json({
      ...order,
      items: itemsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error creating order' });
  } finally {
    client.release();
  }
});

// Update supplier order
router.put('/:orderId', async (req, res) => {
  const {
    status,
    expected_delivery,
    remarks,
    items
  } = req.body;

  const client = await pool.connect();
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Update the order
    await client.query(`
      UPDATE supplier_orders
      SET status = $1,
          expected_delivery = $2,
          remarks = $3
      WHERE supplier_order_id = $4
    `, [
      status,
      expected_delivery,
      remarks,
      req.params.orderId
    ]);

    // If status is 'Received', move to order history
    if (status === 'Received') {
      const orderResult = await client.query(`
        SELECT so.*, s.name as supplier_name
        FROM supplier_orders so
        JOIN suppliers s ON so.supplier_id = s.supplier_id
        WHERE so.supplier_order_id = $1
      `, [req.params.orderId]);

      const itemsResult = await client.query(`
        SELECT soi.*, i.name as product_name, i.image_data, i.description
        FROM supplier_order_items soi
        LEFT JOIN inventory_items i ON soi.product_id = i.sku
        WHERE soi.supplier_order_id = $1
      `, [req.params.orderId]);

      const order = orderResult.rows[0];
      const items = itemsResult.rows;

      // Insert into order history
      await client.query(`
        INSERT INTO supplier_order_history (
          supplier_order_id,
          supplier_id,
          order_date,
          received_date,
          expected_delivery,
          remarks,
          supplier_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        order.supplier_order_id,
        order.supplier_id,
        order.order_date,
        new Date().toISOString(),
        order.expected_delivery,
        order.remarks,
        order.supplier_name
      ]);

      // Insert items into order history
      for (const item of items) {
        await client.query(`
          INSERT INTO supplier_order_history_items (
            supplier_order_id,
            product_id,
            variation,
            quantity,
            product_name,
            image_data,
            description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          item.supplier_order_id,
          item.product_id,
          item.variation,
          item.quantity,
          item.product_name,
          item.image_data,
          item.description
        ]);
      }

      // Delete from ongoing orders
      await client.query(`
        DELETE FROM supplier_order_items
        WHERE supplier_order_id = $1
      `, [req.params.orderId]);

      await client.query(`
        DELETE FROM supplier_orders
        WHERE supplier_order_id = $1
      `, [req.params.orderId]);

      // Return the complete order history data
      const historyOrder = {
        ...order,
        status: 'Received',
        received_date: new Date().toISOString(),
        items: items.map(item => ({
          ...item,
          image_data: item.image_data ? item.image_data.toString('base64') : null
        }))
      };

      res.json(historyOrder);
      return;
    } else {
      // Update items
      await client.query(`
        DELETE FROM supplier_order_items
        WHERE supplier_order_id = $1
      `, [req.params.orderId]);

      for (const item of items) {
        await client.query(`
          INSERT INTO supplier_order_items (
            supplier_order_id,
            product_id,
            variation,
            quantity
          ) VALUES ($1, $2, $3, $4)
        `, [
          req.params.orderId,
          item.product_id,
          item.variation,
          item.quantity
        ]);
      }
    }

    // Commit the transaction
    await client.query('COMMIT');

    // Fetch the updated order
    const orderResult = await client.query(`
      SELECT so.*, s.name as supplier_name
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.supplier_id
      WHERE so.supplier_order_id = $1
    `, [req.params.orderId]);

    const itemsResult = await client.query(`
      SELECT soi.*, i.name as product_name
      FROM supplier_order_items soi
      JOIN inventory_items i ON soi.product_id = i.sku
      WHERE soi.supplier_order_id = $1
    `, [req.params.orderId]);

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error updating supplier order:', error);
    res.status(500).json({ message: 'Error updating supplier order' });
  } finally {
    client.release();
  }
});

// Delete supplier order
router.delete('/:orderId', async (req, res) => {
  const client = await pool.connect();
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Delete order items first
    await client.query(`
      DELETE FROM supplier_order_items
      WHERE supplier_order_id = $1
    `, [req.params.orderId]);

    // Delete the order
    await client.query(`
      DELETE FROM supplier_orders
      WHERE supplier_order_id = $1
    `, [req.params.orderId]);

    // Commit the transaction
    await client.query('COMMIT');

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error deleting supplier order:', error);
    res.status(500).json({ message: 'Error deleting supplier order' });
  } finally {
    client.release();
  }
});

// Get supplier order history by supplier ID
router.get('/history/supplier/:supplierId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT soh.*, s.name as supplier_name
      FROM supplier_order_history soh
      JOIN suppliers s ON soh.supplier_id = s.supplier_id
      WHERE soh.supplier_id = $1
      ORDER BY soh.order_date DESC
    `, [req.params.supplierId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supplier order history:', error);
    res.status(500).json({ message: 'Error fetching supplier order history' });
  }
});

// Get supplier order history items
router.get('/history/:orderId/items', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sohi.*,
        i.name as product_name,
        i.image_data,
        i.description
      FROM supplier_order_history_items sohi
      LEFT JOIN inventory_items i ON sohi.product_id = i.sku
      WHERE sohi.supplier_order_id = $1
    `, [req.params.orderId]);

    // Convert image_data to base64 if it exists
    const items = result.rows.map(row => ({
      ...row,
      image_data: row.image_data ? row.image_data.toString('base64') : null
    }));

    res.json(items);
  } catch (error) {
    console.error('Error fetching supplier order history items:', error);
    res.status(500).json({ message: 'Error fetching supplier order history items' });
  }
});

// Get supplier order items
router.get('/:orderId/items', async (req, res) => {
  try {
    console.log('Fetching items for order:', req.params.orderId);
    const result = await pool.query(`
      SELECT soi.*, i.name as product_name
      FROM supplier_order_items soi
      JOIN inventory_items i ON soi.product_id = i.sku
      WHERE soi.supplier_order_id = $1
    `, [req.params.orderId]);
    console.log('Query result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supplier order items:', error);
    res.status(500).json({ message: 'Error fetching supplier order items' });
  }
});

module.exports = router; 