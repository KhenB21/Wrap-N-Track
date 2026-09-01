const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireRole = require('../middleware/requireRole');
const { resolveScope, requireFinancialScope } = require('../middleware/analyticsScope');
const { getReplenishmentSuggestions } = require('../services/replenishment');
const forecastService = require('../services/forecastService');
const { generateInsights } = require('../services/insightEngine');
const logger = require('../utils/logger');

const REVENUE_STATUSES = "('Order Received', 'Completed')";

// ── period helpers ──────────────────────────────────────────────────────────
// toDateStr is for dates WE construct (via Date.UTC/setUTCDate below) to build
// query parameters -- it is UTC-safe for those because we built them in UTC.
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// pgDateToStr is for dates that CAME BACK from a query. node-pg parses a DATE
// column into a JS Date at LOCAL midnight, not UTC midnight -- calling
// toDateStr (toISOString) on that silently shifts the calendar date backward by
// one day whenever the server's local timezone is ahead of UTC (verified: this
// dev machine is UTC+8, '2026-07-24'::date round-trips to a Date whose
// toISOString() reads "2026-07-23..."). Read the calendar date back out with the
// LOCAL getters instead, which is what node-pg used to construct it.
function pgDateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function resolvePeriod(period) {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let start;
  switch (period) {
    case '7d': start = addDays(end, -6); break;
    case '90d': start = addDays(end, -89); break;
    case 'mtd': start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)); break;
    case 'ytd': start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1)); break;
    case '30d':
    default: start = addDays(end, -29); break;
  }
  return { start, end };
}

function previousPeriodBounds(start, end, compare) {
  if (compare === 'year') {
    const prevStart = new Date(start);
    prevStart.setUTCFullYear(prevStart.getUTCFullYear() - 1);
    const prevEnd = new Date(end);
    prevEnd.setUTCFullYear(prevEnd.getUTCFullYear() - 1);
    return { start: prevStart, end: prevEnd };
  }
  const lengthDays = Math.round((end - start) / 86400000) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(lengthDays - 1));
  return { start: prevStart, end: prevEnd };
}

// {value, previousValue, delta, deltaPct, direction} per the analytics API contract.
// deltaPct is null (not Infinity) when the previous period had a zero base.
function trend(value, previousValue) {
  const v = Number(value) || 0;
  const pv = Number(previousValue) || 0;
  const delta = v - pv;
  const deltaPct = pv !== 0 ? (delta / pv) * 100 : null;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return { value: v, previousValue: pv, delta, deltaPct, direction };
}

// ── Part A: analytics endpoints ─────────────────────────────────────────────

// GET /api/analytics/kpis?period=&compare=
router.get('/kpis', requireFinancialScope(), async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const compare = req.query.compare === 'year' ? 'year' : 'previous';
    const { start, end } = resolvePeriod(period);
    const { start: prevStart, end: prevEnd } = previousPeriodBounds(start, end, compare);
    const s = toDateStr(start), e = toDateStr(end);
    const ps = toDateStr(prevStart), pe = toDateStr(prevEnd);

    const aggQuery = `
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
        (SELECT COUNT(*) FROM period_orders) AS orders_all,
        (SELECT COUNT(*) FROM period_orders WHERE status IN ${REVENUE_STATUSES}) AS orders_revenue,
        (SELECT COUNT(*) FROM period_orders WHERE status = 'Cancelled') AS orders_cancelled,
        COALESCE((SELECT SUM(total_cost) FROM period_orders WHERE status IN ${REVENUE_STATUSES}), 0) AS revenue,
        COALESCE((SELECT SUM(quantity * (unit_price - cost_price)) FROM lines WHERE cost_price IS NOT NULL), 0) AS gross_margin,
        (SELECT COUNT(*) FROM lines) AS line_count,
        (SELECT COUNT(*) FROM lines WHERE cost_price IS NULL) AS lines_missing_cost
    `;
    const arQuery = `
      SELECT COALESCE(SUM(amount_due - amount_paid), 0) AS outstanding
      FROM invoices
      WHERE status <> 'CANCELLED' AND issued_at::date BETWEEN $1 AND $2
    `;
    const dailySeriesQuery = `
      WITH days AS (
        SELECT generate_series($1::date, $2::date, interval '1 day')::date AS d
      ),
      daily AS (
        SELECT o.order_date::date AS d,
          COUNT(*) AS orders_all,
          COUNT(*) FILTER (WHERE o.status IN ${REVENUE_STATUSES}) AS orders_revenue,
          COALESCE(SUM(o.total_cost) FILTER (WHERE o.status IN ${REVENUE_STATUSES}), 0) AS revenue,
          COUNT(*) FILTER (WHERE o.status = 'Cancelled') AS cancelled
        FROM all_orders o
        WHERE o.order_date::date BETWEEN $1 AND $2
        GROUP BY o.order_date::date
      )
      SELECT days.d, COALESCE(daily.orders_all, 0) AS orders_all, COALESCE(daily.orders_revenue, 0) AS orders_revenue,
             COALESCE(daily.revenue, 0) AS revenue, COALESCE(daily.cancelled, 0) AS cancelled
      FROM days LEFT JOIN daily ON daily.d = days.d
      ORDER BY days.d
    `;
    const dailyMarginQuery = `
      WITH days AS (
        SELECT generate_series($1::date, $2::date, interval '1 day')::date AS d
      ),
      daily AS (
        SELECT o.order_date::date AS d,
          COALESCE(SUM(op.quantity * (op.unit_price - op.cost_price)) FILTER (WHERE op.cost_price IS NOT NULL), 0) AS margin
        FROM all_orders o
        JOIN all_order_products op ON op.order_id = o.order_id
        WHERE o.order_date::date BETWEEN $1 AND $2 AND o.status IN ${REVENUE_STATUSES}
        GROUP BY o.order_date::date
      )
      SELECT days.d, COALESCE(daily.margin, 0) AS margin
      FROM days LEFT JOIN daily ON daily.d = days.d
      ORDER BY days.d
    `;
    const dailyArQuery = `
      WITH days AS (
        SELECT generate_series($1::date, $2::date, interval '1 day')::date AS d
      ),
      daily AS (
        SELECT issued_at::date AS d, COALESCE(SUM(amount_due - amount_paid), 0) AS ar
        FROM invoices
        WHERE status <> 'CANCELLED' AND issued_at::date BETWEEN $1 AND $2
        GROUP BY issued_at::date
      )
      SELECT days.d, COALESCE(daily.ar, 0) AS ar
      FROM days LEFT JOIN daily ON daily.d = days.d
      ORDER BY days.d
    `;

    const [curAggR, prevAggR, curArR, prevArR, dailyR, dailyMarginR, dailyArR] = await Promise.all([
      pool.query(aggQuery, [s, e]),
      pool.query(aggQuery, [ps, pe]),
      pool.query(arQuery, [s, e]),
      pool.query(arQuery, [ps, pe]),
      pool.query(dailySeriesQuery, [s, e]),
      pool.query(dailyMarginQuery, [s, e]),
      pool.query(dailyArQuery, [s, e])
    ]);

    const cur = curAggR.rows[0];
    const prev = prevAggR.rows[0];

    const revenue = trend(cur.revenue, prev.revenue);
    revenue.sparkline = dailyR.rows.map(r => Number(r.revenue));

    const orders = trend(cur.orders_all, prev.orders_all);
    orders.sparkline = dailyR.rows.map(r => Number(r.orders_all));

    const curAov = cur.orders_revenue > 0 ? Number(cur.revenue) / Number(cur.orders_revenue) : 0;
    const prevAov = prev.orders_revenue > 0 ? Number(prev.revenue) / Number(prev.orders_revenue) : 0;
    const aov = trend(curAov, prevAov);
    aov.sparkline = dailyR.rows.map(r => Number(r.orders_revenue) > 0 ? Number(r.revenue) / Number(r.orders_revenue) : 0);

    const grossMargin = trend(cur.gross_margin, prev.gross_margin);
    grossMargin.sparkline = dailyMarginR.rows.map(r => Number(r.margin));

    const curCancelRate = cur.orders_all > 0 ? (Number(cur.orders_cancelled) / Number(cur.orders_all)) * 100 : 0;
    const prevCancelRate = prev.orders_all > 0 ? (Number(prev.orders_cancelled) / Number(prev.orders_all)) * 100 : 0;
    const cancellationRate = trend(curCancelRate, prevCancelRate);
    cancellationRate.sparkline = dailyR.rows.map(r => Number(r.orders_all) > 0 ? (Number(r.cancelled) / Number(r.orders_all)) * 100 : 0);

    const outstandingAr = trend(curArR.rows[0].outstanding, prevArR.rows[0].outstanding);
    outstandingAr.sparkline = dailyArR.rows.map(r => Number(r.ar));

    res.json({
      success: true,
      scope: 'financial',
      data: {
        revenue,
        orders,
        aov,
        grossMargin,
        cancellationRate,
        outstandingAr,
        marginCoverage: { lineCount: Number(cur.line_count), linesMissingCost: Number(cur.lines_missing_cost) },
        period: { start: s, end: e, compare, previousStart: ps, previousEnd: pe }
      }
    });
  } catch (error) {
    logger.error('analytics_kpis_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch KPIs' });
  }
});

// GET /api/analytics/timeseries?metric=&period=&granularity=
router.get('/timeseries', requireFinancialScope(), async (req, res) => {
  try {
    const metric = req.query.metric || 'revenue';
    const granularity = req.query.granularity || 'day';
    const period = req.query.period || '30d';
    const allowedMetrics = ['revenue', 'orders', 'units', 'margin'];
    const allowedGranularity = ['day', 'week', 'month'];
    if (!allowedMetrics.includes(metric)) {
      return res.status(400).json({ success: false, message: 'Invalid metric' });
    }
    if (!allowedGranularity.includes(granularity)) {
      return res.status(400).json({ success: false, message: 'Invalid granularity' });
    }

    const { start, end } = resolvePeriod(period);
    const s = toDateStr(start), e = toDateStr(end);
    const bucketInterval = granularity === 'day' ? '1 day' : granularity === 'week' ? '1 week' : '1 month';

    let valueExpr;
    let joinLines = false;
    switch (metric) {
      case 'revenue':
        valueExpr = `COALESCE(SUM(o.total_cost) FILTER (WHERE o.status IN ${REVENUE_STATUSES}), 0)`;
        break;
      case 'orders':
        valueExpr = `COUNT(*)`;
        break;
      case 'units':
        valueExpr = `COALESCE(SUM(op.quantity) FILTER (WHERE o.status IN ${REVENUE_STATUSES}), 0)`;
        joinLines = true;
        break;
      case 'margin':
        valueExpr = `COALESCE(SUM(op.quantity * (op.unit_price - op.cost_price)) FILTER (WHERE o.status IN ${REVENUE_STATUSES} AND op.cost_price IS NOT NULL), 0)`;
        joinLines = true;
        break;
    }

    // metric/granularity are whitelist-validated above, not user-supplied SQL fragments.
    const query = `
      WITH buckets AS (
        SELECT generate_series(date_trunc('${granularity}', $1::date), date_trunc('${granularity}', $2::date), interval '${bucketInterval}') AS bucket
      ),
      data AS (
        SELECT date_trunc('${granularity}', o.order_date) AS bucket, ${valueExpr} AS value
        FROM all_orders o
        ${joinLines ? 'LEFT JOIN all_order_products op ON op.order_id = o.order_id' : ''}
        WHERE o.order_date::date BETWEEN $1 AND $2
        GROUP BY date_trunc('${granularity}', o.order_date)
      )
      SELECT buckets.bucket, COALESCE(data.value, 0) AS value
      FROM buckets LEFT JOIN data ON data.bucket = buckets.bucket
      ORDER BY buckets.bucket
    `;
    const result = await pool.query(query, [s, e]);

    res.json({
      success: true,
      scope: 'financial',
      data: {
        metric,
        granularity,
        period: { start: s, end: e },
        series: result.rows.map(r => ({ bucket: r.bucket, value: Number(r.value) }))
      }
    });
  } catch (error) {
    logger.error('analytics_timeseries_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch timeseries' });
  }
});

// GET /api/analytics/breakdown?dimension=&period=
router.get('/breakdown', requireFinancialScope(), async (req, res) => {
  try {
    const dimension = req.query.dimension || 'category';
    const period = req.query.period || '30d';
    const allowed = ['category', 'product', 'customer', 'region', 'payment_method', 'status'];
    if (!allowed.includes(dimension)) {
      return res.status(400).json({ success: false, message: 'Invalid dimension' });
    }
    const { start, end } = resolvePeriod(period);
    const s = toDateStr(start), e = toDateStr(end);

    let query;
    switch (dimension) {
      case 'category':
        query = `
          SELECT COALESCE(i.category, 'Uncategorized') AS key, COALESCE(i.category, 'Uncategorized') AS label,
            SUM(op.quantity * op.unit_price) AS value
          FROM all_order_products op
          JOIN all_orders o ON o.order_id = op.order_id
          JOIN inventory_items i ON i.sku = op.sku
          WHERE o.order_date::date BETWEEN $1 AND $2 AND o.status IN ${REVENUE_STATUSES}
          GROUP BY COALESCE(i.category, 'Uncategorized')
        `;
        break;
      case 'product':
        query = `
          SELECT op.sku AS key, COALESCE(i.name, op.sku) AS label, SUM(op.quantity * op.unit_price) AS value
          FROM all_order_products op
          JOIN all_orders o ON o.order_id = op.order_id
          LEFT JOIN inventory_items i ON i.sku = op.sku
          WHERE o.order_date::date BETWEEN $1 AND $2 AND o.status IN ${REVENUE_STATUSES}
          GROUP BY op.sku, i.name
        `;
        break;
      case 'customer':
        query = `
          SELECT COALESCE(o.customer_id::text, lower(trim(o.name))) AS key, MAX(o.name) AS label, SUM(o.total_cost) AS value
          FROM all_orders o
          WHERE o.order_date::date BETWEEN $1 AND $2 AND o.status IN ${REVENUE_STATUSES}
          GROUP BY COALESCE(o.customer_id::text, lower(trim(o.name)))
        `;
        break;
      case 'region':
        query = `
          SELECT COALESCE(cd.region, 'Unknown') AS key, COALESCE(cd.region, 'Unknown') AS label, SUM(o.total_cost) AS value
          FROM all_orders o
          LEFT JOIN customer_details cd ON cd.customer_id = o.customer_id
          WHERE o.order_date::date BETWEEN $1 AND $2 AND o.status IN ${REVENUE_STATUSES}
          GROUP BY COALESCE(cd.region, 'Unknown')
        `;
        break;
      case 'payment_method':
        query = `
          SELECT COALESCE(o.payment_method, 'Unknown') AS key, COALESCE(o.payment_method, 'Unknown') AS label, SUM(o.total_cost) AS value
          FROM all_orders o
          WHERE o.order_date::date BETWEEN $1 AND $2
          GROUP BY COALESCE(o.payment_method, 'Unknown')
        `;
        break;
      case 'status':
        query = `
          SELECT o.status AS key, o.status AS label, SUM(o.total_cost) AS value
          FROM all_orders o
          WHERE o.order_date::date BETWEEN $1 AND $2
          GROUP BY o.status
        `;
        break;
    }

    const result = await pool.query(query, [s, e]);
    const rows = result.rows
      .map(r => ({ key: r.key, label: r.label, value: Number(r.value) || 0 }))
      .sort((a, b) => b.value - a.value);
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    const data = rows.map((r, idx) => ({
      ...r,
      sharePct: total > 0 ? (r.value / total) * 100 : 0,
      rank: idx + 1
    }));

    res.json({ success: true, scope: 'financial', data });
  } catch (error) {
    logger.error('analytics_breakdown_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch breakdown' });
  }
});

// GET /api/analytics/operations?period=&stalledDays=
router.get('/operations', async (req, res) => {
  try {
    const scope = resolveScope(req);
    const stalledThresholdDays = Math.max(1, parseInt(req.query.stalledDays, 10) || 3);

    const [stageAgesR, stalledR, cycleTimesR, onTimeR] = await Promise.all([
      pool.query(`
        SELECT status,
          COUNT(*) AS order_count,
          MIN(EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, order_placed_at))) / 86400) AS min_age_days,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, order_placed_at))) / 86400) AS median_age_days,
          MAX(EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, order_placed_at))) / 86400) AS max_age_days
        FROM orders
        WHERE status NOT IN ('Completed', 'Cancelled')
        GROUP BY status
      `),
      pool.query(`
        SELECT order_id, status, name AS customer_name,
          ROUND((EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, order_placed_at))) / 86400)::numeric, 1) AS age_days
        FROM orders
        WHERE status NOT IN ('Completed', 'Cancelled')
          AND COALESCE(status_updated_at, order_placed_at) <= NOW() - ($1::int * INTERVAL '1 day')
        ORDER BY age_days DESC
        LIMIT 50
      `, [stalledThresholdDays]),
      pool.query(`
        WITH transitions AS (
          SELECT order_id, old_status, new_status, updated_at,
            updated_at - LAG(updated_at) OVER (PARTITION BY order_id ORDER BY updated_at) AS duration
          FROM order_status_history
        )
        SELECT old_status, new_status,
          COUNT(*) AS transition_count,
          ROUND((AVG(EXTRACT(EPOCH FROM duration)) / 3600.0)::numeric, 1) AS avg_hours
        FROM transitions
        WHERE duration IS NOT NULL
        GROUP BY old_status, new_status
        ORDER BY transition_count DESC
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE delivered_at IS NOT NULL AND expected_delivery IS NOT NULL) AS denominator,
          COUNT(*) FILTER (WHERE delivered_at IS NOT NULL AND expected_delivery IS NOT NULL AND delivered_at::date <= expected_delivery) AS on_time_count
        FROM all_orders
      `)
    ]);

    const onTimeRow = onTimeR.rows[0];
    const denominator = Number(onTimeRow.denominator);
    const onTimePct = denominator > 0 ? (Number(onTimeRow.on_time_count) / denominator) * 100 : null;

    const data = {
      stageAges: stageAgesR.rows.map(r => ({
        status: r.status,
        orderCount: Number(r.order_count),
        minAgeDays: Number(r.min_age_days),
        medianAgeDays: Number(r.median_age_days),
        maxAgeDays: Number(r.max_age_days)
      })),
      stalledOrders: stalledR.rows.map(r => ({
        orderId: r.order_id,
        status: r.status,
        customerName: r.customer_name,
        ageDays: Number(r.age_days)
      })),
      stalledThresholdDays,
      cycleTimes: cycleTimesR.rows.map(r => ({
        from: r.old_status,
        to: r.new_status,
        transitionCount: Number(r.transition_count),
        avgHours: Number(r.avg_hours)
      })),
      onTimeDelivery: { pct: onTimePct, onTimeCount: Number(onTimeRow.on_time_count), denominator }
    };

    res.json({ success: true, scope, data });
  } catch (error) {
    logger.error('analytics_operations_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch operations data' });
  }
});

// GET /api/analytics/payments?period=
router.get('/payments', requireFinancialScope(), async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const { start, end } = resolvePeriod(period);
    const s = toDateStr(start), e = toDateStr(end);

    const [summaryR, lagR, methodMixR, unverifiedR] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(amount_paid), 0) AS paid,
          COALESCE(SUM(amount_due - amount_paid), 0) AS outstanding
        FROM invoices
        WHERE status <> 'CANCELLED' AND issued_at::date BETWEEN $1 AND $2
      `, [s, e]),
      pool.query(`
        SELECT
          AVG(EXTRACT(EPOCH FROM (paid_at - issued_at))) / 86400.0 AS avg_days,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (paid_at - issued_at))) / 86400.0 AS median_days
        FROM invoices
        WHERE status = 'PAID' AND paid_at IS NOT NULL AND issued_at IS NOT NULL
          AND issued_at::date BETWEEN $1 AND $2
      `, [s, e]),
      pool.query(`
        SELECT COALESCE(payment_method, 'Unknown') AS method, COUNT(*) AS invoice_count, COALESCE(SUM(amount_paid), 0) AS amount
        FROM invoices
        WHERE issued_at::date BETWEEN $1 AND $2 AND status <> 'CANCELLED'
        GROUP BY COALESCE(payment_method, 'Unknown')
        ORDER BY amount DESC
      `, [s, e]),
      // "Unverified" = a payment proof was uploaded but staff hasn't marked the
      // invoice PAID yet. due_date is empty across the table (Phase 1 landmine 4),
      // so this deliberately does not touch it.
      pool.query(`
        SELECT invoice_number, order_id, payment_proof_uploaded_at,
          ROUND((EXTRACT(EPOCH FROM (NOW() - payment_proof_uploaded_at)) / 86400)::numeric, 1) AS age_days
        FROM invoices
        WHERE payment_proof_path IS NOT NULL AND status NOT IN ('PAID', 'CANCELLED')
        ORDER BY payment_proof_uploaded_at ASC
        LIMIT 100
      `)
    ]);

    const summary = summaryR.rows[0];
    const lag = lagR.rows[0];

    res.json({
      success: true,
      scope: 'financial',
      data: {
        paid: Number(summary.paid),
        outstanding: Number(summary.outstanding),
        collectionLag: {
          avgDays: lag.avg_days !== null ? Number(lag.avg_days) : null,
          medianDays: lag.median_days !== null ? Number(lag.median_days) : null
        },
        paymentMethodMix: methodMixR.rows.map(r => ({
          method: r.method, invoiceCount: Number(r.invoice_count), amount: Number(r.amount)
        })),
        unverifiedProofQueue: unverifiedR.rows.map(r => ({
          invoiceNumber: r.invoice_number, orderId: r.order_id,
          uploadedAt: r.payment_proof_uploaded_at, ageDays: Number(r.age_days)
        }))
      }
    });
  } catch (error) {
    logger.error('analytics_payments_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch payments data' });
  }
});

// GET /api/analytics/inventory-health
router.get('/inventory-health', async (req, res) => {
  try {
    const scope = resolveScope(req);
    const days = 90;

    const result = await pool.query(`
      WITH sales AS (
        SELECT op.sku, SUM(op.quantity) AS qty_sold
        FROM all_order_products op
        JOIN all_orders o ON o.order_id = op.order_id
        WHERE o.status IN ${REVENUE_STATUSES}
          AND o.order_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
        GROUP BY op.sku
      ),
      items AS (
        SELECT i.sku, i.quantity, i.unit_price, i.reorder_level,
          COALESCE(s.qty_sold, 0) AS qty_sold,
          (i.quantity * i.unit_price) AS stock_value,
          (COALESCE(s.qty_sold, 0)::numeric / $1::numeric) AS daily_velocity
        FROM inventory_items i
        LEFT JOIN sales s ON s.sku = i.sku
        WHERE i.is_active = true
      )
      SELECT
        COALESCE(SUM(stock_value), 0) AS stock_value,
        COUNT(*) FILTER (WHERE quantity <= COALESCE(reorder_level, CEIL(quantity * 0.2))) AS low_stock_count,
        COUNT(*) FILTER (WHERE quantity = 0) AS out_of_stock_count,
        COALESCE(SUM(stock_value) FILTER (WHERE qty_sold = 0), 0) AS dead_stock_value,
        (COALESCE(SUM(qty_sold), 0)::numeric / NULLIF(SUM(quantity), 0)) AS turnover,
        COUNT(*) FILTER (WHERE daily_velocity > 0 AND (quantity / NULLIF(daily_velocity, 0)) < 7) AS dos_under_7,
        COUNT(*) FILTER (WHERE daily_velocity > 0 AND (quantity / NULLIF(daily_velocity, 0)) BETWEEN 7 AND 30) AS dos_7_30,
        COUNT(*) FILTER (WHERE daily_velocity > 0 AND (quantity / NULLIF(daily_velocity, 0)) BETWEEN 30 AND 90) AS dos_30_90,
        COUNT(*) FILTER (WHERE daily_velocity = 0 OR (quantity / NULLIF(daily_velocity, 0)) > 90) AS dos_over_90
      FROM items
    `, [days]);

    const r = result.rows[0];
    const data = {
      stockValue: Number(r.stock_value),
      lowStockCount: Number(r.low_stock_count),
      outOfStockCount: Number(r.out_of_stock_count),
      deadStockValue: Number(r.dead_stock_value),
      turnover: r.turnover !== null ? Number(r.turnover) : null,
      daysOfSupplyDistribution: {
        under7: Number(r.dos_under_7),
        d7to30: Number(r.dos_7_30),
        d30to90: Number(r.dos_30_90),
        over90: Number(r.dos_over_90)
      }
    };

    if (scope === 'operational') {
      delete data.stockValue;
      delete data.deadStockValue;
    }

    res.json({ success: true, scope, data });
  } catch (error) {
    logger.error('analytics_inventory_health_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch inventory health' });
  }
});

// GET /api/analytics/inventory-operations
// Backs the employee Operations dashboard: replenishment KPIs, a monthly
// units-received trend, an inventory-health distribution, the list of SKUs
// needing replenishment, and current-stock-vs-reorder-point for the most
// at-risk SKUs. Reuses the same reorder-point formula as the work queue /
// replenishment-suggestions endpoints (services/replenishment.js) so the
// numbers agree everywhere they're shown.
router.get('/inventory-operations', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 90);
    const suggestions = await getReplenishmentSuggestions(pool, days);

    const lowStockSkus = suggestions.filter(r => r.reorder_status === 'Reorder Recommended' || r.reorder_status === 'Approaching Reorder Point').length;
    const stockoutCount = suggestions.filter(r => r.reorder_status === 'Out of Stock').length;
    const dosValues = suggestions.map(r => Number(r.days_of_supply)).filter(v => Number.isFinite(v));
    const avgDaysOfSupply = dosValues.length ? dosValues.reduce((a, b) => a + b, 0) / dosValues.length : null;
    const restockCost = suggestions
      .filter(r => r.needs_reorder)
      .reduce((sum, r) => sum + Number(r.suggested_reorder_quantity || 0) * Number(r.unit_price || 0), 0);

    const [unitsReceivedR, monthlyReceivedR] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(quantity), 0) AS units_received
        FROM stock_movements
        WHERE movement_type = 'STOCK_IN' AND created_at >= NOW() - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT DATE_TRUNC('month', created_at) AS month, SUM(quantity) AS units_received
        FROM stock_movements
        WHERE movement_type = 'STOCK_IN' AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `),
    ]);

    const healthDistribution = {
      stockout: stockoutCount,
      criticalLow: suggestions.filter(r => r.reorder_status === 'Reorder Recommended').length,
      approaching: suggestions.filter(r => r.reorder_status === 'Approaching Reorder Point').length,
      healthy: suggestions.filter(r => r.reorder_status === 'Healthy').length,
    };

    const replenishment = suggestions
      .filter(r => r.needs_reorder)
      .slice(0, 25)
      .map(r => ({
        sku: r.sku,
        category: r.category,
        name: r.name,
        currentStock: Number(r.on_hand_stock),
        reorderPoint: Number(r.reorder_point),
        reorderQuantity: Number(r.suggested_reorder_quantity),
        status: r.reorder_status,
      }));

    const stockVsReorder = [...suggestions]
      .sort((a, b) => Number(a.available_stock) - Number(b.available_stock))
      .slice(0, 8)
      .map(r => ({
        sku: r.sku,
        name: r.name,
        currentStock: Number(r.on_hand_stock),
        reorderPoint: Number(r.reorder_point),
      }));

    res.json({
      success: true,
      data: {
        kpis: {
          lowStockSkus,
          stockoutCount,
          avgDaysOfSupply,
          unitsReceived30d: Number(unitsReceivedR.rows[0].units_received),
          restockCost,
        },
        monthlyUnitsReceived: monthlyReceivedR.rows.map(r => ({ month: r.month, unitsReceived: Number(r.units_received) })),
        healthDistribution,
        replenishment,
        stockVsReorder,
      },
    });
  } catch (error) {
    logger.error('analytics_inventory_operations_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch inventory operations data' });
  }
});

// GET /api/analytics/supplier-operations
// Backs the employee Supplier dashboard: lead-time/DIO/stockout-risk KPIs,
// a monthly stockout-events trend (from stock_movements, the only table with
// real history — there's no daily inventory snapshot to derive a historical
// stockout-rate % from), inventory value by category (this schema has no
// warehouse/location concept, so that substitutes for "by warehouse"), and a
// per-supplier scorecard used for both the table and the risk-matrix scatter.
router.get('/supplier-operations', async (req, res) => {
  try {
    const [kpiR, monthlyStockoutR, categoryR, scorecardR] = await Promise.all([
      pool.query(`
        WITH active_items AS (
          SELECT i.sku, i.quantity, i.unit_price, i.cost_price, i.reorder_level, i.supplier_id,
            COALESCE(i.lead_time_days, s.lead_time_days, 7) AS effective_lead_time
          FROM inventory_items i
          LEFT JOIN suppliers s ON s.supplier_id = i.supplier_id
          WHERE i.is_active = true
        ),
        cogs AS (
          SELECT SUM(op.quantity * COALESCE(i.cost_price, i.unit_price)) AS total_cogs_90d
          FROM all_order_products op
          JOIN all_orders o ON o.order_id = op.order_id
          JOIN inventory_items i ON i.sku = op.sku
          WHERE o.status IN ('Order Received', 'Completed')
            AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
        ),
        by_supplier_value AS (
          SELECT supplier_id, SUM(quantity * unit_price) AS supplier_stock_value
          FROM active_items
          WHERE supplier_id IS NOT NULL
          GROUP BY supplier_id
        )
        SELECT
          (SELECT AVG(effective_lead_time) FROM active_items) AS avg_lead_time,
          (SELECT SUM(quantity * COALESCE(cost_price, unit_price)) FROM active_items) AS total_stock_value,
          (SELECT total_cogs_90d FROM cogs) AS total_cogs_90d,
          (SELECT COUNT(DISTINCT supplier_id) FROM active_items WHERE supplier_id IS NOT NULL) AS active_suppliers,
          (SELECT COUNT(*) FROM active_items) AS total_active_skus,
          (SELECT COUNT(*) FROM active_items WHERE quantity <= COALESCE(reorder_level, CEIL(quantity * 0.2))) AS at_risk_skus,
          (SELECT COALESCE(MAX(supplier_stock_value), 0) - COALESCE(MIN(supplier_stock_value), 0) FROM by_supplier_value) AS stock_value_spread
      `),
      pool.query(`
        SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS stockout_events
        FROM stock_movements
        WHERE movement_type = 'STOCK_OUT' AND new_quantity = 0 AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `),
      pool.query(`
        SELECT COALESCE(category, 'Uncategorized') AS category, SUM(quantity * unit_price) AS total_value
        FROM inventory_items
        WHERE is_active = true
        GROUP BY COALESCE(category, 'Uncategorized')
        ORDER BY total_value DESC
        LIMIT 6
      `),
      pool.query(`
        SELECT
          s.supplier_id,
          s.name AS supplier_name,
          COUNT(i.sku) AS skus_supplied,
          AVG(COALESCE(i.lead_time_days, s.lead_time_days, 7)) AS avg_lead_time,
          SUM(i.quantity * i.unit_price) AS inventory_value,
          COUNT(i.sku) FILTER (WHERE i.quantity <= COALESCE(i.reorder_level, CEIL(i.quantity * 0.2))) AS at_risk_count
        FROM suppliers s
        JOIN inventory_items i ON i.supplier_id = s.supplier_id AND i.is_active = true
        GROUP BY s.supplier_id, s.name
        HAVING COUNT(i.sku) > 0
        ORDER BY inventory_value DESC
      `),
    ]);

    const k = kpiR.rows[0];
    const dio = k.total_cogs_90d > 0 ? (Number(k.total_stock_value) / Number(k.total_cogs_90d)) * 90 : null;
    const stockoutRiskPct = k.total_active_skus > 0 ? (Number(k.at_risk_skus) / Number(k.total_active_skus)) * 100 : 0;

    const scorecard = scorecardR.rows.map(r => ({
      supplierId: `SUP-${String(r.supplier_id).padStart(2, '0')}`,
      supplierName: r.supplier_name,
      avgLeadTime: Math.round(Number(r.avg_lead_time)),
      skusSupplied: Number(r.skus_supplied),
      stockoutRate: Number(r.skus_supplied) > 0 ? (Number(r.at_risk_count) / Number(r.skus_supplied)) * 100 : 0,
      inventoryValue: Number(r.inventory_value),
    }));

    res.json({
      success: true,
      data: {
        kpis: {
          avgLeadTimeDays: k.avg_lead_time != null ? Number(k.avg_lead_time) : null,
          dio,
          activeSuppliers: Number(k.active_suppliers),
          stockoutRiskPct,
          stockValueSpread: Number(k.stock_value_spread),
        },
        monthlyStockoutEvents: monthlyStockoutR.rows.map(r => ({ month: r.month, count: Number(r.stockout_events) })),
        categoryValue: categoryR.rows.map(r => ({ category: r.category, value: Number(r.total_value) })),
        scorecard,
      },
    });
  } catch (error) {
    logger.error('analytics_supplier_operations_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch supplier operations data' });
  }
});

// GET /api/analytics/work-queue
router.get('/work-queue', async (req, res) => {
  try {
    const scope = resolveScope(req);

    const [toPackR, toDispatchR, proofsR, replenishment] = await Promise.all([
      pool.query(`
        SELECT order_id, name AS customer_name,
          ROUND((EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, order_placed_at))) / 86400)::numeric, 1) AS age_days
        FROM orders
        WHERE status = 'To Be Packed'
        ORDER BY COALESCE(status_updated_at, order_placed_at) ASC NULLS LAST
        LIMIT 50
      `),
      pool.query(`
        SELECT order_id, name AS customer_name,
          ROUND((EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, order_placed_at))) / 86400)::numeric, 1) AS age_days
        FROM orders
        WHERE status = 'Ready for Delivery'
        ORDER BY COALESCE(status_updated_at, order_placed_at) ASC NULLS LAST
        LIMIT 50
      `),
      pool.query(`
        SELECT invoice_number, order_id,
          ROUND((EXTRACT(EPOCH FROM (NOW() - payment_proof_uploaded_at)) / 86400)::numeric, 1) AS age_days
        FROM invoices
        WHERE payment_proof_path IS NOT NULL AND status NOT IN ('PAID', 'CANCELLED')
        ORDER BY payment_proof_uploaded_at ASC
        LIMIT 50
      `),
      getReplenishmentSuggestions(pool, 90)
    ]);

    const data = [
      ...toPackR.rows.map(r => ({
        type: 'pack_order', id: r.order_id, label: `Pack order ${r.order_id} (${r.customer_name})`,
        ageDays: Number(r.age_days), severity: Number(r.age_days) > 2 ? 'high' : 'normal', link: `/orders/${r.order_id}`
      })),
      ...toDispatchR.rows.map(r => ({
        type: 'dispatch_delivery', id: r.order_id, label: `Dispatch order ${r.order_id} (${r.customer_name})`,
        ageDays: Number(r.age_days), severity: Number(r.age_days) > 2 ? 'high' : 'normal', link: `/orders/${r.order_id}`
      })),
      ...proofsR.rows.map(r => ({
        type: 'verify_proof', id: r.invoice_number, label: `Verify payment proof ${r.invoice_number}`,
        ageDays: Number(r.age_days), severity: Number(r.age_days) > 1 ? 'high' : 'normal', link: `/invoices/${r.invoice_number}`
      })),
      ...replenishment.filter(r => r.needs_reorder).map(r => ({
        type: 'reorder_sku', id: r.sku, label: `Reorder ${r.name}`,
        ageDays: null, severity: r.reorder_status === 'Out of Stock' ? 'high' : 'normal', link: `/inventory/${r.sku}`
      }))
    ];

    res.json({ success: true, scope, data });
  } catch (error) {
    logger.error('analytics_work_queue_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch work queue' });
  }
});

// ── Part C: statistical forecasting ─────────────────────────────────────────
// No ML -- see services/forecastService.js for why. Routes here only fetch data
// and hand plain arrays to the pure functions there; all the maths lives there so
// it can be unit-tested without a database (scripts/test_forecastService.js).
//
// Computed on request and memoised in-process for 15 minutes per parameter set --
// at this data volume (~2,556 orders) a nightly precompute job is unnecessary
// overhead. If that stops being true, scripts/scheduler.js is the existing
// interval-based hook to precompute and warm these caches from.
//
// What these forecasts cannot do (see services/forecastService.js for the fuller
// version of this): no annual seasonality (needs 2+ years, this system has 18
// months), the linear trend cannot see a shock coming, and both endpoints run on
// seeded demonstration history, so a good backtest number demonstrates the method
// is sound, not real-world accuracy.

const FORECAST_TTL_MS = 15 * 60 * 1000;
const FORECAST_REVENUE_WINDOW_DAYS = 180;

const revenueForecastCache = new Map(); // key: horizon -> { at, payload }

// GET /api/analytics/forecast/revenue?horizon=7|30 — financial
router.get('/forecast/revenue', requireFinancialScope(), async (req, res) => {
  try {
    const horizon = [7, 30].includes(parseInt(req.query.horizon, 10)) ? parseInt(req.query.horizon, 10) : 30;

    const cached = revenueForecastCache.get(horizon);
    if (cached && Date.now() - cached.at < FORECAST_TTL_MS) {
      return res.json({ success: true, scope: 'financial', data: cached.payload, cached: true });
    }

    const end = new Date();
    const endStr = toDateStr(end);
    const startStr = toDateStr(addDays(end, -(FORECAST_REVENUE_WINDOW_DAYS - 1)));

    // Zero-filled daily revenue over the trailing window, same pattern as /kpis and
    // /timeseries. Revenue counts the same statuses as everywhere else in this API.
    const dailyR = await pool.query(`
      WITH days AS (
        SELECT generate_series($1::date, $2::date, interval '1 day')::date AS d
      ),
      daily AS (
        SELECT order_date::date AS d, COALESCE(SUM(total_cost) FILTER (WHERE status IN ${REVENUE_STATUSES}), 0) AS revenue
        FROM all_orders
        WHERE order_date::date BETWEEN $1 AND $2
        GROUP BY order_date::date
      )
      SELECT days.d, COALESCE(daily.revenue, 0) AS revenue
      FROM days LEFT JOIN daily ON daily.d = days.d
      ORDER BY days.d
    `, [startStr, endStr]);

    const dates = dailyR.rows.map(r => pgDateToStr(r.d));
    const values = dailyR.rows.map(r => Number(r.revenue));

    const payload = forecastService.forecastRevenueSeries({
      dates, values, horizon, windowDays: FORECAST_REVENUE_WINDOW_DAYS
    });
    revenueForecastCache.set(horizon, { at: Date.now(), payload });

    res.json({ success: true, scope: 'financial', data: payload, cached: false });
  } catch (error) {
    logger.error('analytics_forecast_revenue_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch revenue forecast' });
  }
});

const DEMAND_MIN_HISTORY_SALES_DAYS = 30;
const DEMAND_MIN_TREND_VOLUME = 5;

let demandForecastCache = { at: 0, payload: null }; // single entry -- endpoint takes no params

// Builds the full (unstripped) per-SKU demand forecast. Currency fields
// (unitPrice, currentInventoryValue) stay on every row here; the route strips them
// per-request based on the caller's scope so the 15-minute cache can serve both
// scopes without ever caching a pre-stripped, scope-specific copy.
async function computeDemandForecast() {
  const [salesR, replenishment] = await Promise.all([
    // sales_days_90 mirrors the "distinct days of sales activity" convention already
    // used by services/replenishment.js (there: >=14 days unlocks the dynamic
    // formula). This endpoint asks for a stricter ~30 days of that SKU's own sales
    // history before trusting a demand forecast for it at all.
    pool.query(`
      SELECT op.sku,
        COUNT(DISTINCT o.order_date) AS sales_days_90,
        COALESCE(SUM(op.quantity) FILTER (WHERE o.order_date >= CURRENT_DATE - 30), 0) AS qty_30,
        COALESCE(SUM(op.quantity) FILTER (WHERE o.order_date >= CURRENT_DATE - 60 AND o.order_date < CURRENT_DATE - 30), 0) AS qty_prior_30,
        COALESCE(SUM(op.quantity) FILTER (WHERE o.order_date >= CURRENT_DATE - 60), 0) AS qty_60,
        COALESCE(SUM(op.quantity), 0) AS qty_90
      FROM all_order_products op
      JOIN all_orders o ON o.order_id = op.order_id
      WHERE o.status IN ${REVENUE_STATUSES}
        AND o.order_date >= CURRENT_DATE - 90
      GROUP BY op.sku
    `),
    getReplenishmentSuggestions(pool, 90)
  ]);

  const salesBySku = new Map(salesR.rows.map(r => [r.sku, r]));

  return replenishment.map(item => {
    const sales = salesBySku.get(item.sku);
    const salesDays90 = sales ? Number(sales.sales_days_90) : 0;

    if (salesDays90 < DEMAND_MIN_HISTORY_SALES_DAYS) {
      return { sku: item.sku, name: item.name, status: 'insufficient_data', salesDays90 };
    }

    const qty30 = Number(sales.qty_30);
    const qtyPrior30 = Number(sales.qty_prior_30);
    const qty60 = Number(sales.qty_60);
    const qty90 = Number(sales.qty_90);
    const adu30 = qty30 / 30;
    const adu60 = qty60 / 60;
    const adu90 = qty90 / 90;

    const availableStock = Number(item.available_stock);
    const daysToStockout = forecastService.daysToStockout(availableStock, adu30);
    const projectedStockoutDate = daysToStockout !== null
      ? toDateStr(addDays(new Date(), Math.ceil(daysToStockout)))
      : null;

    return {
      sku: item.sku,
      name: item.name,
      status: 'ok',
      salesDays90,
      averageDailyUsage: {
        d30: Math.round(adu30 * 100) / 100,
        d60: Math.round(adu60 * 100) / 100,
        d90: Math.round(adu90 * 100) / 100
      },
      trend: forecastService.computeVelocityTrend(qty30, qtyPrior30, DEMAND_MIN_TREND_VOLUME),
      availableStock,
      daysToStockout,
      projectedStockoutDate,
      // Reuses the reorder-point formula from /replenishment-suggestions unchanged
      // (services/replenishment.js) -- this endpoint does not recompute it.
      recommendedReorderQuantity: Number(item.suggested_reorder_quantity),
      reorderStatus: item.reorder_status,
      formulaSource: item.formula_source,
      // Carried through so the insight engine's stockout-inside-lead-time rule
      // (services/insightEngine.js) doesn't need a second query for it.
      leadTimeDays: Number(item.lead_time_days),
      unitPrice: Number(item.unit_price),
      currentInventoryValue: Number(item.current_inventory_value)
    };
  });
}

// Cache accessor shared by /forecast/demand and /insights so both read the same
// 15-minute-memoised computation instead of each keeping (and separately
// invalidating) their own copy.
async function getDemandForecastCached() {
  const now = Date.now();
  if (demandForecastCache.payload && now - demandForecastCache.at < FORECAST_TTL_MS) {
    return { payload: demandForecastCache.payload, cached: true };
  }
  const payload = await computeDemandForecast();
  demandForecastCache = { at: now, payload };
  return { payload, cached: false };
}

// GET /api/analytics/forecast/demand — both scopes
router.get('/forecast/demand', async (req, res) => {
  try {
    const scope = resolveScope(req);
    const { payload, cached } = await getDemandForecastCached();

    const data = payload.map(item => {
      if (scope === 'operational' && item.status === 'ok') {
        const { unitPrice, currentInventoryValue, ...rest } = item;
        return rest;
      }
      return item;
    });

    res.json({ success: true, scope, data, cached });
  } catch (error) {
    logger.error('analytics_forecast_demand_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch demand forecast' });
  }
});

// ── Part D: rule-based insight engine ───────────────────────────────────────
// No LLM -- see services/insightEngine.js for why. This route only fetches the
// inputs each rule needs and hands them to generateInsights(), which does all the
// narrating; nothing here decides what counts as noteworthy.

// GET /api/analytics/insights — both scopes (financial-only insights are filtered
// out for operational callers inside generateInsights, not here)
router.get('/insights', async (req, res) => {
  try {
    const scope = resolveScope(req);

    const { start: curStart, end: curEnd } = resolvePeriod('30d');
    const { start: trailStart, end: trailEnd } = previousPeriodBounds(curStart, curEnd, 'previous');
    // Trailing cancellation baseline uses a longer, older window (150 days before
    // the current 30) so a single bad week doesn't drag down its own comparison
    // point -- distinct from the revenue rule's prior-30 comparison.
    const cancelTrailEnd = addDays(curStart, -1);
    const cancelTrailStart = addDays(cancelTrailEnd, -149);
    const cs = toDateStr(curStart), ce = toDateStr(curEnd);
    const ps = toDateStr(trailStart), pe = toDateStr(trailEnd);
    const cts = toDateStr(cancelTrailStart), cte = toDateStr(cancelTrailEnd);

    const [
      revenueTotalsR, productDeltaR, demandResult, proofsR, deliveriesR, cancellationR, deadStockR, arR
    ] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(total_cost) FILTER (WHERE status IN ${REVENUE_STATUSES} AND order_date::date BETWEEN $1 AND $2), 0) AS current_revenue,
          COALESCE(SUM(total_cost) FILTER (WHERE status IN ${REVENUE_STATUSES} AND order_date::date BETWEEN $3 AND $4), 0) AS previous_revenue
        FROM all_orders
        WHERE order_date::date BETWEEN $3 AND $2
      `, [cs, ce, ps, pe]),
      pool.query(`
        WITH cur AS (
          SELECT op.sku, SUM(op.quantity * op.unit_price) AS value
          FROM all_order_products op JOIN all_orders o ON o.order_id = op.order_id
          WHERE o.order_date::date BETWEEN $1 AND $2 AND o.status IN ${REVENUE_STATUSES}
          GROUP BY op.sku
        ),
        prev AS (
          SELECT op.sku, SUM(op.quantity * op.unit_price) AS value
          FROM all_order_products op JOIN all_orders o ON o.order_id = op.order_id
          WHERE o.order_date::date BETWEEN $3 AND $4 AND o.status IN ${REVENUE_STATUSES}
          GROUP BY op.sku
        )
        SELECT COALESCE(cur.sku, prev.sku) AS sku, COALESCE(i.name, COALESCE(cur.sku, prev.sku)) AS name,
          COALESCE(cur.value, 0) AS current_value, COALESCE(prev.value, 0) AS previous_value
        FROM cur FULL OUTER JOIN prev ON cur.sku = prev.sku
        LEFT JOIN inventory_items i ON i.sku = COALESCE(cur.sku, prev.sku)
        ORDER BY ABS(COALESCE(cur.value, 0) - COALESCE(prev.value, 0)) DESC
        LIMIT 1
      `, [cs, ce, ps, pe]),
      getDemandForecastCached(),
      pool.query(`
        SELECT invoice_number, order_id,
          EXTRACT(EPOCH FROM (NOW() - payment_proof_uploaded_at)) / 3600.0 AS age_hours
        FROM invoices
        WHERE payment_proof_path IS NOT NULL AND status NOT IN ('PAID', 'CANCELLED')
      `),
      pool.query(`
        SELECT order_id, name AS customer_name, (CURRENT_DATE - expected_delivery) AS days_late
        FROM orders
        WHERE status NOT IN ('Completed', 'Cancelled')
          AND delivered_at IS NULL
          AND expected_delivery IS NOT NULL
          AND expected_delivery < CURRENT_DATE
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE order_date::date BETWEEN $1 AND $2) AS cur_total,
          COUNT(*) FILTER (WHERE order_date::date BETWEEN $1 AND $2 AND status = 'Cancelled') AS cur_cancelled,
          COUNT(*) FILTER (WHERE order_date::date BETWEEN $3 AND $4) AS trail_total,
          COUNT(*) FILTER (WHERE order_date::date BETWEEN $3 AND $4 AND status = 'Cancelled') AS trail_cancelled
        FROM all_orders
        WHERE order_date::date BETWEEN $3 AND $2
      `, [cs, ce, cts, cte]),
      pool.query(`
        WITH sales AS (
          SELECT op.sku, SUM(op.quantity) AS qty_sold
          FROM all_order_products op JOIN all_orders o ON o.order_id = op.order_id
          WHERE o.status IN ${REVENUE_STATUSES} AND o.order_date >= CURRENT_DATE - 90
          GROUP BY op.sku
        )
        SELECT COALESCE(SUM(i.quantity * i.unit_price) FILTER (WHERE COALESCE(s.qty_sold, 0) = 0), 0) AS dead_stock_value
        FROM inventory_items i LEFT JOIN sales s ON s.sku = i.sku
        WHERE i.is_active = true
      `),
      pool.query(`SELECT COALESCE(SUM(amount_due - amount_paid), 0) AS outstanding FROM invoices WHERE status <> 'CANCELLED'`)
    ]);

    const revenueTotals = revenueTotalsR.rows[0];
    const topProductRow = productDeltaR.rows[0] || null;
    const cancellation = cancellationR.rows[0];

    const curCancelTotal = Number(cancellation.cur_total);
    const trailCancelTotal = Number(cancellation.trail_total);

    const insightData = {
      revenue: {
        currentRevenue: Number(revenueTotals.current_revenue),
        previousRevenue: Number(revenueTotals.previous_revenue),
        topProduct: topProductRow ? {
          sku: topProductRow.sku, name: topProductRow.name,
          currentValue: Number(topProductRow.current_value), previousValue: Number(topProductRow.previous_value)
        } : null
      },
      demandForecast: demandResult.payload
        .filter(item => item.status === 'ok')
        .map(item => ({
          sku: item.sku, name: item.name, daysToStockout: item.daysToStockout,
          leadTimeDays: item.leadTimeDays, recommendedReorderQuantity: item.recommendedReorderQuantity,
          trend: item.trend
        })),
      unverifiedProofs: proofsR.rows.map(r => ({
        invoiceNumber: r.invoice_number, orderId: r.order_id, ageHours: Number(r.age_hours)
      })),
      lateDeliveries: deliveriesR.rows.map(r => ({
        orderId: r.order_id, customerName: r.customer_name, daysLate: Number(r.days_late)
      })),
      cancellation: {
        currentRate: curCancelTotal > 0 ? (Number(cancellation.cur_cancelled) / curCancelTotal) * 100 : null,
        trailingAverage: trailCancelTotal > 0 ? (Number(cancellation.trail_cancelled) / trailCancelTotal) * 100 : null
      },
      deadStock: { deadStockValue: Number(deadStockR.rows[0].dead_stock_value) },
      outstandingAr: { outstandingAr: Number(arR.rows[0].outstanding) }
    };

    const data = generateInsights(insightData, scope);

    res.json({ success: true, scope, data });
  } catch (error) {
    logger.error('analytics_insights_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to generate insights' });
  }
});

// ── Part B: activity feed & employee performance ────────────────────────────

// GET /api/analytics/activity?before=&limit=
router.get('/activity', async (req, res) => {
  try {
    const scope = resolveScope(req);
    const before = req.query.before || new Date().toISOString();
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const feedResult = await pool.query(`
      SELECT ts, actor_id, actor_kind, event_type, entity_type, entity_id, detail
      FROM v_activity_feed
      WHERE ts < $1::timestamptz
      ORDER BY ts DESC
      LIMIT $2
    `, [before, limit]);

    const rows = feedResult.rows;
    const staffIds = [...new Set(
      rows.filter(r => r.actor_kind === 'staff' && r.actor_id != null).map(r => r.actor_id)
    )];

    const namesById = new Map();
    if (staffIds.length > 0) {
      // Never select profile_picture_data here -- it's BYTEA and would dwarf a 20-row feed.
      const namesResult = await pool.query(
        `SELECT user_id, name FROM users WHERE user_id = ANY($1::int[])`,
        [staffIds]
      );
      namesResult.rows.forEach(u => namesById.set(u.user_id, u.name));
    }

    const data = rows.map(r => {
      let actorName;
      if (r.actor_kind === 'customer') actorName = 'Customer';
      else if (r.actor_kind === 'system') actorName = 'System';
      else actorName = (r.actor_id != null && namesById.get(r.actor_id)) || 'Unknown user';

      // detail on the two invoice event types carries amount_due/amount_paid --
      // strip those for operational scope so a packer never sees a currency figure.
      let detail = r.detail;
      if (scope === 'operational' && (r.event_type === 'invoice_created' || r.event_type === 'invoice_paid')) {
        const { amount_due, amount_paid, ...rest } = detail || {};
        detail = rest;
      }

      return {
        ts: r.ts,
        actorId: r.actor_id,
        actorKind: r.actor_kind,
        actorName,
        eventType: r.event_type,
        entityType: r.entity_type,
        entityId: r.entity_id,
        detail
      };
    });

    const nextCursor = rows.length === limit ? rows[rows.length - 1].ts : null;

    res.json({ success: true, scope, data, nextCursor });
  } catch (error) {
    logger.error('analytics_activity_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch activity feed' });
  }
});

const TEAM_PERFORMANCE_TTL_MS = 15 * 60 * 1000;
const teamPerformanceCache = new Map(); // key: days -> { at, payload }

async function computeTeamPerformance(days, actorId = null) {
  const result = await pool.query(`
    WITH staff_events AS (
      SELECT actor_id, event_type, ts,
        ts - LAG(ts) OVER (PARTITION BY actor_id ORDER BY ts) AS gap
      FROM v_activity_feed
      WHERE actor_kind = 'staff' AND actor_id IS NOT NULL
        AND ts >= NOW() - ($1::int * INTERVAL '1 day')
        AND ($2::int IS NULL OR actor_id = $2::int)
    ),
    counts AS (
      SELECT actor_id,
        COUNT(*) AS actions_performed,
        COUNT(*) FILTER (WHERE event_type = 'order_status_change') AS orders_advanced,
        COUNT(*) FILTER (WHERE event_type = 'delivery_status_change') AS deliveries_dispatched,
        COUNT(*) FILTER (WHERE event_type = 'invoice_paid') AS proofs_verified,
        COUNT(*) FILTER (WHERE event_type = 'stock_movement') AS stock_movements_recorded,
        MAX(ts) AS last_action_at
      FROM staff_events
      GROUP BY actor_id
    ),
    medians AS (
      SELECT actor_id, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM gap)) AS median_gap_seconds
      FROM staff_events
      WHERE gap IS NOT NULL
      GROUP BY actor_id
    )
    SELECT u.user_id, u.name, u.last_login,
      c.actions_performed, c.orders_advanced, c.deliveries_dispatched,
      c.proofs_verified, c.stock_movements_recorded, c.last_action_at,
      m.median_gap_seconds
    FROM counts c
    JOIN users u ON u.user_id = c.actor_id
    LEFT JOIN medians m ON m.actor_id = c.actor_id
    ORDER BY c.actions_performed DESC
  `, [days, actorId]);

  return result.rows.map(r => ({
    userId: r.user_id,
    name: r.name,
    actionsPerformed: Number(r.actions_performed),
    ordersAdvanced: Number(r.orders_advanced),
    deliveriesDispatched: Number(r.deliveries_dispatched),
    proofsVerified: Number(r.proofs_verified),
    stockMovementsRecorded: Number(r.stock_movements_recorded),
    medianTimeToActionSeconds: r.median_gap_seconds !== null ? Number(r.median_gap_seconds) : null,
    lastActive: [r.last_login, r.last_action_at].filter(Boolean).sort().pop() || null
  }));
}

// GET /api/analytics/team-performance?days=7 — managers only
router.get('/team-performance', requireRole(['admin', 'super_admin', 'director', 'sales_manager']), async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 7);
    const cacheKey = days;
    const cached = teamPerformanceCache.get(cacheKey);
    if (cached && Date.now() - cached.at < TEAM_PERFORMANCE_TTL_MS) {
      return res.json({ success: true, scope: resolveScope(req), data: cached.payload, cached: true });
    }

    const payload = await computeTeamPerformance(days);
    teamPerformanceCache.set(cacheKey, { at: Date.now(), payload });

    res.json({ success: true, scope: resolveScope(req), data: payload, cached: false });
  } catch (error) {
    logger.error('analytics_team_performance_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch team performance' });
  }
});

// GET /api/analytics/my-activity?days=7 — own numbers only
router.get('/my-activity', async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Forbidden: staff account required' });
    }
    const days = Math.max(1, parseInt(req.query.days, 10) || 7);
    const [mineResult] = await computeTeamPerformance(days, req.user.user_id);
    const mine = mineResult || {
      userId: req.user.user_id,
      name: req.user.name,
      actionsPerformed: 0,
      ordersAdvanced: 0,
      deliveriesDispatched: 0,
      proofsVerified: 0,
      stockMovementsRecorded: 0,
      medianTimeToActionSeconds: null,
      lastActive: null
    };

    res.json({ success: true, scope: resolveScope(req), data: mine });
  } catch (error) {
    logger.error('analytics_my_activity_failed', { err: error });
    res.status(500).json({ success: false, message: 'Failed to fetch activity' });
  }
});

module.exports = router;
