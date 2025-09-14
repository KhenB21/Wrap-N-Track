const express = require('express');
// Use centralized pooled connection
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
// Embed a lightweight build signature (update manually when deploying)
const ORDERS_ROUTE_BUILD = 'orders-route-build:2025-09-12-01';

router.get('/_version', (req,res)=>{
  res.json({ route: 'orders', build: ORDERS_ROUTE_BUILD });
});

// Helper to generate a unique customer order ID (retry loop safeguards duplicates under concurrency)
async function generateUniqueCustomerOrderId(client) {
  // Format: #COYYYYMMDD-HHMMSS-<6 random base36>
  const pad = (n) => n.toString().padStart(2, '0');
  for (let attempt = 0; attempt < 5; attempt++) {
    const now = new Date();
    const id = `#CO${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-` +
      Math.random().toString(36).substring(2, 8).toUpperCase();
    const exists = await client.query('SELECT 1 FROM orders WHERE order_id = $1', [id]);
    if (exists.rows.length === 0) return id;
  }
  // Fallback (extremely unlikely to reach)
  return `#CO${Date.now()}`;
}

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
  let client;
  try {
    client = await pool.connect();
    const ordersResult = await client.query('SELECT * FROM orders ORDER BY order_date DESC');
    const orders = ordersResult.rows;
    for (let order of orders) {
      const productsResult = await client.query(`
        SELECT op.line_id, op.sku, op.quantity, op.profit_margin, i.name, i.image_data, i.unit_price
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
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  } finally {
    if (client) client.release();
  }
});

// Get products for a specific order (used by frontend order detail views)
router.get('/:order_id/products', async (req, res) => {
  const { order_id } = req.params;
  try {
    const result = await pool.query(`
  SELECT op.line_id, op.sku, op.quantity, op.profit_margin, i.name, i.image_data, i.unit_price
      FROM order_products op
      JOIN inventory_items i ON op.sku = i.sku
      WHERE op.order_id = $1
    `, [order_id]);
    const products = result.rows.map(p => ({
      ...p,
      image_data: p.image_data ? p.image_data.toString('base64') : null
    }));
    res.json({ success: true, order_id, products });
  } catch (error) {
    console.error('Error fetching order products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order products' });
  }
});


// Create new customer order
router.post('/', async (req, res) => {
  let client;
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

  client = await pool.connect();
  await client.query('BEGIN');

      // Always ensure we end up with a unique order_id
      let order_id;
      if (providedOrderId) {
        const existingOrder = await client.query('SELECT 1 FROM orders WHERE order_id = $1', [providedOrderId]);
        if (existingOrder.rows.length === 0) {
          order_id = providedOrderId; // safe to use
        } else {
          // Auto-generate a new one instead of failing (prevents user confusion about invisible orders)
          order_id = await generateUniqueCustomerOrderId(client);
        }
      } else {
        order_id = await generateUniqueCustomerOrderId(client);
      }

      // Get customer's address from customer_details
      const customerResult = await client.query(
        'SELECT address FROM customer_details WHERE email_address = $1',
        [email_address]
      );

      if (!customerResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Customer not found' });
      }

      const customerAddress = customerResult.rows[0].address || 'Unknown Address';

      // Insert into orders table with duplicate retry guard (handles rare race conditions)
      let orderResult;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          orderResult = await client.query(`
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
            customerAddress,
            total_cost,
            remarks,
            telephone,
            cellphone,
            email_address
          ]);
          break; // success
        } catch (e) {
          if (e.code === '23505') { // duplicate primary key
            order_id = await generateUniqueCustomerOrderId(client); // regenerate and retry
            if (attempt === 4) throw e; // give up after retries
            continue;
          }
          throw e;
        }
      }

      if (!orderResult || !orderResult.rows.length) {
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

    // Insert order products if provided (allow duplicate SKUs as separate lines)
    console.log('Received products for order:', JSON.stringify(products, null, 2));
    if (products && Array.isArray(products) && products.length > 0) {
      console.log(`Processing ${products.length} products for order ${order_id}`);
      for (const raw of products) {
          const product = { ...raw };
          if (product.itemName && !product.sku) {
            const skuResult = await client.query('SELECT sku FROM inventory_items WHERE name = $1', [product.itemName]);
            if (skuResult.rows.length === 0) {
              await client.query('ROLLBACK');
              return res.status(400).json({ error: `Product not found in inventory: ${product.itemName}` });
            }
            product.sku = skuResult.rows[0].sku;
          }
          if (!product.sku || product.quantity === undefined) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Each product must have a valid SKU and quantity' });
          }
          const skuCheck = await client.query('SELECT sku FROM inventory_items WHERE sku = $1', [product.sku]);
          if (skuCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Product with SKU '${product.sku}' not found in inventory.` });
          }
          await client.query(
            'INSERT INTO order_products (order_id, sku, quantity, profit_margin) VALUES ($1,$2,$3,$4)',
            [order_id, product.sku, Number(product.quantity) || 0, product.profit_margin != null ? Number(product.profit_margin) : 0]
          );
          console.log(`Successfully inserted product: ${product.sku} (qty: ${product.quantity}) for order ${order_id}`);
        }
      }

      // Calculate and update total_cost for the order
      let calculatedTotalCost = 0;
      if (products && Array.isArray(products) && products.length > 0) {
        for (const product of products) {
          const inventoryItemResult = await client.query(
            'SELECT unit_price FROM inventory_items WHERE sku = $1',
            [product.sku]
          );
          if (inventoryItemResult.rows.length > 0) {
            const unitPrice = parseFloat(inventoryItemResult.rows[0].unit_price) || 0;
            const quantity = parseInt(product.quantity, 10) || 0;
            calculatedTotalCost += unitPrice * quantity;
          }
        }
      }

      // Update the orders table with the calculated total_cost
      await client.query(
        'UPDATE orders SET total_cost = $1 WHERE order_id = $2',
        [calculatedTotalCost, order_id]
      );

  await client.query('COMMIT');

      // Construct the response object, ensuring total_cost is up-to-date
      // Fetch inserted products including line_id
      const linesResult = await client.query(
        'SELECT line_id, sku, quantity, profit_margin FROM order_products WHERE order_id = $1 ORDER BY line_id ASC',
        [order_id]
      );

      const finalOrderData = { 
        ...orderResult.rows[0], 
        total_cost: calculatedTotalCost, 
        products: linesResult.rows,
        // Provide visibility if server auto-changed a duplicate provided ID
        original_provided_order_id: providedOrderId && providedOrderId !== order_id ? providedOrderId : null,
        build: ORDERS_ROUTE_BUILD
      };
    res.status(201).json(finalOrderData);

  } catch (error) {
    try {
      if (client) await client.query('ROLLBACK');
    } catch(e) { /* ignore rollback error */ }
    console.error('Error creating customer order:', error);
    res.status(500).json({ error: 'Failed to create customer order.', details: error.message });
  } finally {
    if (client) client.release();
  }
});

// Update an existing customer order (supports duplicate SKU lines via line_id surrogate key)
router.put('/:order_id', async (req, res) => {
  const { order_id } = req.params;
  const {
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
    remarks,
    telephone,
    cellphone,
    email_address,
    products // optional array of { line_id? (ignored), sku, quantity, profit_margin }
  } = req.body;

  const hasProductsPayload = Array.isArray(products) && products.length > 0;
  if (hasProductsPayload) {
    for (const p of products) {
      if (!p.sku || typeof p.quantity !== 'number' || p.quantity <= 0) {
        return res.status(400).json({ error: 'Each product needs sku and positive quantity' });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure order exists
    const existingOrderResult = await client.query('SELECT * FROM orders WHERE order_id = $1', [order_id]);
    if (!existingOrderResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const existingOrder = existingOrderResult.rows[0];
    const normalize = (s) => (typeof s === 'string' ? s.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') : '');
    const currentNorm = normalize(existingOrder.status);
    const statusHasDeducted = ['tobepack','readyfordeliver','readyfordelivery','enroute','completed'].includes(currentNorm);

    // If we are replacing products, first restore inventory only if it was previously deducted
    const existingLinesResult = await client.query('SELECT line_id, sku, quantity FROM order_products WHERE order_id = $1', [order_id]);
    const existingLines = existingLinesResult.rows;
    if (hasProductsPayload && statusHasDeducted) {
      for (const old of existingLines) {
        await client.query('UPDATE inventory_items SET quantity = quantity + $1 WHERE sku = $2', [old.quantity, old.sku]);
      }
    }

    if (hasProductsPayload) {
      // Remove old lines before inserting new ones
      await client.query('DELETE FROM order_products WHERE order_id = $1', [order_id]);
      // Insert new lines & conditionally deduct inventory
      const newStatusNorm = normalize(status);
      const shouldDeductNow = statusHasDeducted || ['tobepack','readyfordeliver','readyfordelivery','enroute','completed'].includes(newStatusNorm);
      for (const p of products) {
        // Validate sku exists
        const skuCheck = await client.query('SELECT unit_price FROM inventory_items WHERE sku = $1', [p.sku]);
        if (!skuCheck.rows.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `SKU ${p.sku} not found in inventory` });
        }
        await client.query(
          'INSERT INTO order_products (order_id, sku, quantity, profit_margin) VALUES ($1,$2,$3,$4)',
          [order_id, p.sku, p.quantity, p.profit_margin != null ? Number(p.profit_margin) : 0]
        );
        if (shouldDeductNow) {
          const invResult = await client.query('UPDATE inventory_items SET quantity = quantity - $1 WHERE sku = $2 RETURNING quantity', [p.quantity, p.sku]);
          if (invResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `SKU ${p.sku} not found while deducting` });
          }
          if (invResult.rows[0].quantity < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Insufficient stock for SKU ${p.sku}` });
          }
        }
      }
    } else if (status && normalize(status) === 'tobepack' && !statusHasDeducted) {
      // Status-only move from Pending -> To Be Pack: deduct existing lines now
      for (const line of existingLines) {
        const invResult = await client.query('UPDATE inventory_items SET quantity = quantity - $1 WHERE sku = $2 RETURNING quantity', [line.quantity, line.sku]);
        if (invResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `SKU ${line.sku} not found while deducting` });
        }
        if (invResult.rows[0].quantity < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Insufficient stock for SKU ${line.sku}` });
        }
      }
    }

    // Recalculate total cost from fresh lines
    let newTotalCost = 0;
    const pricedLines = hasProductsPayload ? products : existingLines;
    for (const p of pricedLines) {
      const sku = p.sku;
      const qty = parseInt(p.quantity, 10) || 0;
      const priceResult = await client.query('SELECT unit_price FROM inventory_items WHERE sku = $1', [sku]);
      const unitPrice = priceResult.rows.length ? parseFloat(priceResult.rows[0].unit_price) || 0 : 0;
      newTotalCost += unitPrice * qty;
    }

    // Dynamically build update statement (always set total_cost)
    const updateFields = [];
    const values = [];
    let idx = 1;
    const add = (col, val) => { if (val !== undefined) { updateFields.push(`${col} = $${idx++}`); values.push(val); } };
    add('account_name', account_name);
    add('name', name);
    add('order_date', order_date);
    add('expected_delivery', expected_delivery);
    add('status', status);
    add('package_name', package_name);
    add('payment_method', payment_method);
    add('payment_type', payment_type);
    add('shipped_to', shipped_to);
    add('shipping_address', shipping_address);
    add('remarks', remarks);
    add('telephone', telephone);
    add('cellphone', cellphone);
    add('email_address', email_address);
    // Always update total_cost last to avoid omission
    updateFields.push(`total_cost = $${idx++}`); values.push(newTotalCost);
    values.push(order_id);

    await client.query(`UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = $${idx}`, values);

    // Fetch updated lines with metadata
    const newLines = await client.query(
      `SELECT op.line_id, op.sku, op.quantity, op.profit_margin, i.name, i.image_data
         FROM order_products op
         LEFT JOIN inventory_items i ON op.sku = i.sku
         WHERE op.order_id = $1 ORDER BY op.line_id ASC`,
      [order_id]
    );

    // Determine final status after update (either provided or existing)
    const finalStatus = status !== undefined ? status : existingOrder.status;
    const finalNorm = normalize(finalStatus);

    // If Completed/Cancelled, archive immediately (move to order_history)
    if (['completed','cancelled'].includes(finalNorm)) {
      const updatedOrderResult = await client.query('SELECT * FROM orders WHERE order_id = $1', [order_id]);
      const updatedOrder = updatedOrderResult.rows[0];

      // Insert order header to history
      await client.query(
        `INSERT INTO order_history (
          order_id, customer_name, name, shipped_to, order_date, expected_delivery,
          status, shipping_address, total_cost, payment_type, payment_method,
          account_name, remarks, telephone, cellphone, email_address, archived_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          updatedOrder.order_id,
          updatedOrder.name || 'Customer',
          updatedOrder.name || 'Customer',
          updatedOrder.shipped_to || updatedOrder.name || 'Customer',
          updatedOrder.order_date,
          updatedOrder.expected_delivery,
          finalStatus,
          updatedOrder.shipping_address || 'Unknown Address',
          newTotalCost || 0,
          updatedOrder.payment_type || 'Pending',
          updatedOrder.payment_method || 'Pending',
          updatedOrder.account_name || null,
          updatedOrder.remarks || null,
          updatedOrder.telephone || null,
          updatedOrder.cellphone || null,
          updatedOrder.email_address || null,
          req.user?.user_id || null
        ]
      );

      // Insert products to history with unit prices
      const pricedResult = await client.query(
        'SELECT op.sku, op.quantity, i.unit_price FROM order_products op JOIN inventory_items i ON op.sku = i.sku WHERE op.order_id = $1',
        [order_id]
      );
      for (const row of pricedResult.rows) {
        await client.query(
          'INSERT INTO order_history_products (order_id, sku, quantity, unit_price) VALUES ($1,$2,$3,$4)',
          [order_id, row.sku, row.quantity, row.unit_price]
        );
      }

      // Cleanup current tables
      await client.query('DELETE FROM order_products WHERE order_id = $1', [order_id]);
      await client.query('DELETE FROM orders WHERE order_id = $1', [order_id]);

      await client.query('COMMIT');
      return res.json({ archived: true, order_id, status: finalStatus });
    }

    await client.query('COMMIT');

    const payload = {
      ...existingOrderResult.rows[0],
      // Overwrite total_cost with recomputed value
      total_cost: newTotalCost,
      products: newLines.rows.map(r => ({
        ...r,
        image_data: r.image_data ? r.image_data.toString('base64') : null
      })),
      build: ORDERS_ROUTE_BUILD
    };
    res.json(payload);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /api/orders error:', err);
    res.status(500).json({ error: 'Failed to update customer order', details: err.message });
  } finally {
    client.release();
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

// Delete an order by order_id
router.delete('/:order_id', async (req, res) => {
  const { order_id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, check the order's status
    const orderStatusResult = await client.query('SELECT status FROM orders WHERE order_id = $1', [order_id]);

    if (orderStatusResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderStatusResult.rows[0].status;
    const normalizeDBStatus = (status) => {
      if (typeof status !== 'string') return '';
      return status.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    };
    const normalizedDBStatus = normalizeDBStatus(currentStatus);

    if (normalizedDBStatus !== 'pending' && normalizedDBStatus !== 'tobepack') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Order cannot be cancelled. Only orders with status "Pending" or "To Be Pack" can be cancelled.' });
    }

    // If order was already deducted ('To Be Pack' and beyond), restock. If still 'Pending', skip restock.
    const wasDeducted = ['tobepack','readyfordeliver','readyfordelivery','enroute','completed'].includes(normalizedDBStatus);
    if (wasDeducted) {
      console.log(`[CancelOrder-${order_id}] Order was deducted (status=${currentStatus}). Restocking inventory before cancelling.`);
      // Fetch products for the order
      const productsResult = await client.query(
        'SELECT sku, quantity FROM order_products WHERE order_id = $1',
        [order_id]
      );
      const orderProducts = productsResult.rows;
      console.log(`[CancelOrder-${order_id}] Fetched products for restocking:`, JSON.stringify(orderProducts));

      if (orderProducts.length === 0) {
        console.log(`[CancelOrder-${order_id}] No products found in order_products to restock.`);
      }

      // Restock inventory for each product
      for (const product of orderProducts) {
        console.log(`[CancelOrder-${order_id}] Processing product SKU: ${product.sku}, Quantity to restock: ${product.quantity}`);
        if (typeof product.quantity !== 'number' || product.quantity <= 0) {
          console.error(`[CancelOrder-${order_id}] Invalid quantity for SKU ${product.sku}: ${product.quantity}. Skipping restock for this item.`);
          continue;
        }
        const updateInventoryResult = await client.query(
          'UPDATE inventory_items SET quantity = quantity + $1 WHERE sku = $2',
          [product.quantity, product.sku]
        );
        console.log(`[CancelOrder-${order_id}] Inventory update result for SKU ${product.sku}: rowCount = ${updateInventoryResult.rowCount}`);
        if (updateInventoryResult.rowCount === 0) {
          console.warn(`[CancelOrder-${order_id}] WARN: No inventory item found for SKU ${product.sku} or quantity_in_stock was not updated.`);
        }
      }
    } else {
      console.log(`[CancelOrder-${order_id}] Order is Pending. No inventory was deducted; skipping restock.`);
    }

    // Update the order status to 'Cancelled'
    console.log(`[CancelOrder-${order_id}] Updating order status to 'Cancelled'.`);
    await client.query(
      "UPDATE orders SET status = 'Cancelled' WHERE order_id = $1",
      [order_id]
    );

    console.log(`[CancelOrder-${order_id}] Committing transaction.`);
    await client.query('COMMIT');
    console.log(`[CancelOrder-${order_id}] Transaction committed. Responding to client.`);
    res.json({ success: true, message: 'Order cancelled successfully and products restocked.' });

  } catch (error) {
    console.error(`[CancelOrder-${order_id}] Error during cancellation process:`, error.message, error.stack);
    console.log(`[CancelOrder-${order_id}] Rolling back transaction due to error.`);
    try {
      await client.query('ROLLBACK');
      console.log(`[CancelOrder-${order_id}] Transaction rolled back.`);
    } catch (rollbackError) {
      console.error(`[CancelOrder-${order_id}] Error during ROLLBACK:`, rollbackError.message, rollbackError.stack);
    }
    res.status(500).json({ success: false, message: 'Failed to cancel order due to an internal error.', details: error.message });
  } finally {
    client.release();
  }
});

// Get all gift details
router.get('/gift-details', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM order_gift_details ORDER BY name');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching gift details:', error);
    res.status(500).json({ error: 'Failed to fetch gift details' });
  }
});

// Temporary route to backfill total_cost for existing orders
router.post('/backfill-total-costs', async (req, res) => {
  const client = await pool.connect();
  let updatedCount = 0;
  try {
    await client.query('BEGIN');

    // Find orders with total_cost = 0 or NULL
    const ordersToUpdateResult = await client.query(
      'SELECT order_id FROM orders WHERE total_cost IS NULL OR total_cost = 0'
    );
    const ordersToUpdate = ordersToUpdateResult.rows;

    if (ordersToUpdate.length === 0) {
      await client.query('COMMIT'); // or ROLLBACK, doesn't matter much here
      client.release();
      return res.status(200).json({ message: 'No orders found needing total_cost update.', updatedCount: 0 });
    }

    for (const order of ordersToUpdate) {
      const order_id = order.order_id;
      let calculatedTotalCost = 0;

      // Fetch products for this order along with their unit prices
      const productsResult = await client.query(`
        SELECT op.quantity, i.unit_price
        FROM order_products op
        JOIN inventory_items i ON op.sku = i.sku
        WHERE op.order_id = $1
      `, [order_id]);

      if (productsResult.rows.length > 0) {
        for (const product of productsResult.rows) {
          const unitPrice = parseFloat(product.unit_price) || 0;
          const quantity = parseInt(product.quantity, 10) || 0;
          calculatedTotalCost += unitPrice * quantity;
        }
      }

      // Update the order with the calculated total_cost
      const updateResult = await client.query(
        'UPDATE orders SET total_cost = $1 WHERE order_id = $2',
        [calculatedTotalCost, order_id]
      );
      if (updateResult.rowCount > 0) {
        updatedCount++;
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ 
      message: `Successfully updated total_cost for ${updatedCount} order(s).`, 
      updatedCount 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during total_cost backfill:', error);
    res.status(500).json({ error: 'Failed to backfill total_cost for orders.', details: error.message });
  } finally {
    client.release();
  }
});

// GET archived orders
router.get('/archived', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM orders 
      WHERE status IN ('Completed', 'Cancelled')
      ORDER BY order_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching archived orders:', error);
    res.status(500).json({ message: 'Failed to fetch archived orders' });
  }
});

module.exports = router;
