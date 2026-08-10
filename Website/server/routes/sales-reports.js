const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/sales-reports/overview - Get sales overview data
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to today if no dates provided
    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];
    
    console.log('Fetching sales overview for period:', defaultStartDate, 'to', defaultEndDate);
    
    // Get sales overview data
    const salesOverview = await pool.query(`
      WITH period_orders AS (
        SELECT 
          o.order_id,
          o.name,
          o.total_cost,
          o.status,
          o.total_profit_estimation,
          SUM(op.quantity) as total_quantity
        FROM orders o
        LEFT JOIN order_products op ON o.order_id = op.order_id
        WHERE o.order_date BETWEEN $1 AND $2
        GROUP BY o.order_id, o.name, o.total_cost, o.status, o.total_profit_estimation
      )
      SELECT 
        COALESCE(SUM(CASE 
          WHEN status IN ('Order Received', 'Completed') 
          THEN total_cost 
          ELSE 0 
        END), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE 
          WHEN status IN ('Order Received', 'Completed') 
          THEN total_quantity 
          ELSE 0 
        END), 0) as total_units_sold,
        COALESCE(SUM(total_profit_estimation), 0) as total_profit,
        COUNT(DISTINCT name) as total_customers
      FROM period_orders
    `, [defaultStartDate, defaultEndDate]);

    // Get orders by status — grouped by the *actual* status strings used in the
    // orders table (Order Placed, Order Paid, To Be Packed, Order Shipped Out,
    // Ready for Delivery, Order Received, Completed, Cancelled), not a fixed
    // pending/delivered/completed bucket set that most of those never matched.
    const ordersByStatus = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM orders
      WHERE order_date BETWEEN $1 AND $2
      GROUP BY status
      ORDER BY count DESC
    `, [defaultStartDate, defaultEndDate]);

    // Payment status — sourced from invoices (the same table customer-orders.js
    // uses for remaining_balance/total_verified_payments), joined per order within
    // the period, so Outstanding Payments / Paid Amount reflect real invoice data.
    const paymentSummary = await pool.query(`
      SELECT
        COALESCE(SUM(o.total_cost), 0) as total_order_value,
        COALESCE(SUM(pay.amount_paid), 0) as paid_amount,
        COALESCE(SUM(GREATEST(o.total_cost - pay.amount_paid, 0)), 0) as outstanding_amount
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(i.amount_paid), 0) as amount_paid
        FROM invoices i
        WHERE i.order_id = o.order_id::text AND i.status <> 'CANCELLED'
      ) pay ON true
      WHERE o.order_date BETWEEN $1 AND $2
        AND o.status <> 'Cancelled'
    `, [defaultStartDate, defaultEndDate]);

    // Get previous period data for trend calculation
    const previousPeriodStart = new Date(defaultStartDate);
    const previousPeriodEnd = new Date(defaultEndDate);
    const periodLength = Math.ceil((new Date(defaultEndDate) - new Date(defaultStartDate)) / (1000 * 60 * 60 * 24));
    
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodLength - 1);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodLength - 1);

    const previousPeriodData = await pool.query(`
      WITH period_orders AS (
        SELECT 
          o.order_id,
          o.name,
          o.total_cost,
          o.status,
          o.total_profit_estimation,
          SUM(op.quantity) as total_quantity
        FROM orders o
        LEFT JOIN order_products op ON o.order_id = op.order_id
        WHERE o.order_date BETWEEN $1 AND $2
        GROUP BY o.order_id, o.name, o.total_cost, o.status, o.total_profit_estimation
      )
      SELECT 
        COALESCE(SUM(CASE 
          WHEN status IN ('Order Received', 'Completed') 
          THEN total_cost 
          ELSE 0 
        END), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_profit_estimation), 0) as total_profit
      FROM period_orders
    `, [previousPeriodStart.toISOString().split('T')[0], previousPeriodEnd.toISOString().split('T')[0]]);

    const currentData = salesOverview.rows[0];
    const previousData = previousPeriodData.rows[0];

    // Calculate trends
    const revenueTrend = calculateTrend(currentData.total_revenue, previousData.total_revenue);
    const ordersTrend = calculateTrend(currentData.total_orders, previousData.total_orders);
    const profitTrend = calculateTrend(currentData.total_profit, previousData.total_profit);

    // Calculate average order value
    const avgOrderValue = currentData.total_orders > 0 
      ? currentData.total_revenue / currentData.total_orders 
      : 0;

    // Orders by status — real status strings as counted, e.g.
    // { "Order Placed": 3, "Completed": 10, "Cancelled": 2 }
    const statusData = {};
    ordersByStatus.rows.forEach(row => {
      statusData[row.status] = parseInt(row.count, 10);
    });
    const completedCount = statusData['Completed'] || 0;
    const cancelledCount = statusData['Cancelled'] || 0;
    const pendingCount = Object.entries(statusData)
      .filter(([status]) => status !== 'Completed' && status !== 'Cancelled')
      .reduce((sum, [, count]) => sum + count, 0);

    const payments = paymentSummary.rows[0];

    const responseData = {
      totalRevenue: parseFloat(currentData.total_revenue) || 0,
      totalOrders: parseInt(currentData.total_orders) || 0,
      avgOrderValue: parseFloat(avgOrderValue) || 0,
      totalProfit: parseFloat(currentData.total_profit) || 0,
      totalUnitsSold: parseInt(currentData.total_units_sold) || 0,
      totalCustomers: parseInt(currentData.total_customers) || 0,
      completedOrders: completedCount,
      cancelledOrders: cancelledCount,
      pendingOrders: pendingCount,
      paidAmount: parseFloat(payments.paid_amount) || 0,
      outstandingAmount: parseFloat(payments.outstanding_amount) || 0,
      ordersByStatus: statusData,
      revenueTrend,
      ordersTrend,
      profitTrend,
      period: {
        startDate: defaultStartDate,
        endDate: defaultEndDate
      }
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching sales overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales overview',
      error: error.message
    });
  }
});

// GET /api/sales-reports/top-products - Get top selling products
router.get('/top-products', async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];
    
    const result = await pool.query(`
      WITH product_sales AS (
        SELECT 
          op.sku,
          SUM(op.quantity) as units_sold,
          SUM(op.quantity * COALESCE(op.unit_price, i.unit_price)) as sales_value,
          AVG(COALESCE(op.unit_price, i.unit_price)) as avg_price
        FROM order_products op
        JOIN orders o ON op.order_id = o.order_id
        JOIN inventory_items i ON op.sku = i.sku
        WHERE o.status IN ('Order Received', 'Completed')
        AND o.order_date BETWEEN $1 AND $2
        GROUP BY op.sku
      )
      SELECT 
        i.sku,
        i.name,
        i.category,
        i.unit_price,
        COALESCE(ps.units_sold, 0) as units_sold,
        COALESCE(ps.sales_value, 0) as sales_value,
        COALESCE(ps.avg_price, i.unit_price) as avg_price
      FROM inventory_items i
      LEFT JOIN product_sales ps ON i.sku = ps.sku
      WHERE COALESCE(ps.units_sold, 0) > 0
      ORDER BY units_sold DESC, sales_value DESC
      LIMIT $3
    `, [defaultStartDate, defaultEndDate, parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top products',
      error: error.message
    });
  }
});

// GET /api/sales-reports/customer-analysis - Get customer analysis
router.get('/customer-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];
    
    // Get customer analysis data
    const customerData = await pool.query(`
      WITH customer_orders AS (
        SELECT 
          o.name,
          o.email_address,
          o.telephone,
          COUNT(*) as order_count,
          SUM(o.total_cost) as total_spent,
          AVG(o.total_cost) as avg_order_value,
          MAX(o.order_date) as last_order_date,
          MIN(o.order_date) as first_order_date
        FROM orders o
        WHERE o.order_date BETWEEN $1 AND $2
        GROUP BY o.name, o.email_address, o.telephone
      )
      SELECT 
        name,
        email_address,
        telephone,
        order_count,
        total_spent,
        avg_order_value,
        last_order_date,
        first_order_date,
        CASE 
          WHEN order_count = 1 THEN 'New'
          WHEN order_count BETWEEN 2 AND 5 THEN 'Regular'
          ELSE 'VIP'
        END as customer_type
      FROM customer_orders
      ORDER BY total_spent DESC
    `, [defaultStartDate, defaultEndDate]);

    // Get summary statistics
    const summary = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.name) as total_customers,
        COUNT(*) as total_orders,
        AVG(o.total_cost) as avg_order_value,
        SUM(o.total_cost) as total_revenue
      FROM orders o
      WHERE o.order_date BETWEEN $1 AND $2
    `, [defaultStartDate, defaultEndDate]);

    res.json({
      success: true,
      data: {
        customers: customerData.rows,
        summary: summary.rows[0]
      }
    });

  } catch (error) {
    console.error('Error fetching customer analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer analysis',
      error: error.message
    });
  }
});

// GET /api/sales-reports/trends - Get sales trends over time
router.get('/trends', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const today = new Date();
    const defaultStartDate = startDate || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];
    
    let dateFormat, interval;
    switch (groupBy) {
      case 'hour':
        dateFormat = "DATE_TRUNC('hour', o.order_date)";
        interval = "1 hour";
        break;
      case 'day':
        dateFormat = "DATE(o.order_date)";
        interval = "1 day";
        break;
      case 'week':
        dateFormat = "DATE_TRUNC('week', o.order_date)";
        interval = "1 week";
        break;
      case 'month':
        dateFormat = "DATE_TRUNC('month', o.order_date)";
        interval = "1 month";
        break;
      default:
        dateFormat = "DATE(o.order_date)";
        interval = "1 day";
    }
    
    const result = await pool.query(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as order_count,
        SUM(CASE WHEN o.status IN ('Order Received', 'Completed') THEN o.total_cost ELSE 0 END) as revenue,
        SUM(o.total_profit_estimation) as profit,
        COUNT(DISTINCT o.name) as unique_customers
      FROM orders o
      WHERE o.order_date BETWEEN $1 AND $2
      GROUP BY ${dateFormat}
      ORDER BY period ASC
    `, [defaultStartDate, defaultEndDate]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching sales trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
      error: error.message
    });
  }
});

// GET /api/sales-reports/recent - Recent orders for the Sales Overview "Recent Sales" table
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        o.order_id,
        o.name as customer_name,
        o.order_date,
        o.total_cost,
        o.status,
        COALESCE(pay.amount_paid, 0) as amount_paid,
        CASE
          WHEN o.status = 'Cancelled' THEN 'N/A'
          WHEN COALESCE(pay.amount_paid, 0) >= o.total_cost AND o.total_cost > 0 THEN 'Fully Paid'
          WHEN COALESCE(pay.amount_paid, 0) > 0 THEN 'Partially Paid'
          ELSE 'Unpaid'
        END as payment_status
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(i.amount_paid), 0) as amount_paid
        FROM invoices i
        WHERE i.order_id = o.order_id::text AND i.status <> 'CANCELLED'
      ) pay ON true
      ORDER BY o.order_date DESC
      LIMIT $1
    `, [parseInt(limit, 10)]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent sales',
      error: error.message
    });
  }
});

// POST /api/sales-reports/test-data/insert - Realistic temporary sales test data
//
// Spreads orders across the last 60 days, several statuses, and several
// customers/products, so the Sales Overview trend chart, orders-by-status
// breakdown, top-products, and customer-analysis sections all have
// meaningful variation to render instead of flat/empty data. Uses the same
// TEST- prefixed inventory items the Inventory Report test-data seeds (or
// creates them here if they don't exist yet), so it can be run independently.
router.post('/test-data/insert', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    const testProducts = [
      { sku: 'TEST-GFT-001', name: 'Premium Gift Box', category: 'Gift Boxes', quantity: 120, unit_price: 350.00, reorder_level: 30 },
      { sku: 'TEST-MUG-001', name: 'Personalized Mug', category: 'Personalized Gifts', quantity: 45, unit_price: 275.00, reorder_level: 15 },
      { sku: 'TEST-FLR-001', name: 'Floral Gift Set', category: 'Gift Sets', quantity: 15, unit_price: 620.00, reorder_level: 10 },
      { sku: 'TEST-WED-001', name: 'Wedding Invitation Set', category: 'Wedding', quantity: 72, unit_price: 45.00, reorder_level: 50 },
      { sku: 'TEST-COR-001', name: 'Corporate Gift Bundle', category: 'Corporate', quantity: 22, unit_price: 950.00, reorder_level: 8 },
      { sku: 'TEST-TOT-001', name: 'Custom Tote Bag', category: 'Personalized Gifts', quantity: 60, unit_price: 220.00, reorder_level: 15 }
    ];
    for (const p of testProducts) {
      await client.query(`
        INSERT INTO inventory_items (sku, name, description, quantity, unit_price, category, reorder_level)
        VALUES ($1, $2, 'Temporary test data — safe to delete', $3, $4, $5, $6)
        ON CONFLICT (sku) DO NOTHING
      `, [p.sku, p.name, p.quantity, p.unit_price, p.category, p.reorder_level]);
    }

    // Customers spread across "New" / "Regular" / "VIP" segments (by order
    // count), so customer-analysis has more than one bucket to show.
    const testOrders = [
      { order_id: 'TEST-SALE-001', name: 'Test Customer Anna', status: 'Completed', total_cost: 950.00, days_ago: 2, sku: 'TEST-GFT-001', qty: 2 },
      { order_id: 'TEST-SALE-002', name: 'Test Customer Anna', status: 'Completed', total_cost: 620.00, days_ago: 9, sku: 'TEST-FLR-001', qty: 1 },
      { order_id: 'TEST-SALE-003', name: 'Test Customer Anna', status: 'Completed', total_cost: 275.00, days_ago: 20, sku: 'TEST-MUG-001', qty: 1 },
      { order_id: 'TEST-SALE-004', name: 'Test Customer Ben', status: 'Completed', total_cost: 1900.00, days_ago: 4, sku: 'TEST-COR-001', qty: 2 },
      { order_id: 'TEST-SALE-005', name: 'Test Customer Ben', status: 'Order Received', total_cost: 440.00, days_ago: 15, sku: 'TEST-TOT-001', qty: 2 },
      { order_id: 'TEST-SALE-006', name: 'Test Customer Carla', status: 'Completed', total_cost: 350.00, days_ago: 1, sku: 'TEST-GFT-001', qty: 1 },
      { order_id: 'TEST-SALE-007', name: 'Test Customer Diego', status: 'To Be Packed', total_cost: 180.00, days_ago: 0, sku: 'TEST-WED-001', qty: 4 },
      { order_id: 'TEST-SALE-013', name: 'Test Customer Hana', status: 'Completed', total_cost: 350.00, days_ago: 0, sku: 'TEST-GFT-001', qty: 1 },
      { order_id: 'TEST-SALE-008', name: 'Test Customer Diego', status: 'Order Placed', total_cost: 220.00, days_ago: 6, sku: 'TEST-TOT-001', qty: 1 },
      { order_id: 'TEST-SALE-009', name: 'Test Customer Elena', status: 'Cancelled', total_cost: 620.00, days_ago: 30, sku: 'TEST-FLR-001', qty: 1 },
      { order_id: 'TEST-SALE-010', name: 'Test Customer Elena', status: 'Completed', total_cost: 700.00, days_ago: 45, sku: 'TEST-GFT-001', qty: 2 },
      { order_id: 'TEST-SALE-011', name: 'Test Customer Fabio', status: 'Completed', total_cost: 950.00, days_ago: 55, sku: 'TEST-COR-001', qty: 1 },
      { order_id: 'TEST-SALE-012', name: 'Test Customer Gia', status: 'Order Shipped Out', total_cost: 275.00, days_ago: 3, sku: 'TEST-MUG-001', qty: 1 }
    ];

    for (const o of testOrders) {
      const orderDate = daysAgo(o.days_ago);
      await client.query(`
        INSERT INTO orders (order_id, name, shipped_to, order_date, status, shipping_address, total_cost, payment_type, payment_method, telephone, cellphone, email_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Cash', 'Cash', '123-456-0001', '123-456-0001', 'testsales@example.com')
        ON CONFLICT (order_id) DO NOTHING
      `, [o.order_id, o.name, o.name, orderDate, o.status, o.name, o.total_cost]);

      const existing = await client.query(
        `SELECT 1 FROM order_products WHERE order_id = $1 AND sku = $2`,
        [o.order_id, o.sku]
      );
      if (existing.rows.length === 0) {
        const product = testProducts.find(p => p.sku === o.sku);
        await client.query(`
          INSERT INTO order_products (order_id, sku, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `, [o.order_id, o.sku, o.qty, product.unit_price]);
      }

      if (o.status === 'Completed' || o.status === 'Order Received') {
        await client.query(`
          INSERT INTO invoices (invoice_number, order_id, invoice_type, status, subtotal, total_order_amount, amount_due, amount_paid)
          VALUES ($1, $2, 'DOWN_PAYMENT', 'PAID', $3, $3, 0, $3)
          ON CONFLICT (invoice_number) DO NOTHING
        `, [`TEST-SALE-INV-${o.order_id}`, o.order_id, o.total_cost]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Sales test data inserted successfully',
      data: {
        orders_inserted: testOrders.length,
        products_used: testProducts.length
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting sales test data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to insert sales test data',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// POST /api/sales-reports/test-data/clear - Remove TEST-SALE-% rows
router.post('/test-data/clear', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM invoices WHERE order_id LIKE 'TEST-SALE-%'`);
    await client.query(`DELETE FROM order_products WHERE order_id LIKE 'TEST-SALE-%'`);
    await client.query(`DELETE FROM orders WHERE order_id LIKE 'TEST-SALE-%'`);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Sales test data cleared successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing sales test data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear sales test data',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Helper function to calculate trend
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return 'stable';
  const change = ((current - previous) / previous) * 100;
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

module.exports = router;
