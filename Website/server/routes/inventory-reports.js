
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

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
    const dateFilter = startDate && endDate 
      ? `AND o.order_date BETWEEN '${startDate}' AND '${endDate}'`
      : '';
    
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
          THEN op.quantity * i.unit_price 
          ELSE 0 
        END), 0) as sales_value
      FROM inventory_items i
      LEFT JOIN order_products op ON i.sku = op.sku
      LEFT JOIN orders o ON op.order_id = o.order_id ${dateFilter}
      WHERE i.is_active = true
      GROUP BY i.sku, i.name, i.category, i.quantity
      ORDER BY sales_value DESC
    `);
    
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
    const { months = 12 } = req.query;
    
    const result = await pool.query(`
      WITH monthly_sales AS (
        SELECT 
          DATE_TRUNC('month', o.order_date) as month,
          SUM(op.quantity * i.unit_price) as monthly_sales
        FROM orders o
        JOIN order_products op ON o.order_id = op.order_id
        WHERE o.status IN ('Order Received', 'Completed')
          AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
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
    `);
    
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
router.get('/movement-analysis', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
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
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity 
            ELSE 0 
          END), 0) as sold_quantity,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity * i.unit_price 
            ELSE 0 
          END), 0) as sales_value,
          COUNT(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN 1 
          END) as sales_frequency
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        WHERE i.is_active = true
        GROUP BY i.sku, i.name, i.category, i.quantity, i.unit_price, i.reorder_level
      ),
      movement_classification AS (
        SELECT 
          *,
          CASE 
            WHEN sold_quantity = 0 THEN 'DEAD_STOCK'
            WHEN sold_quantity > 0 AND sold_quantity <= 10 THEN 'SLOW_MOVING'
            WHEN sold_quantity > 10 AND sold_quantity <= 50 THEN 'MODERATE_MOVING'
            WHEN sold_quantity > 50 THEN 'FAST_MOVING'
          END as movement_category,
          CASE 
            WHEN current_stock > 0 THEN sold_quantity::float / current_stock
            ELSE 0
          END as velocity_ratio,
          CASE 
            WHEN sold_quantity > 0 THEN current_stock::float / sold_quantity
            ELSE 999
          END as months_of_stock
        FROM sales_analysis
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
        ROUND(velocity_ratio::numeric, 2) as velocity_ratio,
        ROUND(months_of_stock::numeric, 1) as months_of_stock,
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
    `);
    
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
// Implements the approved hybrid reorder formula (Issue 2):
//   availableStock   = onHandStock - reservedStock
//   reservedStock    = qty on orders with status 'Order Paid' (confirmed, not yet packed)
//   averageDailyUsage = qty sold (Order Received/Completed) in the lookback window / days
//   safetyStock      = averageDailyUsage * safety_stock_days (default 3)
//   reorderPoint     = ceil(averageDailyUsage * leadTimeDays + safetyStock)   [dynamic]
//                       when the SKU has >= MIN_SALES_DAYS distinct days of sales activity
//                       in the window; otherwise falls back to the product's own
//                       reorder_level, then the system default of 35.
//   suggestedReorderQuantity = max(0, targetStockLevel - availableStock)
//   targetStockLevel = maximum_stock_level if set, else averageDailyUsage * 30 days
//
// This does NOT create supplier orders and does NOT auto-submit anything — it only
// produces alerts/recommendations for a human to act on, per the approved business rules.
const MIN_SALES_DAYS_FOR_DYNAMIC_FORMULA = 14;
const DEFAULT_REORDER_THRESHOLD = 35;
const DEFAULT_SAFETY_STOCK_DAYS = 3;
const DEFAULT_LEAD_TIME_DAYS = 7;
const DEFAULT_COVERAGE_DAYS = 30;

router.get('/replenishment-suggestions', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 90);

    const result = await pool.query(`
      WITH sales AS (
        SELECT
          op.sku,
          SUM(op.quantity) AS qty_sold,
          COUNT(DISTINCT o.order_date) AS sales_days
        FROM order_products op
        JOIN orders o ON op.order_id = o.order_id
        WHERE o.status IN ('Order Received', 'Completed')
          AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
        GROUP BY op.sku
      ),
      reserved AS (
        SELECT op.sku, SUM(op.quantity) AS reserved_quantity
        FROM order_products op
        JOIN orders o ON op.order_id = o.order_id
        WHERE o.status = 'Order Paid'
        GROUP BY op.sku
      ),
      base AS (
        SELECT
          i.sku,
          i.name,
          i.category,
          i.quantity AS on_hand_stock,
          i.unit_price,
          i.reorder_level,
          i.lead_time_days,
          i.safety_stock_days,
          i.maximum_stock_level,
          i.supplier_id,
          s.name AS supplier_name,
          s.lead_time_days AS supplier_lead_time_days,
          COALESCE(res.reserved_quantity, 0) AS reserved_stock,
          COALESCE(sales.qty_sold, 0) AS qty_sold,
          COALESCE(sales.sales_days, 0) AS sales_days
        FROM inventory_items i
        LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
        LEFT JOIN sales ON sales.sku = i.sku
        LEFT JOIN reserved res ON res.sku = i.sku
        WHERE i.is_active = true
      ),
      calc AS (
        SELECT
          *,
          GREATEST(on_hand_stock - reserved_stock, 0) AS available_stock_raw,
          (on_hand_stock - reserved_stock) AS available_stock,
          (qty_sold::numeric / $1::numeric) AS average_daily_usage,
          COALESCE(NULLIF(lead_time_days, 0), NULLIF(supplier_lead_time_days, 0), ${DEFAULT_LEAD_TIME_DAYS}) AS effective_lead_time_days,
          COALESCE(safety_stock_days, ${DEFAULT_SAFETY_STOCK_DAYS}) AS effective_safety_stock_days,
          (sales_days >= ${MIN_SALES_DAYS_FOR_DYNAMIC_FORMULA}) AS has_sufficient_history
        FROM base
      ),
      final AS (
        SELECT
          *,
          (average_daily_usage * effective_safety_stock_days) AS safety_stock,
          CASE
            WHEN has_sufficient_history THEN
              CEIL(average_daily_usage * effective_lead_time_days + average_daily_usage * effective_safety_stock_days)
            ELSE
              COALESCE(NULLIF(reorder_level, 0), ${DEFAULT_REORDER_THRESHOLD})
          END AS reorder_point,
          CASE
            WHEN has_sufficient_history THEN 'dynamic'
            WHEN COALESCE(reorder_level, 0) > 0 THEN 'product_threshold'
            ELSE 'default_35'
          END AS formula_source,
          COALESCE(NULLIF(maximum_stock_level, 0), CEIL(average_daily_usage * ${DEFAULT_COVERAGE_DAYS})) AS target_stock_level
        FROM calc
      ),
      scored AS (
        SELECT
          *,
          (available_stock <= reorder_point) AS needs_reorder,
          CASE
            WHEN available_stock <= 0 THEN 'Out of Stock'
            WHEN available_stock <= reorder_point THEN 'Reorder Recommended'
            WHEN available_stock <= reorder_point * 1.25 THEN 'Approaching Reorder Point'
            ELSE 'Healthy'
          END AS reorder_status,
          GREATEST(0, CEIL(target_stock_level - available_stock)) AS suggested_reorder_quantity,
          CASE
            WHEN average_daily_usage > 0 THEN ROUND((available_stock / average_daily_usage)::numeric, 1)
            ELSE NULL
          END AS days_of_supply
        FROM final
      )
      SELECT
        sku,
        name,
        category,
        on_hand_stock,
        reserved_stock,
        available_stock,
        unit_price,
        reorder_level,
        effective_lead_time_days AS lead_time_days,
        effective_safety_stock_days AS safety_stock_days,
        ROUND(safety_stock::numeric, 1) AS safety_stock,
        supplier_name,
        ROUND(average_daily_usage::numeric, 2) AS average_daily_usage,
        sales_days,
        reorder_point,
        formula_source,
        suggested_reorder_quantity,
        needs_reorder,
        reorder_status,
        days_of_supply,
        (on_hand_stock * unit_price) AS current_inventory_value,
        NOW() AS last_calculated_at
      FROM scored
      ORDER BY
        CASE reorder_status
          WHEN 'Out of Stock' THEN 1
          WHEN 'Reorder Recommended' THEN 2
          WHEN 'Approaching Reorder Point' THEN 3
          ELSE 4
        END,
        available_stock ASC
    `, [days]);

    res.json({
      success: true,
      data: result.rows
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
    const { days = 90 } = req.query;
    
    const result = await pool.query(`
      WITH inventory_metrics AS (
        SELECT 
          i.sku,
          i.name,
          i.category,
          i.quantity as current_stock,
          i.unit_price,
          i.reorder_level,
          i.supplier_id,
          s.name as supplier_name,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity 
            ELSE 0 
          END), 0) as sold_quantity,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity * i.unit_price 
            ELSE 0 
          END), 0) as sales_value,
          COUNT(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN 1 
          END) as order_count,
          AVG(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity 
          END) as avg_order_quantity
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
        WHERE i.is_active = true
        GROUP BY i.sku, i.name, i.category, i.quantity, i.unit_price, i.reorder_level, i.supplier_id, s.name
      ),
      analytics_calculations AS (
        SELECT 
          *,
          (current_stock * unit_price) as inventory_value,
          CASE 
            WHEN sold_quantity > 0 THEN sales_value / sold_quantity
            ELSE unit_price
          END as avg_selling_price,
          CASE 
            WHEN sold_quantity > 0 AND ${parseInt(days)} > 0 THEN 
              ROUND((sold_quantity / ${parseInt(days)})::numeric, 2)
            ELSE 0
          END as daily_velocity,
          CASE 
            WHEN sold_quantity > 0 AND ${parseInt(days)} > 0 AND (sold_quantity / ${parseInt(days)}) > 0 THEN 
              ROUND((current_stock / (sold_quantity / ${parseInt(days)}))::numeric, 1)
            ELSE 999
          END as days_of_supply,
          CASE 
            WHEN sold_quantity > 0 THEN 
              ROUND((sold_quantity / current_stock)::numeric, 2)
            ELSE 0
          END as turnover_ratio,
          CASE 
            WHEN sold_quantity = 0 THEN 'DEAD_STOCK'
            WHEN sold_quantity > 0 AND sold_quantity <= 10 THEN 'SLOW_MOVING'
            WHEN sold_quantity > 10 AND sold_quantity <= 50 THEN 'MODERATE_MOVING'
            WHEN sold_quantity > 50 THEN 'FAST_MOVING'
          END as movement_category,
          CASE 
            WHEN current_stock <= COALESCE(reorder_level, CEIL(current_stock * 0.2)) THEN 'LOW_STOCK'
            WHEN current_stock <= COALESCE(reorder_level, CEIL(current_stock * 0.2)) * 1.5 THEN 'MEDIUM_STOCK'
            ELSE 'HIGH_STOCK'
          END as stock_level,
          CASE 
            WHEN sold_quantity > 0 THEN 
              ROUND(((sales_value / sold_quantity) - unit_price)::numeric, 2)
            ELSE 0
          END as profit_margin,
          CASE 
            WHEN sold_quantity > 0 THEN 
              ROUND((((sales_value / sold_quantity) - unit_price) / (sales_value / sold_quantity) * 100)::numeric, 1)
            ELSE 0
          END as profit_margin_percentage
        FROM inventory_metrics
      )
      SELECT 
        sku,
        name,
        category,
        current_stock,
        unit_price,
        reorder_level,
        supplier_name,
        sold_quantity,
        sales_value,
        order_count,
        ROUND(avg_order_quantity::numeric, 2) as avg_order_quantity,
        inventory_value,
        ROUND(avg_selling_price::numeric, 2) as avg_selling_price,
        daily_velocity,
        days_of_supply,
        turnover_ratio,
        movement_category,
        stock_level,
        ROUND(profit_margin::numeric, 2) as profit_margin,
        profit_margin_percentage
      FROM analytics_calculations
      ORDER BY sales_value DESC
    `);
    
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
router.post('/test-data/insert', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

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

router.post('/test-data/clear', async (req, res) => {
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

module.exports = router;
