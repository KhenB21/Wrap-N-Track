const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireTestDataAccess = require('../middleware/requireTestDataAccess');
const { TARGET_PROFIT_MARGIN, paidSalesCtes, getPaidSalesTotals } = require('../services/salesMetrics');

// Revenue/profit on every endpoint here come from PAID invoices by payment date —
// see services/salesMetrics.js. Order counts and statuses still use the order date.

// GET /api/sales-reports/overview - Get sales overview data
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to today if no dates provided
    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];

    console.log('Fetching sales overview for period:', defaultStartDate, 'to', defaultEndDate);

    // Orders placed in the period (counts, customers, units) — not used for revenue.
    const salesOverview = await pool.query(`
      WITH period_orders AS (
        SELECT
          o.order_id,
          o.name,
          o.customer_id,
          o.status,
          SUM(op.quantity) as total_quantity
        FROM all_orders o
        LEFT JOIN all_order_products op ON o.order_id = op.order_id
        WHERE o.order_date::date BETWEEN $1 AND $2
        GROUP BY o.order_id, o.name, o.customer_id, o.status
      )
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE
          WHEN status IN ('Order Received', 'Completed')
          THEN total_quantity
          ELSE 0
        END), 0) as total_units_sold,
        COUNT(DISTINCT COALESCE(customer_id::text, lower(trim(name)))) as total_customers
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
      FROM all_orders
      WHERE order_date::date BETWEEN $1 AND $2
      GROUP BY status
      ORDER BY count DESC
    `, [defaultStartDate, defaultEndDate]);

    // Balance still owed on (non-cancelled) orders placed in the period.
    const paymentSummary = await pool.query(`
      SELECT
        COALESCE(SUM(GREATEST(o.total_cost - pay.amount_paid, 0)), 0) as outstanding_amount
      FROM all_orders o
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(i.amount_paid), 0) as amount_paid
        FROM invoices i
        WHERE i.order_id = o.order_id::text AND i.status <> 'CANCELLED'
      ) pay ON true
      WHERE o.order_date::date BETWEEN $1 AND $2
        AND o.status <> 'Cancelled'
    `, [defaultStartDate, defaultEndDate]);

    // Get previous period data for trend calculation
    const previousPeriodStart = new Date(defaultStartDate);
    const previousPeriodEnd = new Date(defaultEndDate);
    const periodLength = Math.ceil((new Date(defaultEndDate) - new Date(defaultStartDate)) / (1000 * 60 * 60 * 24));

    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodLength - 1);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodLength - 1);
    const previousStart = previousPeriodStart.toISOString().split('T')[0];
    const previousEnd = previousPeriodEnd.toISOString().split('T')[0];

    const previousOrders = await pool.query(`
      SELECT COUNT(*) as total_orders
      FROM all_orders o
      WHERE o.order_date::date BETWEEN $1 AND $2
    `, [previousStart, previousEnd]);

    // Money received in this period and the one before it.
    const [paid, previousPaid] = await Promise.all([
      getPaidSalesTotals(pool, defaultStartDate, defaultEndDate),
      getPaidSalesTotals(pool, previousStart, previousEnd),
    ]);

    const currentData = salesOverview.rows[0];
    const previousData = previousOrders.rows[0];

    // Calculate trends
    const revenueTrend = calculateTrend(paid.revenue, previousPaid.revenue);
    const ordersTrend = calculateTrend(Number(currentData.total_orders), Number(previousData.total_orders));
    const profitTrend = calculateTrend(paid.profit, previousPaid.profit);

    // Average received per order that paid something in the period
    const avgOrderValue = paid.paidOrders > 0 ? paid.revenue / paid.paidOrders : 0;

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
      revenueBasis: 'paid_invoices',
      totalRevenue: paid.revenue,
      totalOrders: parseInt(currentData.total_orders) || 0,
      paidOrders: paid.paidOrders,
      avgOrderValue: parseFloat(avgOrderValue) || 0,
      totalProfit: paid.profit,
      profitMarginPct: paid.profitMarginPct,
      actualMarginPct: paid.actualMarginPct,
      targetMarginPct: Math.round(TARGET_PROFIT_MARGIN * 100),
      // Orders whose profit used the target margin because a product cost is missing.
      estimatedProfitOrders: paid.estimatedOrders,
      totalUnitsSold: parseInt(currentData.total_units_sold) || 0,
      totalCustomers: parseInt(currentData.total_customers) || 0,
      completedOrders: completedCount,
      cancelledOrders: cancelledCount,
      pendingOrders: pendingCount,
      paidAmount: paid.revenue,
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
//
// Each payment is shared across its order's products in proportion to their value
// (qty × unit_price). Units count once per order, when its down payment is paid.
router.get('/top-products', async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];

    const result = await pool.query(`
      WITH ${paidSalesCtes()},
      lines AS (
        SELECT
          op.order_id::text AS order_id,
          op.sku,
          op.quantity,
          COALESCE(op.unit_price, i.unit_price) AS unit_price
        FROM all_order_products op
        JOIN inventory_items i ON op.sku = i.sku
        WHERE op.order_id::text IN (SELECT order_id FROM payments)
      ),
      order_values AS (
        SELECT order_id, SUM(quantity * unit_price) AS goods_value
        FROM lines
        GROUP BY order_id
      ),
      product_sales AS (
        SELECT
          l.sku,
          SUM(p.amount * (l.quantity * l.unit_price) / NULLIF(v.goods_value, 0)) AS sales_value,
          SUM(p.amount * p.margin_rate * (l.quantity * l.unit_price) / NULLIF(v.goods_value, 0)) AS gross_margin,
          SUM(CASE WHEN p.invoice_type = 'DOWN_PAYMENT' THEN l.quantity ELSE 0 END) AS units_sold
        FROM priced_payments p
        JOIN lines l ON l.order_id = p.order_id
        JOIN order_values v ON v.order_id = p.order_id
        GROUP BY l.sku
      )
      SELECT
        i.sku,
        i.name,
        i.category,
        i.unit_price,
        COALESCE(ps.units_sold, 0) as units_sold,
        ROUND(COALESCE(ps.sales_value, 0), 2) as sales_value,
        i.unit_price as avg_price,
        ROUND(ps.gross_margin, 2) as gross_margin
      FROM product_sales ps
      JOIN inventory_items i ON i.sku = ps.sku
      WHERE COALESCE(ps.sales_value, 0) > 0
      ORDER BY sales_value DESC, units_sold DESC
      LIMIT $4
    `, [defaultStartDate, defaultEndDate, TARGET_PROFIT_MARGIN, parseInt(limit, 10) || 10]);

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
// Customers ranked by what they actually paid in the period.
router.get('/customer-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];

    // Get customer analysis data
    const customerData = await pool.query(`
      WITH ${paidSalesCtes()},
      customer_orders AS (
        SELECT
          o.name,
          o.email_address,
          o.telephone,
          COUNT(DISTINCT p.order_id) as order_count,
          SUM(p.amount) as total_spent,
          MAX(o.order_date) as last_order_date,
          MIN(o.order_date) as first_order_date
        FROM priced_payments p
        JOIN all_orders o ON o.order_id::text = p.order_id
        GROUP BY o.name, o.email_address, o.telephone
      )
      SELECT
        name,
        email_address,
        telephone,
        order_count,
        ROUND(total_spent, 2) as total_spent,
        ROUND(total_spent / NULLIF(order_count, 0), 2) as avg_order_value,
        last_order_date,
        first_order_date,
        CASE
          WHEN order_count = 1 THEN 'New'
          WHEN order_count BETWEEN 2 AND 5 THEN 'Regular'
          ELSE 'VIP'
        END as customer_type
      FROM customer_orders
      ORDER BY total_spent DESC
    `, [defaultStartDate, defaultEndDate, TARGET_PROFIT_MARGIN]);

    // Get summary statistics
    const summary = await pool.query(`
      WITH ${paidSalesCtes()}
      SELECT
        COUNT(DISTINCT COALESCE(o.customer_id::text, lower(trim(o.name)))) as total_customers,
        COUNT(DISTINCT p.order_id) as total_orders,
        ROUND(COALESCE(SUM(p.amount), 0) / NULLIF(COUNT(DISTINCT p.order_id), 0), 2) as avg_order_value,
        ROUND(COALESCE(SUM(p.amount), 0), 2) as total_revenue
      FROM priced_payments p
      JOIN all_orders o ON o.order_id::text = p.order_id
    `, [defaultStartDate, defaultEndDate, TARGET_PROFIT_MARGIN]);

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
// revenue/profit per bucket come from payments; order_count is orders placed.
router.get('/trends', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const today = new Date();
    const defaultStartDate = startDate || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];

    // Both sides bucket plain (time-zone-free) values the same way so rows line up.
    const bucket = (column) => {
      switch (groupBy) {
        case 'hour':
          return `DATE_TRUNC('hour', ${column})`;
        case 'week':
          return `DATE_TRUNC('week', ${column})::date`;
        case 'month':
          return `DATE_TRUNC('month', ${column})::date`;
        default:
          return `(${column})::date`;
      }
    };

    const [ordersResult, paymentsResult] = await Promise.all([
      pool.query(`
        SELECT
          ${bucket('o.order_date::timestamp')} as period,
          COUNT(*) as order_count,
          COUNT(DISTINCT COALESCE(o.customer_id::text, lower(trim(o.name)))) as unique_customers
        FROM all_orders o
        WHERE o.order_date::date BETWEEN $1 AND $2
        GROUP BY 1
      `, [defaultStartDate, defaultEndDate]),
      pool.query(`
        WITH ${paidSalesCtes()}
        SELECT
          ${bucket('paid_local')} as period,
          ROUND(SUM(amount), 2) as revenue,
          ROUND(SUM(amount * margin_rate), 2) as profit,
          COUNT(DISTINCT order_id) as paid_orders
        FROM priced_payments
        GROUP BY 1
      `, [defaultStartDate, defaultEndDate, TARGET_PROFIT_MARGIN]),
    ]);

    const keyOf = (value) => (value instanceof Date ? value.toISOString() : String(value));
    const rows = new Map();
    const rowFor = (period) => {
      const key = keyOf(period);
      if (!rows.has(key)) {
        rows.set(key, { period, order_count: 0, revenue: 0, profit: 0, paid_orders: 0, unique_customers: 0 });
      }
      return rows.get(key);
    };

    ordersResult.rows.forEach((r) => {
      const row = rowFor(r.period);
      row.order_count = Number(r.order_count) || 0;
      row.unique_customers = Number(r.unique_customers) || 0;
    });
    paymentsResult.rows.forEach((r) => {
      const row = rowFor(r.period);
      row.revenue = Number(r.revenue) || 0;
      row.profit = Number(r.profit) || 0;
      row.paid_orders = Number(r.paid_orders) || 0;
    });

    const data = Array.from(rows.values()).sort((a, b) => new Date(a.period) - new Date(b.period));

    res.json({
      success: true,
      data
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
      FROM all_orders o
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
router.post('/test-data/insert', requireTestDataAccess(), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // The invoices table is normally created lazily by invoices.js's own
    // router middleware, which never runs for this endpoint — so guard here
    // too in case no /api/invoices/* request has hit this DB yet.
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id BIGSERIAL PRIMARY KEY,
        invoice_number VARCHAR(40) UNIQUE NOT NULL,
        order_id VARCHAR(50) NOT NULL,
        invoice_type VARCHAR(30) NOT NULL CHECK (invoice_type IN ('DOWN_PAYMENT', 'REMAINING_BALANCE')),
        status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('DRAFT', 'ISSUED', 'UNPAID', 'PAID', 'CANCELLED')),
        subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Columns the sales report reads (services/salesMetrics.js).
    await client.query(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
    `);

    // Some deployed databases have an `orders` table whose order_id column
    // was never given a primary key / unique constraint, which makes any
    // `ON CONFLICT (order_id)` insert below fail with 42P10. Add it here if
    // missing so this endpoint is resilient to that drift.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'orders'
            AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
            AND kcu.column_name = 'order_id'
        ) THEN
          ALTER TABLE orders ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);
        END IF;
      END $$;
    `);

    const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    // cost_price is set so profit uses real costs; a couple sit below the 70% target.
    const testProducts = [
      { sku: 'TEST-GFT-001', name: 'Premium Gift Box', category: 'Gift Boxes', quantity: 120, unit_price: 350.00, cost_price: 105.00, reorder_level: 30 },
      { sku: 'TEST-MUG-001', name: 'Personalized Mug', category: 'Personalized Gifts', quantity: 45, unit_price: 275.00, cost_price: 82.50, reorder_level: 15 },
      { sku: 'TEST-FLR-001', name: 'Floral Gift Set', category: 'Gift Sets', quantity: 15, unit_price: 620.00, cost_price: 310.00, reorder_level: 10 },
      { sku: 'TEST-WED-001', name: 'Wedding Invitation Set', category: 'Wedding', quantity: 72, unit_price: 45.00, cost_price: 13.50, reorder_level: 50 },
      { sku: 'TEST-COR-001', name: 'Corporate Gift Bundle', category: 'Corporate', quantity: 22, unit_price: 950.00, cost_price: 380.00, reorder_level: 8 },
      { sku: 'TEST-TOT-001', name: 'Custom Tote Bag', category: 'Personalized Gifts', quantity: 60, unit_price: 220.00, cost_price: 66.00, reorder_level: 15 }
    ];
    for (const p of testProducts) {
      await client.query(`
        INSERT INTO inventory_items (sku, name, description, quantity, unit_price, cost_price, category, reorder_level)
        VALUES ($1, $2, 'Temporary test data — safe to delete', $3, $4, $5, $6, $7)
        ON CONFLICT (sku) DO NOTHING
      `, [p.sku, p.name, p.quantity, p.unit_price, p.cost_price, p.category, p.reorder_level]);
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
          INSERT INTO order_products (order_id, sku, quantity, unit_price, cost_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [o.order_id, o.sku, o.qty, product.unit_price, product.cost_price]);
      }

      // Revenue is counted by payment date, so give each paid invoice one.
      if (o.status === 'Completed' || o.status === 'Order Received') {
        await client.query(`
          INSERT INTO invoices (invoice_number, order_id, invoice_type, status, subtotal, total_order_amount, amount_due, amount_paid, paid_at)
          VALUES ($1, $2, 'DOWN_PAYMENT', 'PAID', $3, $3, 0, $3, $4)
          ON CONFLICT (invoice_number) DO NOTHING
        `, [`TEST-SALE-INV-${o.order_id}`, o.order_id, o.total_cost, orderDate]);
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
router.post('/test-data/clear', requireTestDataAccess(), async (req, res) => {
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
