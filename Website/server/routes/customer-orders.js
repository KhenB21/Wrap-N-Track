const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyJwt = require('../middleware/verifyJwt');

// Apply authentication middleware to all routes
router.use(verifyJwt());

// GET /api/customer-orders/orders - Get customer's orders
router.get('/orders', async (req, res) => {
  try {
    // Handle both customer and employee tokens
    let customerId = req.user.customer_id;
    
    // If this is an employee token, we need to get customer_id from query params or return all orders
    if (!customerId && req.user.user_id) {
      // This is an employee - check if they want specific customer orders
      const { customer_id } = req.query;
      if (customer_id) {
        customerId = customer_id;
      } else {
        // Employee wants to see all orders - return all orders
        return await getAllOrdersForEmployee(req, res);
      }
    }
    
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required or customer_id parameter needed for employee access'
      });
    }

    // Fetch active orders from orders table
    const activeOrdersResult = await pool.query(`
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
        '[]'::json as products
      FROM orders o
      WHERE o.customer_id = $1
    `, [customerId]);

    // Fetch completed/cancelled orders from order_history table
    // Include orders that match customer_id OR have matching email/name for this customer
    const historyOrdersResult = await pool.query(`
      SELECT 
        oh.order_id,
        oh.customer_name,
        oh.shipped_to,
        oh.order_date,
        oh.expected_delivery,
        oh.status,
        oh.shipping_address,
        oh.total_cost,
        oh.payment_type,
        oh.payment_method,
        oh.remarks,
        oh.telephone,
        oh.cellphone,
        oh.email_address,
        oh.archived_at as order_placed_at,
        oh.archived_at as order_paid_at,
        oh.archived_at as order_shipped_at,
        oh.archived_at as order_received_at,
        oh.archived_at as status_updated_at,
        '[]'::json as products
      FROM order_history oh
      LEFT JOIN customer_details cd ON cd.customer_id = $1
      WHERE oh.customer_id = $1 
         OR (oh.customer_id IS NULL AND (
           oh.email_address = cd.email_address 
           OR oh.name = cd.name 
           OR oh.cellphone = cd.phone_number
         ))
    `, [customerId]);

    // Combine both results
    const allOrders = [...activeOrdersResult.rows, ...historyOrdersResult.rows];
    
    console.log(`Customer ${customerId} orders - Active: ${activeOrdersResult.rows.length}, Archived: ${historyOrdersResult.rows.length}, Total: ${allOrders.length}`);
    console.log('Active orders:', activeOrdersResult.rows.map(o => ({ id: o.order_id, status: o.status })));
    console.log('Archived orders:', historyOrdersResult.rows.map(o => ({ id: o.order_id, status: o.status })));
    
    // Sort by order_date DESC, then by status_updated_at DESC
    allOrders.sort((a, b) => {
      const dateA = new Date(a.order_date);
      const dateB = new Date(b.order_date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      const statusA = new Date(a.status_updated_at || a.order_date);
      const statusB = new Date(b.status_updated_at || b.order_date);
      return statusB.getTime() - statusA.getTime();
    });

    const result = { rows: allOrders };

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
    let customerId = req.user.customer_id;

    // Handle employee access - if no customer_id, allow access to any order
    if (!customerId && req.user.user_id) {
      // This is an employee - they can access any order
      customerId = null; // Will be handled in the query
    }

    if (!customerId && !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    // Get order details from active orders first
    let orderResult;
    if (customerId) {
      // Customer access - only their orders
      orderResult = await pool.query(`
        SELECT 
          o.*,
          u.name as updated_by_name
        FROM orders o
        LEFT JOIN users u ON o.status_updated_by = u.user_id
        WHERE o.order_id = $1 AND o.customer_id = $2
      `, [orderId, customerId]);
    } else {
      // Employee access - any order
      orderResult = await pool.query(`
        SELECT 
          o.*,
          u.name as updated_by_name
        FROM orders o
        LEFT JOIN users u ON o.status_updated_by = u.user_id
        WHERE o.order_id = $1
      `, [orderId]);
    }

    let isArchived = false;

    // If not found in active orders, check archived orders
    if (orderResult.rows.length === 0) {
      if (customerId) {
        // Customer access - only their archived orders
        orderResult = await pool.query(`
          SELECT 
            oh.*,
            u.name as updated_by_name
          FROM order_history oh
          LEFT JOIN users u ON oh.archived_by = u.user_id
          LEFT JOIN customer_details cd ON cd.customer_id = $2
          WHERE oh.order_id = $1 AND (
            oh.customer_id = $2 
            OR (oh.customer_id IS NULL AND (
              oh.email_address = cd.email_address 
              OR oh.name = cd.name 
              OR oh.cellphone = cd.phone_number
            ))
          )
        `, [orderId, customerId]);
      } else {
        // Employee access - any archived order
        orderResult = await pool.query(`
          SELECT 
            oh.*,
            u.name as updated_by_name
          FROM order_history oh
          LEFT JOIN users u ON oh.archived_by = u.user_id
          WHERE oh.order_id = $1
        `, [orderId]);
      }
      isArchived = true;
    }

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order products from appropriate table
    let productsResult;
    if (isArchived) {
      productsResult = await pool.query(`
        SELECT 
          ohp.sku,
          ii.name as product_name,
          ii.description,
          ohp.unit_price,
          ii.image_data,
          ohp.quantity,
          (ohp.unit_price * ohp.quantity) as total_price
        FROM order_history_products ohp
        JOIN inventory_items ii ON ohp.sku = ii.sku
        WHERE ohp.order_id = $1
      `, [orderId]);
    } else {
      productsResult = await pool.query(`
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
    }

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
    let customerId = req.user.customer_id;

    // Handle employee access - if no customer_id, allow access to any order
    if (!customerId && req.user.user_id) {
      // This is an employee - they can access any order
      customerId = null; // Will be handled in the query
    }

    if (!customerId && !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    // Get order with tracking information
    let result;
    if (customerId) {
      // Customer access - only their orders
      result = await pool.query(`
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
    } else {
      // Employee access - any order
      result = await pool.query(`
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
        WHERE o.order_id = $1
      `, [orderId]);
    }

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

// Helper function to get all orders for employee access
async function getAllOrdersForEmployee(req, res) {
  try {
    // Fetch all active orders from orders table
    const activeOrdersResult = await pool.query(`
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
        o.customer_id,
        '[]'::json as products
      FROM orders o
    `);

    // Fetch completed/cancelled orders from order_history table
    const historyOrdersResult = await pool.query(`
      SELECT 
        oh.order_id,
        oh.customer_name,
        oh.shipped_to,
        oh.order_date,
        oh.expected_delivery,
        oh.status,
        oh.shipping_address,
        oh.total_cost,
        oh.payment_type,
        oh.payment_method,
        oh.remarks,
        oh.telephone,
        oh.cellphone,
        oh.email_address,
        oh.archived_at as order_placed_at,
        oh.archived_at as order_paid_at,
        oh.archived_at as order_shipped_at,
        oh.archived_at as order_received_at,
        oh.archived_at as status_updated_at,
        oh.customer_id,
        '[]'::json as products
      FROM order_history oh
    `);

    // Combine both results
    const allOrders = [...activeOrdersResult.rows, ...historyOrdersResult.rows];
    
    console.log(`Employee ${req.user.user_id} viewing all orders - Active: ${activeOrdersResult.rows.length}, Archived: ${historyOrdersResult.rows.length}, Total: ${allOrders.length}`);
    
    // Sort by order_date DESC, then by status_updated_at DESC
    allOrders.sort((a, b) => {
      const dateA = new Date(a.order_date);
      const dateB = new Date(b.order_date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      const statusA = new Date(a.status_updated_at || a.order_date);
      const statusB = new Date(b.status_updated_at || b.order_date);
      return statusB.getTime() - statusA.getTime();
    });

    res.json({
      success: true,
      orders: allOrders
    });
  } catch (error) {
    console.error('Error fetching all orders for employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
}

module.exports = router;
