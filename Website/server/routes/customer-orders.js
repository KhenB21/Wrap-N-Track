const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyJwt = require('../middleware/verifyJwt');

// Apply authentication middleware to all routes
router.use(verifyJwt());

// GET /api/customer-orders/orders - Get customer's orders
router.get('/orders', async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    const result = await pool.query(`
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
        o.status_updated_at
      FROM orders o
      WHERE o.customer_id = $1
      ORDER BY o.order_date DESC, o.created_at DESC
    `, [customerId]);

    res.json({
      success: true,
      orders: result.rows
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// GET /api/customer-orders/orders/:orderId - Get single order details with tracking
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.customer_id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    // Get order details
    const orderResult = await pool.query(`
      SELECT 
        o.*,
        u.name as updated_by_name
      FROM orders o
      LEFT JOIN users u ON o.status_updated_by = u.user_id
      WHERE o.order_id = $1 AND o.customer_id = $2
    `, [orderId, customerId]);

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
        ii.image_data,
        op.quantity,
        (ii.unit_price * op.quantity) as total_price
      FROM order_products op
      JOIN inventory_items ii ON op.sku = ii.sku
      WHERE op.order_id = $1
    `, [orderId]);

    // Get status history
    const historyResult = await pool.query(`
      SELECT 
        osh.old_status,
        osh.new_status,
        osh.updated_at,
        osh.notes,
        u.name as updated_by_name
      FROM order_status_history osh
      LEFT JOIN users u ON osh.updated_by = u.user_id
      WHERE osh.order_id = $1
      ORDER BY osh.updated_at ASC
    `, [orderId]);

    // Determine current tracking stage for customer view
    const order = orderResult.rows[0];
    const trackingStage = getCustomerTrackingStage(order.status);

    res.json({
      success: true,
      order: {
        ...order,
        products: productsResult.rows,
        statusHistory: historyResult.rows,
        trackingStage
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

// GET /api/customer-orders/tracking/:orderId - Get order tracking information
router.get('/tracking/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.customer_id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    // Get order with tracking information
    const result = await pool.query(`
      SELECT 
        o.order_id,
        o.status,
        o.order_placed_at,
        o.order_paid_at,
        o.order_shipped_at,
        o.order_received_at,
        o.expected_delivery,
        o.shipping_address,
        o.total_cost
      FROM orders o
      WHERE o.order_id = $1 AND o.customer_id = $2
    `, [orderId, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = result.rows[0];
    const trackingStage = getCustomerTrackingStage(order.status);
    const trackingSteps = getTrackingSteps(order, trackingStage);

    res.json({
      success: true,
      tracking: {
        orderId: order.order_id,
        currentStage: trackingStage,
        steps: trackingSteps,
        expectedDelivery: order.expected_delivery,
        shippingAddress: order.shipping_address,
        totalCost: order.total_cost
      }
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order tracking'
    });
  }
});

// Helper function to determine customer tracking stage
function getCustomerTrackingStage(status) {
  const statusMap = {
    'Order Placed': 'Order Placed',
    'Order Paid': 'Order Paid',
    'To Be Packed': 'Order Paid', // Customer sees "Order Paid" with "Order is being prepared" label
    'Order Shipped Out': 'Order Shipped Out',
    'Ready for Delivery': 'Order Shipped Out', // Customer sees "Order Shipped Out"
    'Order Received': 'Order Received',
    'Completed': 'Order Received', // Customer sees "Order Received"
    'Cancelled': 'Cancelled'
  };

  return statusMap[status] || 'Order Placed';
}

// Helper function to get tracking steps with status
function getTrackingSteps(order, currentStage) {
  const steps = [
    {
      id: 'order-placed',
      title: 'Order Placed',
      description: 'Your order has been received and is being processed',
      completed: true,
      timestamp: order.order_placed_at,
      status: 'completed'
    },
    {
      id: 'order-paid',
      title: 'Order Paid',
      description: 'Payment confirmed and order is being prepared',
      completed: ['Order Paid', 'To Be Packed', 'Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed'].includes(order.status),
      timestamp: order.order_paid_at,
      status: order.status === 'To Be Packed' ? 'preparing' : 
              ['Order Paid', 'To Be Packed', 'Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed'].includes(order.status) ? 'completed' : 'pending',
      extraLabel: order.status === 'To Be Packed' ? 'Order is being prepared' : null
    },
    {
      id: 'order-shipped',
      title: 'Order Shipped Out',
      description: 'Your order is on its way to you',
      completed: ['Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed'].includes(order.status),
      timestamp: order.order_shipped_at,
      status: ['Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed'].includes(order.status) ? 'completed' : 'pending'
    },
    {
      id: 'order-received',
      title: 'Order Received',
      description: 'Your order has been delivered',
      completed: ['Order Received', 'Completed'].includes(order.status),
      timestamp: order.order_received_at,
      status: ['Order Received', 'Completed'].includes(order.status) ? 'completed' : 'pending'
    }
  ];

  return steps;
}

module.exports = router;
