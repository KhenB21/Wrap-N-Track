// services/reportService.js
//
// Shared calculation engine for the Monthly and Yearly Sales & Inventory
// Reports (routes/reports.js). Both report types call the same functions
// here with different date bounds -- there is deliberately no separate
// "monthly logic" vs "yearly logic": a month is just resolveMonthRange(),
// a year is just resolveYearRange(), and everything downstream is identical.
//
// REUSE, NOT REIMPLEMENTATION. This file does not invent new business rules:
//   - reorder points / low-stock status  -> services/replenishment.js
//   - sales velocity classification      -> services/movementClassification.js
//   - source of truth for all sales      -> all_orders / all_order_products
//     (migration 038 -- reading `orders` alone silently drops archived
//     revenue, see that migration's comment)
//   - cost_price NULL handling           -> excluded from margin, reported
//     separately as marginCoverage, exactly like routes/analytics.js does.
//     An unknown cost is never treated as zero cost (which would fake a
//     100% margin).
//
// KNOWN GAP -- read before extending this file, especially getInventoryMovement().
// There is no historical inventory snapshot mechanism anywhere in this schema.
// inventory_items.quantity is a live, CURRENT-ONLY figure. The only audit
// trail (stock_movements) exclusively records manual corrections written by
// the /add-stock and /stock-out endpoints (routes/inventory.js) -- sales-
// driven deductions and order-cancellation restocks are written directly to
// inventory_items.quantity by routes/orders.js with no corresponding
// stock_movements row, and the deduction happens when an order reaches
// "To Be Packed", not at order placement and not at revenue recognition
// ("Order Received"/"Completed"). Consequently getInventoryMovement() below
// reports period ACTIVITY (units sold, manual stock in/out) accurately, but
// returns beginningInventory: null rather than a fabricated reconciled
// balance for a closed past period. Do not "fix" this by inventing a
// beginning-balance formula without extending the audit trail first.

const { getReplenishmentSuggestions } = require('./replenishment');
const { getMovementAnalysis } = require('./movementClassification');

const REVENUE_STATUSES = "('Order Received', 'Completed')";

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function toDateStr(d) { return d.toISOString().slice(0, 10); }

// node-pg parses a DATE column into a JS Date at LOCAL midnight, not UTC
// midnight -- calling toISOString() on that silently shifts the calendar
// date backward a day whenever the server's local timezone is ahead of UTC
// (same verified issue documented in routes/analytics.js). Read the
// calendar date back out with local getters instead.
function pgDateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── period resolution ────────────────────────────────────────────────────

function resolveMonthRange(year, month) {
  const y = Number(year), m = Number(month); // month is 1-12
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last day of this month
  return { start, end };
}

function previousMonthRange(year, month) {
  const y = Number(year), m = Number(month);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  return resolveMonthRange(prevY, prevM);
}

function resolveYearRange(year) {
  const y = Number(year);
  return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y, 11, 31)) };
}

function previousYearRange(year) {
  return resolveYearRange(Number(year) - 1);
}

function trend(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  const delta = round2(c - p);
  const deltaPct = p !== 0 ? round2((delta / p) * 100) : null;
  return { current: round2(c), previous: round2(p), delta, deltaPct, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
}

// ── sales ────────────────────────────────────────────────────────────────

async function getSalesSummary(pool, start, end) {
  const s = toDateStr(start), e = toDateStr(end);
  const r = await pool.query(`
    WITH period_orders AS (
      SELECT o.order_id, o.status, o.total_cost
      FROM all_orders o
      WHERE o.order_date::date BETWEEN $1 AND $2
    ),
    lines AS (
      SELECT op.quantity, op.unit_price, op.cost_price
      FROM all_order_products op
      JOIN period_orders po ON po.order_id = op.order_id
      WHERE po.status IN ${REVENUE_STATUSES}
    )
    SELECT
      COALESCE((SELECT SUM(total_cost) FROM period_orders WHERE status IN ${REVENUE_STATUSES}), 0) AS total_revenue,
      (SELECT COUNT(*) FROM period_orders) AS total_orders,
      (SELECT COUNT(*) FROM period_orders WHERE status IN ${REVENUE_STATUSES}) AS completed_orders,
      (SELECT COUNT(*) FROM period_orders WHERE status = 'Cancelled') AS cancelled_orders,
      (SELECT COUNT(*) FROM period_orders WHERE status NOT IN ${REVENUE_STATUSES} AND status <> 'Cancelled') AS pending_orders,
      COALESCE((SELECT SUM(quantity) FROM lines), 0) AS total_units_sold,
      COALESCE((SELECT SUM(quantity * (unit_price - cost_price)) FROM lines WHERE cost_price IS NOT NULL), 0) AS total_profit,
      (SELECT COUNT(*) FROM lines) AS line_count,
      (SELECT COUNT(*) FROM lines WHERE cost_price IS NULL) AS lines_missing_cost
  `, [s, e]);

  const row = r.rows[0];
  const totalRevenue = Number(row.total_revenue);
  const completedOrders = Number(row.completed_orders);
  return {
    totalRevenue,
    totalOrders: Number(row.total_orders),
    completedOrders,
    cancelledOrders: Number(row.cancelled_orders),
    pendingOrders: Number(row.pending_orders),
    totalUnitsSold: Number(row.total_units_sold),
    avgOrderValue: completedOrders > 0 ? round2(totalRevenue / completedOrders) : 0,
    totalProfit: round2(row.total_profit),
    marginCoverage: { lineCount: Number(row.line_count), linesMissingCost: Number(row.lines_missing_cost) },
  };
}

async function getDailySalesSeries(pool, start, end) {
  const s = toDateStr(start), e = toDateStr(end);
  const r = await pool.query(`
    WITH days AS (SELECT generate_series($1::date, $2::date, interval '1 day')::date AS d),
    daily AS (
      SELECT o.order_date::date AS d,
        COALESCE(SUM(o.total_cost) FILTER (WHERE o.status IN ${REVENUE_STATUSES}), 0) AS revenue
      FROM all_orders o
      WHERE o.order_date::date BETWEEN $1 AND $2
      GROUP BY o.order_date::date
    )
    SELECT days.d, COALESCE(daily.revenue, 0) AS revenue
    FROM days LEFT JOIN daily ON daily.d = days.d
    ORDER BY days.d
  `, [s, e]);
  return r.rows.map(row => ({ date: pgDateToStr(row.d), revenue: Number(row.revenue) }));
}

// One row per calendar month of `year` -- used by the Yearly report's
// monthly trend graphs (Sections 2 and 3).
async function getMonthlySalesSeries(pool, year) {
  const r = await pool.query(`
    WITH months AS (
      SELECT generate_series(make_date($1::int,1,1), make_date($1::int,12,1), interval '1 month')::date AS m
    ),
    monthly AS (
      SELECT DATE_TRUNC('month', o.order_date::date)::date AS m,
        COALESCE(SUM(o.total_cost) FILTER (WHERE o.status IN ${REVENUE_STATUSES}), 0) AS revenue,
        COUNT(*) AS orders_all,
        COUNT(*) FILTER (WHERE o.status IN ${REVENUE_STATUSES}) AS orders_revenue
      FROM all_orders o
      WHERE EXTRACT(YEAR FROM o.order_date::date) = $1::int
      GROUP BY 1
    )
    SELECT months.m, COALESCE(monthly.revenue, 0) AS revenue,
           COALESCE(monthly.orders_all, 0) AS orders_all,
           COALESCE(monthly.orders_revenue, 0) AS orders_revenue
    FROM months LEFT JOIN monthly ON monthly.m = months.m
    ORDER BY months.m
  `, [Number(year)]);
  return r.rows.map(row => ({
    month: pgDateToStr(row.m).slice(0, 7),
    revenue: Number(row.revenue),
    orders: Number(row.orders_all),
    completedOrders: Number(row.orders_revenue),
  }));
}

async function getProductPerformance(pool, start, end, limit = 100) {
  const s = toDateStr(start), e = toDateStr(end);
  const r = await pool.query(`
    WITH lines AS (
      SELECT op.sku, op.quantity, op.unit_price, op.cost_price
      FROM all_order_products op
      JOIN all_orders o ON o.order_id = op.order_id
      WHERE o.status IN ${REVENUE_STATUSES}
        AND o.order_date::date BETWEEN $1 AND $2
    ),
    agg AS (
      SELECT sku,
        SUM(quantity) AS units_sold,
        SUM(quantity * unit_price) AS revenue,
        SUM(quantity * (unit_price - cost_price)) FILTER (WHERE cost_price IS NOT NULL) AS gross_profit,
        COUNT(*) FILTER (WHERE cost_price IS NULL) AS lines_missing_cost
      FROM lines
      GROUP BY sku
    ),
    total AS (SELECT COALESCE(SUM(revenue), 0) AS total_revenue FROM agg)
    SELECT a.sku, i.name, i.category, a.units_sold, a.revenue, a.gross_profit, a.lines_missing_cost,
      CASE WHEN t.total_revenue > 0 THEN ROUND((a.revenue / t.total_revenue * 100)::numeric, 2) ELSE 0 END AS pct_of_sales
    FROM agg a
    LEFT JOIN inventory_items i ON i.sku = a.sku
    CROSS JOIN total t
    ORDER BY a.revenue DESC
    LIMIT $3
  `, [s, e, limit]);

  return r.rows.map((row, idx) => ({
    rank: idx + 1,
    sku: row.sku,
    name: row.name || row.sku,
    category: row.category,
    unitsSold: Number(row.units_sold),
    revenue: Number(row.revenue),
    grossProfit: row.gross_profit !== null ? round2(row.gross_profit) : null,
    linesMissingCost: Number(row.lines_missing_cost),
    pctOfSales: Number(row.pct_of_sales),
  }));
}

// ── inventory ────────────────────────────────────────────────────────────

// No definition of "overstock" exists anywhere in the codebase (verified).
// This mirrors the existing reorder-point buckets in services/replenishment.js
// (Healthy / Approaching Reorder Point / Reorder Recommended / Out of Stock)
// on the high side: more than double the computed target stock level counts
// as overstocked. A judgment call, documented here rather than buried, the
// same way services/insightEngine.js documents its threshold choices.
const OVERSTOCK_MULTIPLIER = 2;

// Stock-LEVEL health (Low/Out/Healthy/Overstock) -- built on top of the
// existing reorder-point formula in services/replenishment.js, not a new
// formula. Returns both per-status counts (for Section 7's chart) and the
// full row list (for Section 8's low-stock/reorder table).
async function getStockLevelHealth(pool) {
  const rows = await getReplenishmentSuggestions(pool, 90);
  const withOverstock = rows.map(row => {
    const available = Number(row.available_stock);
    const target = Math.max(Number(row.target_stock_level) || 0, 1);
    const isOverstock = row.reorder_status === 'Healthy' && available > target * OVERSTOCK_MULTIPLIER;
    return { ...row, health_status: isOverstock ? 'Overstock' : row.reorder_status };
  });

  const counts = { 'Out of Stock': 0, 'Reorder Recommended': 0, 'Approaching Reorder Point': 0, 'Healthy': 0, 'Overstock': 0 };
  withOverstock.forEach(row => { counts[row.health_status] = (counts[row.health_status] || 0) + 1; });

  return { rows: withOverstock, counts };
}

// Sales-velocity health (Fast/Moderate/Slow/Dead) -- a different dimension
// from stock level (an item can be both "Healthy" stock level AND
// "Slow Moving" velocity at the same time), so this is reported alongside
// getStockLevelHealth(), not merged into one taxonomy.
async function getVelocityHealth(pool, lookbackDays) {
  const rows = await getMovementAnalysis(pool, lookbackDays);
  const counts = { FAST_MOVING: 0, MODERATE_MOVING: 0, SLOW_MOVING: 0, DEAD_STOCK: 0 };
  rows.forEach(row => { counts[row.movement_category] = (counts[row.movement_category] || 0) + 1; });
  return { rows, counts };
}

// Section 8 is specifically "needs to be reordered" — Overstock items are
// the opposite problem (too much stock) and belong in Section 7's health
// counts only, not a reorder action table.
function getLowStockReport(stockLevelRows) {
  return stockLevelRows
    .filter(r => r.health_status === 'Out of Stock' || r.health_status === 'Reorder Recommended' || r.health_status === 'Approaching Reorder Point')
    .map(r => ({
      sku: r.sku,
      name: r.name,
      currentStock: Number(r.available_stock),
      reorderLevel: Number(r.reorder_point),
      suggestedAction: r.health_status === 'Out of Stock'
        ? `Reorder ${r.suggested_reorder_quantity} units immediately`
        : `Reorder ${r.suggested_reorder_quantity} units`,
      status: r.health_status === 'Out of Stock' ? 'Critical'
        : r.health_status === 'Reorder Recommended' ? 'Low'
        : 'Approaching',
    }));
}

// Period ACTIVITY only -- see the KNOWN GAP note at the top of this file for
// why beginningInventory is null rather than a computed reconciliation.
async function getInventoryMovement(pool, start, end) {
  const s = toDateStr(start), e = toDateStr(end);

  const soldR = await pool.query(`
    SELECT op.sku, i.name, i.quantity AS current_stock,
      SUM(op.quantity) AS units_sold
    FROM all_order_products op
    JOIN all_orders o ON o.order_id = op.order_id
    LEFT JOIN inventory_items i ON i.sku = op.sku
    WHERE o.status IN ${REVENUE_STATUSES}
      AND o.order_date::date BETWEEN $1 AND $2
    GROUP BY op.sku, i.name, i.quantity
  `, [s, e]);

  // stock_movements.product_id actually stores the SKU value (see
  // routes/inventory.js logStockMovement — inserted straight from `sku`),
  // despite the column name; there is no separate numeric product id here.
  const movedR = await pool.query(`
    SELECT product_id AS sku,
      COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'STOCK_IN'), 0) AS stock_in,
      COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'STOCK_OUT'), 0) AS stock_out
    FROM stock_movements
    WHERE created_at::date BETWEEN $1 AND $2
    GROUP BY product_id
  `, [s, e]);

  const bySku = {};
  soldR.rows.forEach(row => {
    bySku[row.sku] = {
      sku: row.sku,
      name: row.name || row.sku,
      currentStock: row.current_stock !== null ? Number(row.current_stock) : null,
      unitsSold: Number(row.units_sold),
      manualStockIn: 0,
      manualStockOut: 0,
    };
  });
  movedR.rows.forEach(row => {
    if (!bySku[row.sku]) bySku[row.sku] = { sku: row.sku, name: row.sku, currentStock: null, unitsSold: 0, manualStockIn: 0, manualStockOut: 0 };
    bySku[row.sku].manualStockIn = Number(row.stock_in);
    bySku[row.sku].manualStockOut = Number(row.stock_out);
  });

  const totals = Object.values(bySku).reduce((acc, r) => {
    acc.unitsSold += r.unitsSold;
    acc.manualStockIn += r.manualStockIn;
    acc.manualStockOut += r.manualStockOut;
    return acc;
  }, { unitsSold: 0, manualStockIn: 0, manualStockOut: 0 });

  return {
    beginningInventory: null, // see KNOWN GAP note — not reconstructable from existing data
    beginningInventoryNote: 'Not available — WrapNTrack does not store historical inventory snapshots.',
    stockReceived: totals.manualStockIn,
    stockSold: totals.unitsSold,
    adjustments: totals.manualStockOut, // manual STOCK_OUT not tied to a sale (corrections, damage, etc.)
    byProduct: Object.values(bySku).sort((a, b) => b.unitsSold - a.unitsSold),
  };
}

// ── accounts receivable ─────────────────────────────────────────────────

// invoices.due_date is empty across the whole table (verified) -- AR "age"
// is reported from issued_at, never labeled "days overdue" against a date
// the system doesn't actually track.
async function getArSummary(pool, start, end) {
  const s = toDateStr(start), e = toDateStr(end);
  const r = await pool.query(`
    SELECT
      COALESCE(SUM(amount_due), 0) AS total_invoiced,
      COALESCE(SUM(amount_paid), 0) AS total_collected,
      COALESCE(SUM(amount_due - amount_paid), 0) AS outstanding
    FROM invoices
    WHERE status <> 'CANCELLED' AND issued_at::date BETWEEN $1 AND $2
  `, [s, e]);
  const row = r.rows[0];
  return {
    totalInvoiced: round2(row.total_invoiced),
    totalCollected: round2(row.total_collected),
    outstandingAr: round2(row.outstanding),
  };
}

async function getOutstandingInvoices(pool, asOfDate) {
  const r = await pool.query(`
    SELECT
      i.invoice_number, i.order_id, i.amount_due, i.amount_paid, i.issued_at,
      COALESCE(o.name, oh.name, cd.name) AS customer_name,
      EXTRACT(DAY FROM ($1::timestamp - i.issued_at))::int AS age_days
    FROM invoices i
    LEFT JOIN orders o ON i.order_id = o.order_id
    LEFT JOIN order_history oh ON i.order_id = oh.order_id
    LEFT JOIN customer_details cd ON i.customer_id = cd.customer_id
    WHERE i.status <> 'CANCELLED' AND (i.amount_due - i.amount_paid) > 0
    ORDER BY i.issued_at ASC
  `, [toDateStr(asOfDate)]);

  return r.rows.map(row => ({
    invoiceNumber: row.invoice_number,
    orderId: row.order_id,
    customerName: row.customer_name || 'Customer',
    amount: round2(row.amount_due - row.amount_paid),
    issuedAt: row.issued_at,
    ageDays: Number(row.age_days),
  }));
}

// ── management insights ─────────────────────────────────────────────────
// Deterministic, template-based, same philosophy as services/insightEngine.js
// (no LLM, no fabrication — silent when a comparison has no valid basis).

function formatPct(n) { return `${n > 0 ? '+' : ''}${round2(n)}%`; }
function formatPeso(n) { return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function generateMonthlyInsights({ salesTrend, topProduct, lowStockCount, outOfStockCount, arTrend }) {
  const insights = [];

  if (salesTrend && salesTrend.deltaPct !== null && Math.abs(salesTrend.deltaPct) >= 5) {
    insights.push(
      `Sales ${salesTrend.direction === 'up' ? 'increased' : 'decreased'} ${formatPct(salesTrend.deltaPct)} vs the previous month (${formatPeso(salesTrend.current)} vs ${formatPeso(salesTrend.previous)}).`
    );
  }
  if (topProduct) {
    insights.push(`${topProduct.name} was the highest-selling product, generating ${formatPeso(topProduct.revenue)} (${topProduct.pctOfSales}% of total sales).`);
  }
  if (outOfStockCount > 0) {
    insights.push(`${outOfStockCount} product${outOfStockCount === 1 ? ' is' : 's are'} currently out of stock.`);
  }
  if (lowStockCount > 0) {
    insights.push(`${lowStockCount} product${lowStockCount === 1 ? ' is' : 's are'} approaching or below ${lowStockCount === 1 ? 'its' : 'their'} reorder level.`);
  }
  if (arTrend && arTrend.deltaPct !== null && Math.abs(arTrend.deltaPct) >= 10) {
    insights.push(`Outstanding AR ${arTrend.direction === 'up' ? 'increased' : 'decreased'} ${formatPct(arTrend.deltaPct)} vs the previous month.`);
  }

  return insights;
}

module.exports = {
  resolveMonthRange,
  previousMonthRange,
  resolveYearRange,
  previousYearRange,
  trend,
  getSalesSummary,
  getDailySalesSeries,
  getMonthlySalesSeries,
  getProductPerformance,
  getStockLevelHealth,
  getVelocityHealth,
  getLowStockReport,
  getInventoryMovement,
  getArSummary,
  getOutstandingInvoices,
  generateMonthlyInsights,
  pgDateToStr,
  toDateStr,
};
