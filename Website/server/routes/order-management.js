const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyJwt = require('../middleware/verifyJwt');
const requireRole = require('../middleware/requireRole');

// Apply authentication middleware to all routes
router.use(verifyJwt());

// GET /api/order-management/orders - Get all orders with enhanced status tracking
router.get('/orders', requireRole(['admin', 'sales_manager', 'assistant_sales', 'packer']), async (req, res) => {
  try {
    const { status, customer_name, date_from, date_to, page = 1, limit = 50 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Build dynamic WHERE clause
    if (status && status !== 'all') {
      paramCount++;
      whereConditions.push(`o.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (customer_name) {
      paramCount++;
      whereConditions.push(`LOWER(o.name) LIKE LOWER($${paramCount})`);
      queryParams.push(`%${customer_name}%`);
    }

    if (date_from) {
      paramCount++;
      whereConditions.push(`o.order_date >= $${paramCount}`);
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      whereConditions.push(`o.order_date <= $${paramCount}`);
      queryParams.push(date_to);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        o.order_id,
        o.name as customer_name,
        o.shipped_to,
        o.order_date,
        o.expected_delivery,
        o.status,
        o.shipping_address,
        o.total_cost,
        o.payment_type,
        o.payment_method,
        o.remarks,
        o.telephone,
        o.cellphone,
        o.email_address,
        o.order_placed_at,
        o.order_paid_at,
        o.order_shipped_at,
        o.order_received_at,
        o.status_updated_at,
        u.name as updated_by_name,
        cd.customer_id
      FROM orders o
      LEFT JOIN users u ON o.status_updated_by = u.user_id
      LEFT JOIN customer_details cd ON o.customer_id = cd.customer_id
      ${whereClause}
      ORDER BY o.order_date DESC, o.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN customer_details cd ON o.customer_id = cd.customer_id
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// PUT /api/order-management/orders/:orderId/status - Update order status
router.put('/orders/:orderId/status', requireRole(['admin', 'sales_manager', 'assistant_sales', 'packer']), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, payment_method } = req.body;
    const updatedBy = req.user.user_id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status transition
    const validStatuses = [
      'Pending', 'Order Placed', 'Order Paid', 'To Be Packed', 
      'Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed', 'Cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Check if order exists
    const orderResult = await pool.query(
      'SELECT order_id, status FROM orders WHERE order_id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status using the function
    const updateResult = await pool.query(
      'SELECT update_order_status($1, $2, $3, $4) as success',
      [orderId, status, updatedBy, notes]
    );

    if (!updateResult.rows[0].success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update order status'
      });
    }

    // Update payment method if provided
    if (payment_method) {
      console.log(`Updating payment method for order ${orderId} to: ${payment_method}`);
      const paymentType = payment_method === 'Cash' ? 'Cash' : 'Online';
      const updateResult = await pool.query(
        'UPDATE orders SET payment_method = $1, payment_type = $2 WHERE order_id = $3',
        [payment_method, paymentType, orderId]
      );
      console.log(`Payment method update result: ${updateResult.rowCount} rows affected`);
    }

    // Check if the order should be archived (after status update)
    const checkOrderResult = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
    console.log(`Order status after update: ${status}, Order exists: ${checkOrderResult.rows.length > 0}`);
    
    // If order is completed or cancelled, archive it
    if (checkOrderResult.rows.length > 0 && (status === 'Completed' || status === 'Cancelled')) {
      console.log(`Archiving ${status} order: ${orderId}`);
      
      const order = checkOrderResult.rows[0];
      console.log(`Order to archive: ${order.order_id}, customer_id: ${order.customer_id}, status: ${status}`);
      
      // Ensure we have a customer_id - try multiple methods
      let customerId = order.customer_id;
      
      if (!customerId) {
        console.log(`Customer_id is null for order ${order.order_id}, trying to find customer...`);
        
        // Method 1: Try by email_address
        if (order.email_address) {
          const customerResult = await pool.query(
            'SELECT customer_id FROM customer_details WHERE email_address = $1',
            [order.email_address]
          );
          if (customerResult.rows.length > 0) {
            customerId = customerResult.rows[0].customer_id;
            console.log(`Found customer_id by email_address: ${customerId}`);
          }
        }
        
        // Method 2: Try by name if email didn't work
        if (!customerId && order.name) {
          const customerResult = await pool.query(
            'SELECT customer_id FROM customer_details WHERE name = $1',
            [order.name]
          );
          if (customerResult.rows.length > 0) {
            customerId = customerResult.rows[0].customer_id;
            console.log(`Found customer_id by name: ${customerId}`);
          }
        }
        
        // Method 3: Try by cellphone if name didn't work
        if (!customerId && order.cellphone) {
          const customerResult = await pool.query(
            'SELECT customer_id FROM customer_details WHERE phone_number = $1',
            [order.cellphone]
          );
          if (customerResult.rows.length > 0) {
            customerId = customerResult.rows[0].customer_id;
            console.log(`Found customer_id by cellphone: ${customerId}`);
          }
        }
        
        if (!customerId) {
          console.error(`Could not find customer_id for order ${order.order_id}. Email: ${order.email_address}, Name: ${order.name}, Cellphone: ${order.cellphone}`);
          // Still archive the order but with customer_id as null - it will be visible to all customers
          customerId = null;
        }
      }
      
      // Insert into order_history
      await pool.query(
        `INSERT INTO order_history (
          order_id, customer_name, name, shipped_to, order_date, expected_delivery,
          status, shipping_address, total_cost, payment_type, payment_method,
          account_name, remarks, telephone, cellphone, email_address, archived_by, customer_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          order.order_id,
          order.name || 'Customer',
          order.name || 'Customer',
          order.shipped_to || order.name || 'Customer',
          order.order_date,
          order.expected_delivery,
          status, // Use the status from the request
          order.shipping_address || 'Unknown Address',
          order.total_cost || 0,
          order.payment_type || 'Pending',
          order.payment_method || 'Pending',
          order.account_name || null,
          order.remarks || null,
          order.telephone || null,
          order.cellphone || null,
          order.email_address || null,
          updatedBy,
          customerId
        ]
      );
      console.log(`Order ${order.order_id} archived successfully with customer_id: ${customerId}`);
      
      // Get and insert order products
      const productsResult = await pool.query(
        'SELECT op.*, i.unit_price FROM order_products op JOIN inventory_items i ON op.sku = i.sku WHERE op.order_id = $1',
        [orderId]
      );
      
      for (const product of productsResult.rows) {
        await pool.query(
          `INSERT INTO order_history_products (order_id, sku, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [orderId, product.sku, product.quantity, product.unit_price]
        );
      }
      
      // Delete from order_products first (due to foreign key constraint)
      await pool.query('DELETE FROM order_products WHERE order_id = $1', [orderId]);
      
      // Delete from orders
      await pool.query('DELETE FROM orders WHERE order_id = $1', [orderId]);
      
      console.log(`Successfully archived order: ${orderId}`);
      
      return res.json({
        success: true,
        message: `Order ${status.toLowerCase()} and archived successfully`,
        archived: true
      });
    }

    // Get updated order details
    const updatedOrder = await pool.query(`
      SELECT 
        o.*,
        u.name as updated_by_name
      FROM orders o
      LEFT JOIN users u ON o.status_updated_by = u.user_id
      WHERE o.order_id = $1
    `, [orderId]);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder.rows[0]
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// GET /api/order-management/orders/:orderId/history - Get order status history
router.get('/orders/:orderId/history', requireRole(['admin', 'sales_manager', 'assistant_sales', 'packer']), async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await pool.query(`
      SELECT 
        osh.history_id,
        osh.old_status,
        osh.new_status,
        osh.updated_at,
        osh.notes,
        u.name as updated_by_name
      FROM order_status_history osh
      LEFT JOIN users u ON osh.updated_by = u.user_id
      WHERE osh.order_id = $1
      ORDER BY osh.updated_at DESC
    `, [orderId]);

    res.json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order history'
    });
  }
});

// GET /api/order-management/dashboard-stats - Get dashboard statistics
router.get('/dashboard-stats', requireRole(['admin', 'sales_manager', 'assistant_sales', 'packer']), async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'Order Placed' THEN 1 END) as order_placed,
        COUNT(CASE WHEN status = 'Order Paid' THEN 1 END) as order_paid,
        COUNT(CASE WHEN status = 'To Be Packed' THEN 1 END) as to_be_packed,
        COUNT(CASE WHEN status = 'Order Shipped Out' THEN 1 END) as order_shipped_out,
        COUNT(CASE WHEN status = 'Ready for Delivery' THEN 1 END) as ready_for_delivery,
        COUNT(CASE WHEN status = 'Order Received' THEN 1 END) as order_received,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_cost), 0) as total_revenue
      FROM orders
      WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
    `);

    res.json({
      success: true,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// GET /api/order-management/orders/:orderId - Get single order details
router.get('/orders/:orderId', requireRole(['admin', 'sales_manager', 'assistant_sales', 'packer']), async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`Fetching single order details for: ${orderId}`);

    const orderResult = await pool.query(`
      SELECT 
        o.*,
        u.name as updated_by_name,
        cd.customer_id
      FROM orders o
      LEFT JOIN users u ON o.status_updated_by = u.user_id
      LEFT JOIN customer_details cd ON o.customer_id = cd.customer_id
      WHERE o.order_id = $1
    `, [orderId]);
    
    console.log(`Order query result: ${orderResult.rows.length} rows found`);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order products
    const productsResult = await pool.query(`
      SELECT 
        op.sku,
        ii.name as product_name,
        ii.description,
        ii.unit_price,
        op.quantity,
        (ii.unit_price * op.quantity) as total_price
      FROM order_products op
      JOIN inventory_items ii ON op.sku = ii.sku
      WHERE op.order_id = $1
    `, [orderId]);

    res.json({
      success: true,
      order: {
        ...orderResult.rows[0],
        products: productsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
});

// GET /api/order-management/archived-orders - Get archived orders
router.get('/archived-orders', requireRole(['admin', 'sales_manager', 'assistant_sales', 'packer']), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        oh.*,
        u.name as archived_by_name
      FROM order_history oh
      LEFT JOIN users u ON oh.archived_by = u.user_id
      ORDER BY oh.order_date DESC, oh.archived_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM order_history');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching archived orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch archived orders'
    });
  }
});

module.exports = router;
