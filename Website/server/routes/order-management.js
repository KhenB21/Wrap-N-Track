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
    const { status, notes } = req.body;
    const updatedBy = req.user.user_id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status transition
    const validStatuses = [
      'Order Placed', 'Order Paid', 'To Be Packed', 
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
});

module.exports = router;
