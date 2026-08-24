// services/movementClassification.js
//
// Extracted from routes/inventory-reports.js GET /movement-analysis so the
// Monthly/Yearly report service (services/reportService.js) can reuse the
// exact same velocity classification instead of duplicating the SQL. Same
// query, same output shape, same thresholds -- this is a pure extraction,
// not a behavior change.
//
// Movement categories are classified on units-per-DAY, not absolute units
// sold. The previous thresholds (>50 = FAST_MOVING) were not normalised by
// the lookback window, so "fast-moving" silently meant something different
// at days=30 than at days=90. These constants reproduce the original intent
// at the 90-day default.
const SLOW_MOVING_MAX_PER_DAY = 10.0 / 90.0;      // <= 10 units per 90 days
const MODERATE_MOVING_MAX_PER_DAY = 50.0 / 90.0;  // <= 50 units per 90 days

async function getMovementAnalysis(pool, days = 90) {
  const lookbackDays = Math.max(1, parseInt(days, 10) || 90);

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
        (sold_quantity::numeric / NULLIF(current_stock, 0)) as velocity_ratio,
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
  `, [lookbackDays]);

  return result.rows;
}

module.exports = { getMovementAnalysis, SLOW_MOVING_MAX_PER_DAY, MODERATE_MOVING_MAX_PER_DAY };
