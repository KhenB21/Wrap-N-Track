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
        customerAddress,
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
      const finalOrderData = { ...orderResult.rows[0], total_cost: calculatedTotalCost, products };
      res.status(201).json(finalOrderData);
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

// Update customer order status and details, and manage inventory
router.put('/:order_id', async (req, res) => {
  const { order_id } = req.params;
  const {
    account_name,
    name, // customer name
    order_date,
    expected_delivery,
    status, // e.g., "To be pack"
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
    products, // array of { sku, quantity, profit_margin, name (product name) }
    // total_profit_estimation is also in the payload, handle if needed for 'orders' table
  } = req.body;

  // Validate products array
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Products are required and must be a non-empty array.' });
  }
  for (const product of products) {
    if (!product.sku || typeof product.quantity !== 'number' || product.quantity <= 0) {
      return res.status(400).json({ error: 'Each product must have a valid SKU and a positive quantity.' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Calculate the new total_cost based on the provided products array
    let calculatedNewTotalCost = 0;
    if (products && Array.isArray(products) && products.length > 0) {
      for (const product of products) {
        const inventoryItemResult = await client.query(
          'SELECT unit_price FROM inventory_items WHERE sku = $1',
          [product.sku]
        );
        if (inventoryItemResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Product with SKU ${product.sku} not found in inventory for cost calculation.` });
        }
        const unitPrice = parseFloat(inventoryItemResult.rows[0].unit_price) || 0;
        const quantity = parseInt(product.quantity, 10) || 0;
        calculatedNewTotalCost += unitPrice * quantity;
      }
    }

    // 1. Inventory Check
    for (const product of products) {
      const inventoryResult = await client.query(
        'SELECT quantity FROM inventory_items WHERE sku = $1',
        [product.sku]
      );

      if (inventoryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Product with SKU ${product.sku} not found in inventory.` });
      }
      const availableQuantity = inventoryResult.rows[0].quantity;
      if (availableQuantity < product.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for SKU ${product.sku}. Available: ${availableQuantity}, Requested: ${product.quantity}.` });
      }
    }

    // 2. Update Order Details
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    const addUpdateField = (fieldName, value) => {
      if (value !== undefined) {
        updateFields.push(`${fieldName} = $${valueIndex++}`);
        updateValues.push(value);
      }
    };
    
    addUpdateField('account_name', account_name);
    addUpdateField('name', name);
    addUpdateField('order_date', order_date);
    addUpdateField('expected_delivery', expected_delivery);
    addUpdateField('status', status); 
    addUpdateField('package_name', package_name);
    addUpdateField('payment_method', payment_method);
    addUpdateField('payment_type', payment_type);
    addUpdateField('shipped_to', shipped_to);
    addUpdateField('shipping_address', shipping_address);
    addUpdateField('total_cost', calculatedNewTotalCost); // Use the recalculated total cost
    addUpdateField('remarks', remarks);
    addUpdateField('telephone', telephone);
    addUpdateField('cellphone', cellphone);
    addUpdateField('email_address', email_address);
    // const { total_profit_estimation } = req.body; // Get it if you need to update it
    // addUpdateField('total_profit_estimation', total_profit_estimation);


    if (updateFields.length === 0 && status === undefined) { // Ensure at least status is being updated or some field
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No fields to update for the order, or status is missing.' });
    }
    
    // If only status is being updated and it's the only field, this is fine.
    // If updateFields is empty but status is defined, it means only status is being updated (handled by addUpdateField)

    updateValues.push(order_id); 
    const updateOrderQuery = `UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = $${valueIndex} RETURNING *`;
    
    const orderResult = await client.query(updateOrderQuery, updateValues);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found.' });
    }

    // 3. Delete existing order products
    await client.query('DELETE FROM order_products WHERE order_id = $1', [order_id]);

    // 4. Insert updated order products (without 'name' column for order_products)
    for (const product of products) {
      await client.query(
        `INSERT INTO order_products (order_id, sku, quantity, profit_margin)
         VALUES ($1, $2, $3, $4)`,
        [order_id, product.sku, product.quantity, parseFloat(product.profit_margin) || 0]
      );
    }

    // 5. Deduct Stock from Inventory
    for (const product of products) {
      await client.query(
        'UPDATE inventory_items SET quantity = quantity - $1 WHERE sku = $2',
        [product.quantity, product.sku]
      );
    }

    await client.query('COMMIT');
    
    const updatedOrderData = orderResult.rows[0];
    // Re-fetch products for consistency, selecting i.name from inventory_items
    const finalProductsResult = await client.query(
        `SELECT op.sku, op.quantity, op.profit_margin, i.name, i.image_data 
         FROM order_products op 
         LEFT JOIN inventory_items i ON op.sku = i.sku
         WHERE op.order_id = $1`, [order_id]
    );
    updatedOrderData.products = finalProductsResult.rows.map(p => ({
        ...p,
        image_data: p.image_data ? p.image_data.toString('base64') : null
    }));
    
    res.json(updatedOrderData);

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating customer order:', error);
    res.status(500).json({ error: 'Failed to update customer order.', details: error.message });
  } finally {
    if (client) client.release();
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

    // If status is 'Pending', proceed to cancel and restock
    console.log(`[CancelOrder-${order_id}] Attempting to cancel and restock.`);
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

module.exports = router;
