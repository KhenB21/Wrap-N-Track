/* ===========================================================================
   Sales metrics — how the Sales Report counts revenue and profit
   ---------------------------------------------------------------------------
   Revenue is money actually received: every PAID invoice counts on the day it
   was paid (the 70% down payment on its day, the 30% balance on its day). This
   replaces the old rule of "total_cost of Completed orders by order date",
   which ignored payments entirely.

   Profit uses each order's real product costs when every line has one:
     margin = (Σ qty × unit_price − Σ qty × cost_price) / Σ qty × unit_price
   and every peso paid on that order earns that margin. Orders with a product
   line missing its cost fall back to the company target margin (70%) and are
   counted as "estimated", so the report can say how much of profit is real.

   The paid-amount expression mirrors services/orderPayments.js (and
   calculatePaymentSummary() in routes/invoices.js) so "paid" means the same
   thing on the report as it does when an order is confirmed or completed.
   =========================================================================== */

// Company target: profit should be 70% of the selling price (cost = 30%).
const TARGET_PROFIT_MARGIN = 0.7;

// Payment dates are bucketed by the business's local calendar day.
const REPORT_TIME_ZONE = 'Asia/Manila';

const PAID_AMOUNT_SQL = `
  CASE
    WHEN i.amount_paid > 0 THEN i.amount_paid
    WHEN i.invoice_type = 'DOWN_PAYMENT' THEN i.down_payment_amount
    WHEN i.invoice_type = 'REMAINING_BALANCE' THEN GREATEST(i.total_order_amount - i.down_payment_amount, 0)
    ELSE 0
  END`;

/* CTEs shared by every sales query. Expects $1 = start date, $2 = end date
   (YYYY-MM-DD, inclusive) and $3 = target margin (0–1). Exposes:
     payments        — one row per PAID invoice paid in the window
     priced_payments — the same rows plus margin_rate and actual_margin */
const paidSalesCtes = () => `
  payments AS (
    SELECT
      i.id AS invoice_id,
      i.order_id::text AS order_id,
      i.invoice_type,
      (COALESCE(i.paid_at, i.updated_at, i.issued_at, i.created_at) AT TIME ZONE '${REPORT_TIME_ZONE}') AS paid_local,
      ${PAID_AMOUNT_SQL} AS amount
    FROM invoices i
    WHERE i.status = 'PAID'
      AND (COALESCE(i.paid_at, i.updated_at, i.issued_at, i.created_at) AT TIME ZONE '${REPORT_TIME_ZONE}')::date BETWEEN $1 AND $2
  ),
  order_margins AS (
    SELECT
      op.order_id::text AS order_id,
      SUM(op.quantity * COALESCE(op.unit_price, 0)) AS goods_value,
      SUM(op.quantity * op.cost_price) AS goods_cost,
      BOOL_AND(op.cost_price IS NOT NULL AND op.unit_price IS NOT NULL) AS has_all_costs
    FROM all_order_products op
    WHERE op.order_id::text IN (SELECT order_id FROM payments)
    GROUP BY op.order_id
  ),
  priced_payments AS (
    SELECT
      p.*,
      COALESCE(m.has_all_costs AND m.goods_value > 0, false) AS actual_margin,
      CASE
        WHEN m.has_all_costs AND m.goods_value > 0 THEN (m.goods_value - m.goods_cost) / m.goods_value
        ELSE $3::numeric
      END AS margin_rate
    FROM payments p
    LEFT JOIN order_margins m ON m.order_id = p.order_id
  )`;

const toNumber = (value) => Number(value) || 0;
const toPct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

// Revenue and profit received between two dates (inclusive).
async function getPaidSalesTotals(db, startDate, endDate) {
  const { rows } = await db.query(`
    WITH ${paidSalesCtes()}
    SELECT
      COALESCE(SUM(amount), 0) AS revenue,
      COALESCE(SUM(amount * margin_rate), 0) AS profit,
      COALESCE(SUM(amount) FILTER (WHERE actual_margin), 0) AS costed_revenue,
      COALESCE(SUM(amount * margin_rate) FILTER (WHERE actual_margin), 0) AS costed_profit,
      COUNT(DISTINCT order_id) AS paid_orders,
      COUNT(DISTINCT order_id) FILTER (WHERE NOT actual_margin) AS estimated_orders,
      COUNT(*) AS payments
    FROM priced_payments
  `, [startDate, endDate, TARGET_PROFIT_MARGIN]);

  const row = rows[0] || {};
  const revenue = toNumber(row.revenue);
  const profit = toNumber(row.profit);
  const costedRevenue = toNumber(row.costed_revenue);
  const costedProfit = toNumber(row.costed_profit);

  return {
    revenue,
    profit,
    profitMarginPct: toPct(profit, revenue),
    // Margin from orders whose every product has a real cost (null if none).
    actualMarginPct: toPct(costedProfit, costedRevenue),
    paidOrders: toNumber(row.paid_orders),
    estimatedOrders: toNumber(row.estimated_orders),
    payments: toNumber(row.payments),
  };
}

module.exports = {
  TARGET_PROFIT_MARGIN,
  REPORT_TIME_ZONE,
  paidSalesCtes,
  getPaidSalesTotals,
};
