// services/replenishment.js
//
// Shared implementation of the approved hybrid reorder formula (Issue 2), extracted
// from routes/inventory-reports.js GET /replenishment-suggestions so other callers
// (e.g. the analytics work-queue) don't duplicate the formula:
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
const MIN_SALES_DAYS_FOR_DYNAMIC_FORMULA = 14;
const DEFAULT_REORDER_THRESHOLD = 35;
const DEFAULT_SAFETY_STOCK_DAYS = 3;
const DEFAULT_LEAD_TIME_DAYS = 7;
const DEFAULT_COVERAGE_DAYS = 30;

async function getReplenishmentSuggestions(pool, days = 90) {
  const lookbackDays = Math.max(1, parseInt(days, 10) || 90);

  const result = await pool.query(`
    WITH sales AS (
      SELECT
        op.sku,
        SUM(op.quantity) AS qty_sold,
        COUNT(DISTINCT o.order_date) AS sales_days
      FROM all_order_products op
      JOIN all_orders o ON op.order_id = o.order_id
      WHERE o.status IN ('Order Received', 'Completed')
        AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
      GROUP BY op.sku
    ),
    reserved AS (
      -- live orders only, by design: archived orders are terminal, never 'Order Paid'
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
      target_stock_level,
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
  `, [lookbackDays]);

  return result.rows;
}

module.exports = { getReplenishmentSuggestions };
