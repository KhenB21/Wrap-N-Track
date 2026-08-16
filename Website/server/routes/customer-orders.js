const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyJwt = require('../middleware/verifyJwt');
const { ensureDeliverySchema, TRACKING_UNAVAILABLE_MESSAGE } = require('../services/deliveryService');

// Apply authentication middleware to all routes
router.use(verifyJwt());
router.use(async (_req, res, next) => {
  try {
    await ensureDeliverySchema(pool);
    next();
  } catch (error) {
    console.error('Error preparing customer delivery schema:', error);
    res.status(500).json({ success: false, message: 'Failed to prepare delivery information' });
  }
});

// GET /api/customer-orders/orders - Get customer's orders
router.get('/orders', async (req, res) => {
  try {
    console.log('Customer orders request - user:', req.user);
    
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
    
    // For customers without customer_id in token, try to find by email or name
    if (!customerId && req.user.email) {
      try {
        const customerResult = await pool.query(
          'SELECT customer_id FROM customer_details WHERE email_address = $1',
          [req.user.email]
        );
        if (customerResult.rows.length > 0) {
          customerId = customerResult.rows[0].customer_id;
        }
      } catch (err) {
        console.error('Error looking up customer by email:', err);
      }
    }
    
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required or customer_id parameter needed for employee access'
      });
    }

    console.log(`Fetching orders for customer_id: ${customerId}`);

    // Fetch active orders from orders table with products
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
        COALESCE(o.order_quantity, 0) AS total_boxes,
        GREATEST(COALESCE(o.total_cost, 0) - COALESCE(pay.total_verified_payments, 0), 0) AS remaining_balance,
        COALESCE(pay.total_verified_payments, 0) AS total_verified_payments,
        CASE
          WHEN COALESCE(o.total_cost, 0) > 0
            AND GREATEST(COALESCE(o.total_cost, 0) - COALESCE(pay.total_verified_payments, 0), 0) = 0 THEN 'Fully Paid'
          WHEN COALESCE(pay.total_verified_payments, 0) > 0 THEN 'Partially Paid'
          ELSE 'Unpaid'
        END AS payment_status,
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
        COALESCE(o.delivery_status, 'Pending') AS delivery_status,
        o.delivery_method,
        o.delivery_type,
        o.courier_name,
        o.tracking_number,
        o.tracking_link_available,
        o.tracking_link,
        COALESCE(o.tracking_unavailable_message, $2) AS tracking_unavailable_message,
        o.proof_image_url,
        o.proof_uploaded_at,
        o.delivery_remarks,
        o.sent_at,
        o.picked_up_at,
        o.delivered_at,
        COALESCE(prod.products, '[]'::json) as products
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(i.amount_paid), 0) AS total_verified_payments
        FROM invoices i
        WHERE i.order_id = o.order_id
          AND i.status = 'PAID'
      ) pay ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'sku', op.sku,
            'name', i.name,
            'quantity', op.quantity,
            'unit_price', i.unit_price,
            'image_data', encode(i.image_data, 'base64')
          )
        ) AS products
        FROM order_products op
        LEFT JOIN inventory_items i ON op.sku = i.sku
        WHERE op.order_id = o.order_id
      ) prod ON true
      WHERE o.customer_id = $1
    `, [customerId, TRACKING_UNAVAILABLE_MESSAGE]);

    // Fetch completed/cancelled orders from order_history table with products
    // Include orders that match customer_id OR have matching email/name for this customer
    console.log(`Fetching archived orders for customer_id: ${customerId}`);
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
        COALESCE(oh.order_quantity, 0) AS total_boxes,
        NULL::numeric AS remaining_balance,
        NULL::numeric AS total_verified_payments,
        NULL::varchar AS payment_status,
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
        COALESCE(oh.delivery_status, 'Pending') AS delivery_status,
        oh.delivery_method,
        oh.delivery_type,
        oh.courier_name,
        oh.tracking_number,
        oh.tracking_link_available,
        oh.tracking_link,
        COALESCE(oh.tracking_unavailable_message, $2) AS tracking_unavailable_message,
        oh.proof_image_url,
        oh.proof_uploaded_at,
        oh.delivery_remarks,
        oh.sent_at,
        oh.picked_up_at,
        oh.delivered_at,
        COALESCE(
          json_agg(
            json_build_object(
              'sku', ohp.sku,
              'name', i.name,
              'quantity', ohp.quantity,
              'unit_price', ohp.unit_price,
              'image_data', encode(i.image_data, 'base64')
            )
          ) FILTER (WHERE ohp.sku IS NOT NULL),
          '[]'::json
        ) as products
      FROM order_history oh
      LEFT JOIN customer_details cd ON cd.customer_id = $1
      LEFT JOIN order_history_products ohp ON oh.order_id = ohp.order_id
      LEFT JOIN inventory_items i ON ohp.sku = i.sku
      WHERE oh.customer_id = $1 
         OR (oh.customer_id IS NULL AND (
           oh.email_address = cd.email_address 
           OR oh.name = cd.name 
           OR oh.cellphone = cd.phone_number
         ))
      GROUP BY oh.order_id, oh.customer_name, oh.shipped_to, oh.order_date,
               oh.expected_delivery, oh.status, oh.shipping_address, oh.total_cost,
               oh.payment_type, oh.payment_method, oh.remarks, oh.telephone,
               oh.cellphone, oh.email_address, oh.archived_at, oh.order_quantity,
               oh.delivery_status, oh.delivery_method, oh.delivery_type, oh.courier_name,
               oh.tracking_number, oh.tracking_link_available, oh.tracking_link,
               oh.tracking_unavailable_message, oh.proof_image_url, oh.proof_uploaded_at,
               oh.delivery_remarks, oh.sent_at, oh.picked_up_at, oh.delivered_at
    `, [customerId, TRACKING_UNAVAILABLE_MESSAGE]);

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
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: process.env.NODE_ENV === 'development' ? error.stack : 'Stack trace hidden in production'
    });
    console.error('Request user:', req.user);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        detail: error.detail
      } : undefined
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
          COALESCE(o.delivery_status, 'Pending') AS delivery_status,
          COALESCE(o.tracking_unavailable_message, $3) AS tracking_unavailable_message,
          u.name as updated_by_name
        FROM orders o
        LEFT JOIN users u ON o.status_updated_by = u.user_id
        WHERE o.order_id = $1 AND o.customer_id = $2
      `, [orderId, customerId, TRACKING_UNAVAILABLE_MESSAGE]);
    } else {
      // Employee access - any order
      orderResult = await pool.query(`
        SELECT 
          o.*,
          COALESCE(o.delivery_status, 'Pending') AS delivery_status,
          COALESCE(o.tracking_unavailable_message, $2) AS tracking_unavailable_message,
          u.name as updated_by_name
        FROM orders o
        LEFT JOIN users u ON o.status_updated_by = u.user_id
        WHERE o.order_id = $1
      `, [orderId, TRACKING_UNAVAILABLE_MESSAGE]);
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

    const deliveryHistoryResult = await pool.query(`
      SELECT status, remarks, delivery_method, courier_name, tracking_number, tracking_link, proof_image_url, created_at
      FROM delivery_status_history
      WHERE order_id = $1
      ORDER BY created_at ASC
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
        deliveryHistory: deliveryHistoryResult.rows,
        // order_history now carries the same delivery/tracking/proof columns as orders
        // (migration 030), so archived orders no longer have to report delivery info as null.
        delivery: {
          delivery_status: order.delivery_status || 'Pending',
          delivery_method: order.delivery_method,
          delivery_type: order.delivery_type,
          courier_name: order.courier_name,
          tracking_number: order.tracking_number,
          tracking_link_available: order.tracking_link_available,
          tracking_link: order.tracking_link,
          tracking_unavailable_message: order.tracking_unavailable_message || TRACKING_UNAVAILABLE_MESSAGE,
          proof_image_url: order.proof_image_url,
          proof_uploaded_at: order.proof_uploaded_at,
          sent_at: order.sent_at,
          picked_up_at: order.picked_up_at,
          delivered_at: order.delivered_at,
          delivery_remarks: order.delivery_remarks
        },
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
          COALESCE(o.delivery_status, 'Pending') AS delivery_status,
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
          COALESCE(o.delivery_status, 'Pending') AS delivery_status,
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

    // If not found in active orders, check archived orders (order_history)
    if (result.rows.length === 0) {
      if (customerId) {
        result = await pool.query(`
          SELECT
            oh.order_id,
            oh.status,
            COALESCE(oh.delivery_status, 'Pending') AS delivery_status,
            oh.archived_at as order_placed_at,
            oh.archived_at as order_paid_at,
            oh.archived_at as order_shipped_at,
            oh.archived_at as order_received_at,
            oh.expected_delivery,
            oh.shipping_address,
            oh.total_cost
          FROM order_history oh
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
        result = await pool.query(`
          SELECT
            oh.order_id,
            oh.status,
            COALESCE(oh.delivery_status, 'Pending') AS delivery_status,
            oh.archived_at as order_placed_at,
            oh.archived_at as order_paid_at,
            oh.archived_at as order_shipped_at,
            oh.archived_at as order_received_at,
            oh.expected_delivery,
            oh.shipping_address,
            oh.total_cost
          FROM order_history oh
          WHERE oh.order_id = $1
        `, [orderId]);
      }
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
        deliveryStatus: order.delivery_status,
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

// PATCH /api/customer-orders/orders/:orderId/receive - Customer taps "Order Received", which
// completes the order (not an intermediate "Order Received" status — Completed is the actual
// terminal state, same as when staff close out an order). Only available once the order has
// actually shipped, and only for the order's own customer.
//
// Updates `orders` directly (rather than the update_order_status() DB function from migration 023,
// which assigns its varchar parameter straight into `status` — now an enum column — and 400s on
// any call), then archives to order_history the same way orders.js's PUT /:order_id route does for
// any other Completed/Cancelled transition, so this order doesn't end up in an inconsistent
// still-in-`orders`-but-Completed state that the rest of the app doesn't expect.
router.patch('/orders/:orderId/receive', async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;
    const customerId = req.user.customer_id;

    if (!customerId) {
      return res.status(403).json({ success: false, message: 'Only customers can confirm receipt of an order' });
    }

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE order_id = $1 AND customer_id = $2',
      [orderId, customerId]
    );

    if (orderResult.rows.length === 0) {
      // Not in the live table — check whether it's already been archived
      // (completed/cancelled) so the error is meaningful instead of a bare 404.
      // Some archived orders have a NULL customer_id (placed before customer_id
      // linking existed), so fall back to matching by email/name/phone against
      // this customer's own profile — same rule the tracking endpoint uses.
      const archivedResult = await client.query(
        `SELECT oh.status
         FROM order_history oh
         LEFT JOIN customer_details cd ON cd.customer_id = $2
         WHERE oh.order_id = $1 AND (
           oh.customer_id = $2
           OR (oh.customer_id IS NULL AND (
             oh.email_address = cd.email_address
             OR oh.name = cd.name
             OR oh.cellphone = cd.phone_number
           ))
         )`,
        [orderId, customerId]
      );
      if (archivedResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `This order is already ${archivedResult.rows[0].status.toLowerCase()} — there's nothing left to confirm.`
        });
      }
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const currentStatus = order.status;
    if (order.delivery_status !== 'Sent / Shipped') {
      return res.status(400).json({
        success: false,
        message: 'This order is not yet out for delivery, so it cannot be marked as received.'
      });
    }

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, updated_by, notes)
       VALUES ($1, $2, 'Completed', NULL, 'Marked received by customer')`,
      [orderId, currentStatus]
    );

    await client.query(
      `INSERT INTO delivery_status_history (order_id, status, remarks, delivery_method, delivery_mode_id, delivery_type, courier_name, tracking_number, tracking_link, proof_image_url, updated_by)
       VALUES ($1, 'Delivered', 'Marked received by customer', $2, $3, $4, $5, $6, $7, $8, NULL)`,
      [
        orderId,
        order.delivery_method || null,
        order.delivery_mode_id || null,
        order.delivery_type || null,
        order.courier_name || null,
        order.tracking_number || null,
        order.tracking_link || null,
        order.proof_image_url || null,
      ]
    );

    await client.query(
      `INSERT INTO order_history (
        order_id, customer_name, name, shipped_to, order_date, expected_delivery,
        status, shipping_address, total_cost, payment_type, payment_method,
        account_name, remarks, telephone, cellphone, email_address, archived_by,
        customer_id,
        delivery_status, delivery_method, delivery_mode_id, delivery_type, courier_name,
        tracking_number, tracking_link, tracking_link_available, tracking_unavailable_message,
        proof_image_url, proof_uploaded_by, proof_uploaded_at,
        sent_at, picked_up_at, delivered_at, delivery_remarks,
        delivery_updated_by, delivery_updated_at, order_quantity
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37)`,
      [
        order.order_id,
        order.name || 'Customer',
        order.name || 'Customer',
        order.shipped_to || order.name || 'Customer',
        order.order_date,
        order.expected_delivery,
        'Completed',
        order.shipping_address || 'Unknown Address',
        order.total_cost || 0,
        order.payment_type || 'Pending',
        order.payment_method || 'Pending',
        order.account_name || null,
        order.remarks || null,
        order.telephone || null,
        order.cellphone || null,
        order.email_address || null,
        null,
        order.customer_id || null,
        'Delivered',
        order.delivery_method || null,
        order.delivery_mode_id || null,
        order.delivery_type || null,
        order.courier_name || null,
        order.tracking_number || null,
        order.tracking_link || null,
        order.tracking_link_available,
        order.tracking_unavailable_message || null,
        order.proof_image_url || null,
        order.proof_uploaded_by || null,
        order.proof_uploaded_at || null,
        order.sent_at || null,
        order.picked_up_at || null,
        order.delivered_at || new Date(),
        order.delivery_remarks || null,
        order.delivery_updated_by || null,
        order.delivery_updated_at || null,
        order.order_quantity != null ? order.order_quantity : null,
      ]
    );

    const pricedResult = await client.query(
      'SELECT op.sku, op.quantity, i.unit_price FROM order_products op JOIN inventory_items i ON op.sku = i.sku WHERE op.order_id = $1',
      [orderId]
    );
    for (const row of pricedResult.rows) {
      await client.query(
        'INSERT INTO order_history_products (order_id, sku, quantity, unit_price) VALUES ($1,$2,$3,$4)',
        [orderId, row.sku, row.quantity, row.unit_price]
      );
    }

    await client.query('DELETE FROM order_products WHERE order_id = $1', [orderId]);
    await client.query('DELETE FROM orders WHERE order_id = $1', [orderId]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Order marked as completed', status: 'Completed' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error marking order as received:', error);
    res.status(500).json({ success: false, message: 'Failed to mark order as received' });
  } finally {
    client.release();
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
    // Fetch all active orders from orders table with products
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
        COALESCE(prod.products, '[]'::json) as products
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'sku', op.sku,
            'name', i.name,
            'quantity', op.quantity,
            'unit_price', i.unit_price,
            'image_data', encode(i.image_data, 'base64')
          )
        ) AS products
        FROM order_products op
        LEFT JOIN inventory_items i ON op.sku = i.sku
        WHERE op.order_id = o.order_id
      ) prod ON true
    `);

    // Fetch completed/cancelled orders from order_history table with products
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
        COALESCE(
          json_agg(
            json_build_object(
              'sku', ohp.sku,
              'name', i.name,
              'quantity', ohp.quantity,
              'unit_price', ohp.unit_price,
              'image_data', encode(i.image_data, 'base64')
            )
          ) FILTER (WHERE ohp.sku IS NOT NULL),
          '[]'::json
        ) as products
      FROM order_history oh
      LEFT JOIN order_history_products ohp ON oh.order_id = ohp.order_id
      LEFT JOIN inventory_items i ON ohp.sku = i.sku
      GROUP BY oh.order_id, oh.customer_name, oh.shipped_to, oh.order_date,
               oh.expected_delivery, oh.status, oh.shipping_address, oh.total_cost,
               oh.payment_type, oh.payment_method, oh.remarks, oh.telephone,
               oh.cellphone, oh.email_address, oh.archived_at, oh.customer_id
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
