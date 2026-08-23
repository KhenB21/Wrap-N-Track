
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireTestDataAccess = require('../middleware/requireTestDataAccess');
const { getReplenishmentSuggestions } = require('../services/replenishment');

// GET /api/inventory-reports/summary - Get inventory summary data
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_skus,
        SUM(quantity * unit_price) as total_value,
        AVG(quantity * unit_price) as avg_item_value,
        COUNT(CASE WHEN quantity <= COALESCE(reorder_level, CEIL(quantity * 0.2)) THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN expiration IS NOT NULL AND expiration <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_count
      FROM inventory_items 
      WHERE is_active = true
    `);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch inventory summary' 
    });
  }
});

// GET /api/inventory-reports/category-breakdown - Get category breakdown
router.get('/category-breakdown', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(category, 'Uncategorized') as category,
        COUNT(*) as item_count,
        SUM(quantity * unit_price) as total_value,
        AVG(quantity * unit_price) as avg_value_per_item,
        SUM(quantity) as total_quantity
      FROM inventory_items 
      WHERE is_active = true
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch category breakdown' 
    });
  }
});

// GET /api/inventory-reports/low-stock - Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sku,
        name,
        category,
        quantity,
        unit_price,
        reorder_level,
        COALESCE(reorder_level, CEIL(quantity * 0.2)) as calculated_reorder_level,
        (quantity * unit_price) as total_value,
        last_updated
      FROM inventory_items 
      WHERE is_active = true 
        AND quantity <= COALESCE(reorder_level, CEIL(quantity * 0.2))
      ORDER BY (quantity - COALESCE(reorder_level, CEIL(quantity * 0.2))) ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch low stock items' 
    });
  }
});

// GET /api/inventory-reports/expiring - Get expiring items
router.get('/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        sku,
        name,
        category,
        quantity,
        unit_price,
        expiration,
        (quantity * unit_price) as total_value,
        (expiration - CURRENT_DATE) as days_until_expiration
      FROM inventory_items
      WHERE is_active = true
        AND expiration IS NOT NULL
        AND expiration <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
      ORDER BY expiration ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch expiring items' 
    });
  }
});

// GET /api/inventory-reports/movement - Get inventory movement data
router.get('/movement', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const hasRange = Boolean(startDate && endDate);

    const result = await pool.query(`
      SELECT
        i.sku,
        i.name,
        i.category,
        i.quantity as current_stock,
        COALESCE(SUM(CASE
          WHEN o.status NOT IN ('Order Received', 'Completed', 'Cancelled')
          THEN op.quantity
          ELSE 0
        END), 0) as ordered_quantity,
        COALESCE(SUM(CASE
          WHEN o.status IN ('Order Received', 'Completed')
          THEN op.quantity
          ELSE 0
        END), 0) as delivered_quantity,
        COALESCE(SUM(CASE
          WHEN o.status IN ('Order Received', 'Completed')
          THEN op.quantity * COALESCE(op.unit_price, i.unit_price)
          ELSE 0
        END), 0) as sales_value
      FROM inventory_items i
      LEFT JOIN all_order_products op ON i.sku = op.sku
      LEFT JOIN all_orders o ON op.order_id = o.order_id
        AND ($1::date IS NULL OR o.order_date BETWEEN $1::date AND $2::date)
      WHERE i.is_active = true
      GROUP BY i.sku, i.name, i.category, i.quantity
      ORDER BY sales_value DESC
    `, [hasRange ? startDate : null, hasRange ? endDate : null]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching inventory movement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory movement'
    });
  }
});

// GET /api/inventory-reports/abc-analysis - Get ABC analysis
router.get('/abc-analysis', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH item_values AS (
        SELECT 
          sku,
          name,
          category,
          quantity,
          unit_price,
          (quantity * unit_price) as total_value,
          ROW_NUMBER() OVER (ORDER BY (quantity * unit_price) DESC) as rank,
          COUNT(*) OVER () as total_items
        FROM inventory_items 
        WHERE is_active = true
      ),
      cumulative_values AS (
        SELECT 
          *,
          SUM(total_value) OVER (ORDER BY total_value DESC) as cumulative_value,
          (SUM(total_value) OVER (ORDER BY total_value DESC)) / (SUM(total_value) OVER ()) as cumulative_percentage
        FROM item_values
      )
      SELECT 
        sku,
        name,
        category,
        quantity,
        unit_price,
        total_value,
        rank,
        cumulative_percentage,
        CASE 
          WHEN cumulative_percentage <= 0.8 THEN 'A'
          WHEN cumulative_percentage <= 0.95 THEN 'B'
          ELSE 'C'
        END as abc_category
      FROM cumulative_values
      ORDER BY total_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching ABC analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ABC analysis' 
    });
  }
});

// GET /api/inventory-reports/turnover - Get inventory turnover analysis
router.get('/turnover', async (req, res) => {
  try {
    const months = Math.max(1, parseInt(req.query.months, 10) || 12);

    const result = await pool.query(`
      WITH monthly_sales AS (
        SELECT
          DATE_TRUNC('month', o.order_date) as month,
          SUM(op.quantity * COALESCE(op.unit_price, i.unit_price)) as monthly_sales
        FROM all_orders o
        JOIN all_order_products op ON o.order_id = op.order_id
        JOIN inventory_items i ON op.sku = i.sku
        WHERE o.status IN ('Order Received', 'Completed')
          AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 month')
        GROUP BY DATE_TRUNC('month', o.order_date)
      ),
      avg_inventory AS (
        SELECT AVG(quantity * unit_price) as avg_inventory_value
        FROM inventory_items
        WHERE is_active = true
      )
      SELECT
        ms.month,
        ms.monthly_sales,
        ai.avg_inventory_value,
        CASE
          WHEN ai.avg_inventory_value > 0
          THEN ms.monthly_sales / ai.avg_inventory_value
          ELSE 0
        END as turnover_ratio
      FROM monthly_sales ms
      CROSS JOIN avg_inventory ai
      ORDER BY ms.month DESC
    `, [months]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching turnover analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch turnover analysis'
    });
  }
});

// GET /api/inventory-reports/supplier-performance - Get supplier performance
router.get('/supplier-performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.supplier_id,
        s.name as supplier_name,
        COUNT(i.sku) as item_count,
        SUM(i.quantity * i.unit_price) as total_value,
        AVG(i.quantity * i.unit_price) as avg_item_value,
        AVG(i.lead_time_days) as avg_lead_time,
        COUNT(CASE WHEN i.quantity <= COALESCE(i.reorder_level, CEIL(i.quantity * 0.2)) THEN 1 END) as low_stock_items
      FROM suppliers s
      LEFT JOIN inventory_items i ON s.supplier_id = i.supplier_id AND i.is_active = true
      GROUP BY s.supplier_id, s.name
      HAVING COUNT(i.sku) > 0
      ORDER BY total_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching supplier performance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch supplier performance' 
    });
  }
});

// GET /api/inventory-reports/movement-analysis - Get fast/slow moving items analysis
// Movement categories are classified on units-per-DAY, not absolute units sold.
// The previous thresholds (>50 = FAST_MOVING) were not normalised by the lookback
// window, so "fast-moving" silently meant something different at days=30 than at
// days=90. These constants reproduce the original intent at the 90-day default.
const SLOW_MOVING_MAX_PER_DAY = 10.0 / 90.0;      // <= 10 units per 90 days
const MODERATE_MOVING_MAX_PER_DAY = 50.0 / 90.0;  // <= 50 units per 90 days

router.get('/movement-analysis', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 90);

    const result = await pool.query(`
      WITH sales_analysis AS (
        SELECT
          i.sku,
          i.name,
          i.category,
          i.quantity as current_stock,
          i.unit_price,
          i.reorder_level,
          COALESCE(SUM(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            THEN op.quantity
            ELSE 0
          END), 0) as sold_quantity,
          COALESCE(SUM(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            THEN op.quantity * COALESCE(op.unit_price, i.unit_price)
            ELSE 0
          END), 0) as sales_value,
          COUNT(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            THEN 1
          END) as sales_frequency
        FROM inventory_items i
        LEFT JOIN all_order_products op ON i.sku = op.sku
        LEFT JOIN all_orders o ON op.order_id = o.order_id
        WHERE i.is_active = true
        GROUP BY i.sku, i.name, i.category, i.quantity, i.unit_price, i.reorder_level
      ),
      velocity AS (
        SELECT
          *,
          (sold_quantity::numeric / $1::numeric) as daily_velocity
        FROM sales_analysis
      ),
      movement_classification AS (
        SELECT
          *,
          CASE
            WHEN sold_quantity = 0 THEN 'DEAD_STOCK'
            WHEN daily_velocity <= ${SLOW_MOVING_MAX_PER_DAY} THEN 'SLOW_MOVING'
            WHEN daily_velocity <= ${MODERATE_MOVING_MAX_PER_DAY} THEN 'MODERATE_MOVING'
            ELSE 'FAST_MOVING'
          END as movement_category,
          -- share of stock consumed over the window
          (sold_quantity::numeric / NULLIF(current_stock, 0)) as velocity_ratio,
          -- true months of cover at the observed rate, capped so the UI can render it
          CASE
            WHEN daily_velocity > 0
              THEN LEAST(999, current_stock::numeric / (daily_velocity * 30))
            ELSE 999
          END as months_of_stock,
          CASE
            WHEN daily_velocity > 0 THEN current_stock::numeric / daily_velocity
            ELSE NULL
          END as days_of_supply
        FROM velocity
      )
      SELECT
        sku,
        name,
        category,
        current_stock,
        unit_price,
        reorder_level,
        sold_quantity,
        sales_value,
        sales_frequency,
        movement_category,
        ROUND(daily_velocity::numeric, 3) as daily_velocity,
        ROUND(velocity_ratio::numeric, 2) as velocity_ratio,
        ROUND(months_of_stock::numeric, 1) as months_of_stock,
        ROUND(days_of_supply::numeric, 1) as days_of_supply,
        (current_stock * unit_price) as inventory_value
      FROM movement_classification
      ORDER BY
        CASE movement_category
          WHEN 'FAST_MOVING' THEN 1
          WHEN 'MODERATE_MOVING' THEN 2
          WHEN 'SLOW_MOVING' THEN 3
          WHEN 'DEAD_STOCK' THEN 4
        END,
        sales_value DESC
    `, [days]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching movement analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch movement analysis'
    });
  }
});

// GET /api/inventory-reports/replenishment-suggestions - Reorder-point recommendations
//
// Formula lives in services/replenishment.js (shared with the analytics work-queue
// endpoint so the reorder logic exists in exactly one place). This does NOT create
// supplier orders and does NOT auto-submit anything — it only produces alerts for a
// human to act on, per the approved business rules.
router.get('/replenishment-suggestions', async (req, res) => {
  try {
    const data = await getReplenishmentSuggestions(pool, req.query.days);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching replenishment suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch replenishment suggestions'
    });
  }
});

// GET /api/inventory-reports/advanced-analytics - Get comprehensive inventory analytics
router.get('/advanced-analytics', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 90);

    const result = await pool.query(`
      WITH inventory_metrics AS (
        SELECT
          i.sku,
          i.name,
          i.category,
          i.quantity as current_stock,
          i.unit_price,
          i.cost_price,
          i.reorder_level,
          i.supplier_id,
          s.name as supplier_name,
          COALESCE(SUM(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            THEN op.quantity
            ELSE 0
          END), 0) as sold_quantity,
          COALESCE(SUM(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            THEN op.quantity * COALESCE(op.unit_price, i.unit_price)
            ELSE 0
          END), 0) as sales_value,
          -- cost of goods sold, and the quantity it actually covers, so an unknown
          -- cost on some lines does not silently understate the average cost
          COALESCE(SUM(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            AND op.cost_price IS NOT NULL
            THEN op.quantity * op.cost_price
            ELSE 0
          END), 0) as cost_of_goods,
          COALESCE(SUM(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            AND op.cost_price IS NOT NULL
            THEN op.quantity
            ELSE 0
          END), 0) as qty_with_known_cost,
          COUNT(DISTINCT CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            THEN o.order_id
          END) as order_count,
          AVG(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
            THEN op.quantity
          END) as avg_order_quantity
        FROM inventory_items i
        LEFT JOIN all_order_products op ON i.sku = op.sku
        LEFT JOIN all_orders o ON op.order_id = o.order_id
        LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
        WHERE i.is_active = true
        GROUP BY i.sku, i.name, i.category, i.quantity, i.unit_price, i.cost_price,
                 i.reorder_level, i.supplier_id, s.name
      ),
      derived AS (
        SELECT
          *,
          (current_stock * unit_price) as inventory_value,
          (sold_quantity::numeric / $1::numeric) as daily_velocity,
          CASE
            WHEN sold_quantity > 0 THEN sales_value / sold_quantity
            ELSE unit_price
          END as avg_selling_price,
          -- effective unit cost: line snapshot first, then the product's own cost,
          -- then NULL (unknown) -- never 0, which would fake a 100% margin
          COALESCE(
            CASE WHEN qty_with_known_cost > 0
                 THEN cost_of_goods / qty_with_known_cost END,
            NULLIF(cost_price, 0)
          ) as effective_unit_cost
        FROM inventory_metrics
      ),
      analytics_calculations AS (
        SELECT
          *,
          CASE
            WHEN daily_velocity > 0 THEN current_stock::numeric / daily_velocity
            ELSE NULL
          END as days_of_supply,
          (sold_quantity::numeric / NULLIF(current_stock, 0)) as turnover_ratio,
          CASE
            WHEN sold_quantity = 0 THEN 'DEAD_STOCK'
            WHEN daily_velocity <= ${SLOW_MOVING_MAX_PER_DAY} THEN 'SLOW_MOVING'
            WHEN daily_velocity <= ${MODERATE_MOVING_MAX_PER_DAY} THEN 'MODERATE_MOVING'
            ELSE 'FAST_MOVING'
          END as movement_category,
          CASE
            WHEN current_stock <= COALESCE(reorder_level, CEIL(current_stock * 0.2)) THEN 'LOW_STOCK'
            WHEN current_stock <= COALESCE(reorder_level, CEIL(current_stock * 0.2)) * 1.5 THEN 'MEDIUM_STOCK'
            ELSE 'HIGH_STOCK'
          END as stock_level,
          (avg_selling_price - effective_unit_cost) as profit_margin,
          CASE
            WHEN effective_unit_cost IS NOT NULL AND avg_selling_price > 0
              THEN ((avg_selling_price - effective_unit_cost) / avg_selling_price) * 100
            ELSE NULL
          END as profit_margin_percentage
        FROM derived
      )
      SELECT
        sku,
        name,
        category,
        current_stock,
        unit_price,
        cost_price,
        reorder_level,
        supplier_name,
        sold_quantity,
        sales_value,
        order_count,
        ROUND(avg_order_quantity::numeric, 2) as avg_order_quantity,
        inventory_value,
        ROUND(avg_selling_price::numeric, 2) as avg_selling_price,
        ROUND(effective_unit_cost::numeric, 2) as effective_unit_cost,
        ROUND(daily_velocity::numeric, 3) as daily_velocity,
        ROUND(days_of_supply::numeric, 1) as days_of_supply,
        ROUND(turnover_ratio::numeric, 2) as turnover_ratio,
        movement_category,
        stock_level,
        ROUND(profit_margin::numeric, 2) as profit_margin,
        ROUND(profit_margin_percentage::numeric, 1) as profit_margin_percentage
      FROM analytics_calculations
      ORDER BY sales_value DESC
    `, [days]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching advanced analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advanced analytics'
    });
  }
});

// Test data endpoints for development/testing
router.post('/test-data/insert', requireTestDataAccess(), async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

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

      // Realistic gift-shop products spanning healthy / low / zero stock, so
      // the report's stock KPIs and category chart have real variation to show.
      const testProducts = [
        { sku: 'TEST-GFT-001', name: 'Premium Gift Box', category: 'Gift Boxes', quantity: 120, unit_price: 350.00, reorder_level: 30 },
        { sku: 'TEST-GFT-002', name: 'Kraft Gift Box', category: 'Gift Boxes', quantity: 8, unit_price: 180.00, reorder_level: 20 },
        { sku: 'TEST-RIB-001', name: 'Satin Ribbon (5m roll)', category: 'Wrapping Supplies', quantity: 0, unit_price: 95.00, reorder_level: 25 },
        { sku: 'TEST-MUG-001', name: 'Personalized Mug', category: 'Personalized Gifts', quantity: 45, unit_price: 275.00, reorder_level: 15 },
        { sku: 'TEST-KEY-001', name: 'Acrylic Keychain', category: 'Personalized Gifts', quantity: 3, unit_price: 65.00, reorder_level: 20 },
        { sku: 'TEST-FLR-001', name: 'Floral Gift Set', category: 'Gift Sets', quantity: 15, unit_price: 620.00, reorder_level: 10 },
        { sku: 'TEST-WED-001', name: 'Wedding Invitation Set', category: 'Wedding', quantity: 72, unit_price: 45.00, reorder_level: 50 },
        { sku: 'TEST-COR-001', name: 'Corporate Gift Bundle', category: 'Corporate', quantity: 22, unit_price: 950.00, reorder_level: 8 },
        { sku: 'TEST-TOT-001', name: 'Custom Tote Bag', category: 'Personalized Gifts', quantity: 60, unit_price: 220.00, reorder_level: 15 },
        { sku: 'TEST-CRD-001', name: 'Greeting Card', category: 'Wrapping Supplies', quantity: 200, unit_price: 25.00, reorder_level: 40 },
        { sku: 'TEST-WRP-001', name: 'Gift Wrapping Paper', category: 'Wrapping Supplies', quantity: 5, unit_price: 55.00, reorder_level: 30 },
        { sku: 'TEST-STK-001', name: 'Decorative Sticker Set', category: 'Wrapping Supplies', quantity: 0, unit_price: 40.00, reorder_level: 25 }
      ];
      for (const p of testProducts) {
        await client.query(`
          INSERT INTO inventory_items (sku, name, description, quantity, unit_price, category, reorder_level)
          VALUES ($1, $2, 'Temporary test data — safe to delete', $3, $4, $5, $6)
          ON CONFLICT (sku) DO NOTHING
        `, [p.sku, p.name, p.quantity, p.unit_price, p.category, p.reorder_level]);
      }

      // Insert test orders with different movement patterns, spread across the
      // last ~90 days so date-based charts (trends, movement, turnover) have
      // real variation instead of everything landing on "today".
      const testOrders = [
        // Fast moving items (high sales, recent)
        {
          order_id: 'TEST-FAST-001',
          name: 'Test Customer Fast',
          shipped_to: 'Test Address',
          order_date: daysAgo(2),
          status: 'Completed',
          shipping_address: 'Test Address',
          total_cost: 150.00,
          payment_type: 'Cash',
          payment_method: 'Cash',
          telephone: '123-456-7890',
          cellphone: '123-456-7890',
          email_address: 'testfast@example.com'
        },
        {
          order_id: 'TEST-FAST-002',
          name: 'Test Customer Fast 2',
          shipped_to: 'Test Address 2',
          order_date: daysAgo(5),
          status: 'Completed',
          shipping_address: 'Test Address 2',
          total_cost: 200.00,
          payment_type: 'Cash',
          payment_method: 'Cash',
          telephone: '123-456-7891',
          cellphone: '123-456-7891',
          email_address: 'testfast2@example.com'
        },
        // Moderate moving items (medium sales, mid-range)
        {
          order_id: 'TEST-MOD-001',
          name: 'Test Customer Mod',
          shipped_to: 'Test Address',
          order_date: daysAgo(30),
          status: 'Completed',
          shipping_address: 'Test Address',
          total_cost: 75.00,
          payment_type: 'Cash',
          payment_method: 'Cash',
          telephone: '123-456-7892',
          cellphone: '123-456-7892',
          email_address: 'testmod@example.com'
        },
        // Slow moving items (low sales, older)
        {
          order_id: 'TEST-SLOW-001',
          name: 'Test Customer Slow',
          shipped_to: 'Test Address',
          order_date: daysAgo(75),
          status: 'Completed',
          shipping_address: 'Test Address',
          total_cost: 25.00,
          payment_type: 'Cash',
          payment_method: 'Cash',
          telephone: '123-456-7893',
          cellphone: '123-456-7893',
          email_address: 'testslow@example.com'
        }
      ];
      
      // Insert orders
      for (const order of testOrders) {
        await client.query(`
          INSERT INTO orders (order_id, name, shipped_to, order_date, status, shipping_address, total_cost, payment_type, payment_method, telephone, cellphone, email_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (order_id) DO NOTHING
        `, [order.order_id, order.name, order.shipped_to, order.order_date, order.status, order.shipping_address, order.total_cost, order.payment_type, order.payment_method, order.telephone, order.cellphone, order.email_address]);
      }
      
      // Insert order products with different quantities to simulate movement patterns.
      // Uses the realistic test SKUs inserted above, so this doesn't depend on
      // whatever real inventory happens to exist.
      const testOrderProducts = [
        // Fast moving - high quantities
        { order_id: 'TEST-FAST-001', sku: 'TEST-GFT-001', quantity: 15 },
        { order_id: 'TEST-FAST-001', sku: 'TEST-MUG-001', quantity: 12 },
        { order_id: 'TEST-FAST-002', sku: 'TEST-GFT-001', quantity: 20 },
        { order_id: 'TEST-FAST-002', sku: 'TEST-TOT-001', quantity: 18 },

        // Moderate moving - medium quantities
        { order_id: 'TEST-MOD-001', sku: 'TEST-FLR-001', quantity: 5 },
        { order_id: 'TEST-MOD-001', sku: 'TEST-WED-001', quantity: 3 },

        // Slow moving - low quantities
        { order_id: 'TEST-SLOW-001', sku: 'TEST-COR-001', quantity: 1 },
        { order_id: 'TEST-SLOW-001', sku: 'TEST-CRD-001', quantity: 2 }
      ];
      
      // Insert order products
      for (const product of testOrderProducts) {
        await client.query(`
          INSERT INTO order_products (order_id, sku, quantity)
          VALUES ($1, $2, $3)
        `, [product.order_id, product.sku, product.quantity]);
      }

      // ── TEST DATA — TEMPORARY ──────────────────────────────────────────
      // Extra orders covering Pending/Cancelled statuses, so the Sales Overview
      // "Orders by Status" and Completed/Pending/Cancelled KPIs have something
      // to show beyond the all-Completed set above. Remove via /test-data/clear.
      const extraStatusOrders = [
        { order_id: 'TEST-PENDING-001', name: 'Test Customer Pending', status: 'Order Placed', total_cost: 120.00, order_date: daysAgo(1) },
        { order_id: 'TEST-PENDING-002', name: 'Test Customer Pending 2', status: 'To Be Packed', total_cost: 95.00, order_date: daysAgo(3) },
        { order_id: 'TEST-CANCELLED-001', name: 'Test Customer Cancelled', status: 'Cancelled', total_cost: 60.00, order_date: daysAgo(10) }
      ];
      for (const order of extraStatusOrders) {
        await client.query(`
          INSERT INTO orders (order_id, name, shipped_to, order_date, status, shipping_address, total_cost, payment_type, payment_method, telephone, cellphone, email_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'Cash', 'Cash', '123-456-0000', '123-456-0000', 'testextra@example.com')
          ON CONFLICT (order_id) DO NOTHING
        `, [order.order_id, order.name, order.name, order.order_date, order.status, order.name, order.total_cost]);
      }

      // Invoices for two TEST-FAST orders — one fully paid, one partially paid —
      // so Paid Amount / Outstanding Payments KPIs have non-zero demo values.
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

      await client.query(`
        INSERT INTO invoices (invoice_number, order_id, invoice_type, status, subtotal, total_order_amount, amount_due, amount_paid)
        VALUES ($1, $2, 'DOWN_PAYMENT', 'PAID', $3, $3, 0, $3)
        ON CONFLICT (invoice_number) DO NOTHING
      `, ['TEST-INV-PAID-001', 'TEST-FAST-001', 150.00]);

      await client.query(`
        INSERT INTO invoices (invoice_number, order_id, invoice_type, status, subtotal, total_order_amount, amount_due, amount_paid)
        VALUES ($1, $2, 'DOWN_PAYMENT', 'UNPAID', $3, $3, $4, $5)
        ON CONFLICT (invoice_number) DO NOTHING
      `, ['TEST-INV-PARTIAL-001', 'TEST-FAST-002', 200.00, 100.00, 100.00]);

      // ── END TEST DATA ───────────────────────────────────────────────────

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Test data inserted successfully',
        data: {
          orders_inserted: testOrders.length + extraStatusOrders.length,
          order_products_inserted: testOrderProducts.length,
          test_inventory_items_created: testProducts.length,
          test_invoices_created: 2
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error inserting test data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to insert test data',
      error: error.message
    });
  }
});

router.post('/test-data/clear', requireTestDataAccess(), async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete test invoices (must go before orders/order_products due to order_id references)
      await client.query(`DELETE FROM invoices WHERE order_id LIKE 'TEST-%'`);

      // Delete test order products first (due to foreign key constraints)
      await client.query(`
        DELETE FROM order_products
        WHERE order_id LIKE 'TEST-%'
      `);

      // Delete test orders
      await client.query(`
        DELETE FROM orders
        WHERE order_id LIKE 'TEST-%'
      `);

      // Delete test inventory items
      await client.query(`DELETE FROM inventory_items WHERE sku LIKE 'TEST-%'`);

      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Test data cleared successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error clearing test data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear test data',
      error: error.message
    });
  }
});

// GET /api/inventory-reports/stock-flow?days=30
// Returns daily stock-in and stock-out totals from stock_movements so the
// Movement Analysis tab can render a time-series chart.
//
// performed_by is stored as a TEXT column that holds a numeric user-id in most
// rows but may contain legacy free-text. The CASE guard avoids a runtime cast
// error if a non-numeric value slips through.
router.get('/stock-flow', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 180);
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('day', created_at)::date AS day,
        COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'in'),  0) AS stock_in,
        COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'out'), 0) AS stock_out
      FROM stock_movements
      WHERE created_at >= CURRENT_DATE - $1
      GROUP BY 1
      ORDER BY 1
    `, [days]);

    res.json({
      success: true,
      data: result.rows.map(r => ({
        date: typeof r.day.getFullYear === 'function'
          ? `${r.day.getFullYear()}-${String(r.day.getMonth()+1).padStart(2,'0')}-${String(r.day.getDate()).padStart(2,'0')}`
          : r.day,
        stockIn:  Number(r.stock_in),
        stockOut: Number(r.stock_out),
      })),
    });
  } catch (error) {
    console.error('Error fetching stock flow:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stock flow' });
  }
});

module.exports = router;
