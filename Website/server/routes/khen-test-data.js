const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Create test data for Khen account
router.post('/create-khen-orders', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    // First, create or get Khen as a customer
    const customerResult = await client.query(`
      INSERT INTO customer_details (name, email_address, phone_number, address, city, state, zip_code, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email_address) DO UPDATE SET
        name = EXCLUDED.name,
        phone_number = EXCLUDED.phone_number,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        country = EXCLUDED.country
      RETURNING customer_id
    `, [
      'Khen Bolima',
      'khen@example.com',
      '+63-912-345-6789',
      '123 Test Street',
      'Manila',
      'NCR',
      '1000',
      'Philippines'
    ]);
    
    const customerId = customerResult.rows[0].customer_id;
    
    // Get some inventory items to create orders
    const inventoryItems = await client.query(`
      SELECT sku, name, unit_price FROM inventory_items 
      WHERE is_active = true 
      ORDER BY sku 
      LIMIT 5
    `);
    
    if (inventoryItems.rows.length === 0) {
      throw new Error('No inventory items found to create test data');
    }
    
    // Create test orders for Khen
    const khenOrders = [
      {
        order_id: 'KHEN-001',
        name: 'Khen Bolima',
        shipped_to: 'Khen Bolima',
        order_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'In Progress',
        shipping_address: '123 Test Street, Manila, NCR 1000, Philippines',
        total_cost: 0, // Will be calculated
        payment_type: 'Online',
        payment_method: 'Credit Card',
        remarks: 'Test order for Khen',
        telephone: '+63-912-345-6789',
        cellphone: '+63-912-345-6789',
        email_address: 'khen@example.com',
        customer_id: customerId,
        order_placed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        order_id: 'KHEN-002',
        name: 'Khen Bolima',
        shipped_to: 'Khen Bolima',
        order_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        expected_delivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        status: 'Ready for Delivery',
        shipping_address: '123 Test Street, Manila, NCR 1000, Philippines',
        total_cost: 0, // Will be calculated
        payment_type: 'Online',
        payment_method: 'PayPal',
        remarks: 'Second test order for Khen',
        telephone: '+63-912-345-6789',
        cellphone: '+63-912-345-6789',
        email_address: 'khen@example.com',
        customer_id: customerId,
        order_placed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        order_id: 'KHEN-003',
        name: 'Khen Bolima',
        shipped_to: 'Khen Bolima',
        order_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        expected_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'Order Placed',
        shipping_address: '123 Test Street, Manila, NCR 1000, Philippines',
        total_cost: 0, // Will be calculated
        payment_type: 'Online',
        payment_method: 'Bank Transfer',
        remarks: 'Third test order for Khen',
        telephone: '+63-912-345-6789',
        cellphone: '+63-912-345-6789',
        email_address: 'khen@example.com',
        customer_id: customerId,
        order_placed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];
    
    // Insert orders
    for (const order of khenOrders) {
      await client.query(`
        INSERT INTO orders (
          order_id, name, shipped_to, order_date, expected_delivery,
          status, shipping_address, total_cost, payment_type, payment_method,
          remarks, telephone, cellphone, email_address, customer_id, order_placed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          order.order_id, order.name, order.shipped_to, order.order_date,
          order.expected_delivery, order.status, order.shipping_address, order.total_cost,
          order.payment_type, order.payment_method, order.remarks, order.telephone,
          order.cellphone, order.email_address, order.customer_id, order.order_placed_at
        ]);
    }
    
    // Create order products
    const orderProducts = [
      // Order 1 - In Progress
      { order_id: 'KHEN-001', sku: inventoryItems.rows[0].sku, quantity: 2 },
      { order_id: 'KHEN-001', sku: inventoryItems.rows[1].sku, quantity: 1 },
      { order_id: 'KHEN-001', sku: inventoryItems.rows[2].sku, quantity: 3 },
      
      // Order 2 - Ready for Delivery
      { order_id: 'KHEN-002', sku: inventoryItems.rows[1].sku, quantity: 1 },
      { order_id: 'KHEN-002', sku: inventoryItems.rows[3].sku, quantity: 2 },
      
      // Order 3 - Order Placed
      { order_id: 'KHEN-003', sku: inventoryItems.rows[0].sku, quantity: 1 },
      { order_id: 'KHEN-003', sku: inventoryItems.rows[4].sku, quantity: 2 }
    ];
    
    // Insert order products and calculate totals
    for (const product of orderProducts) {
      const inventoryItem = inventoryItems.rows.find(item => item.sku === product.sku);
      const totalPrice = inventoryItem.unit_price * product.quantity;
      
      await client.query(`
        INSERT INTO order_products (order_id, sku, quantity, profit_margin, profit_estimation)
        VALUES ($1, $2, $3, 0, 0)
      `, [product.order_id, product.sku, product.quantity]);
      
      // Update order total
      await client.query(`
        UPDATE orders 
        SET total_cost = total_cost + $1 
        WHERE order_id = $2
      `, [totalPrice, product.order_id]);
    }
    
    // Add status history for each order
    const statusHistory = [
      { order_id: 'KHEN-001', old_status: null, new_status: 'Order Placed', notes: 'Order created' },
      { order_id: 'KHEN-001', old_status: 'Order Placed', new_status: 'In Progress', notes: 'Order processing started' },
      { order_id: 'KHEN-002', old_status: null, new_status: 'Order Placed', notes: 'Order created' },
      { order_id: 'KHEN-002', old_status: 'Order Placed', new_status: 'In Progress', notes: 'Order processing started' },
      { order_id: 'KHEN-002', old_status: 'In Progress', new_status: 'Ready for Delivery', notes: 'Order ready for shipping' },
      { order_id: 'KHEN-003', old_status: null, new_status: 'Order Placed', notes: 'Order created' }
    ];
    
    for (const history of statusHistory) {
      await client.query(`
        INSERT INTO order_status_history (order_id, old_status, new_status, updated_by, notes)
        VALUES ($1, $2, $3, NULL, $4)
      `, [history.order_id, history.old_status, history.new_status, history.notes]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Khen test orders created successfully',
      data: {
        customer_id: customerId,
        orders_created: khenOrders.length,
        order_products_created: orderProducts.length,
        status_history_created: statusHistory.length
      }
    });
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error creating Khen test data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Khen test data',
      error: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;

