#!/usr/bin/env node
/**
 * seedAnalyticsHistory.js
 *
 * Generates 18 months of demonstration order history so the analytics and
 * forecasting features have a usable time series to work against.
 *
 * WHY THIS EXISTS
 * The live database holds ~79 orders spread over 32 non-contiguous days, in 5 of the
 * last 15 months, with an 8-month gap. That is not a time series: no statistical
 * forecast can be computed from it, and most analytics panels would render
 * "insufficient data". This script produces a realistically-shaped dataset so the
 * same formulas -- which are unchanged and run identically on real data -- can be
 * demonstrated and defended.
 *
 * DISCLOSE THIS IN PROJECT DOCUMENTATION. Seeded rows are a demonstration dataset,
 * not real trading history.
 *
 * SAFETY
 *  - Every generated order_id is prefixed 'SEED-'; every generated stock movement is
 *    tagged 'SEED:' in its reason column. clearAnalyticsHistory.js removes exactly
 *    those rows and nothing else.
 *  - Refuses to run when NODE_ENV=production.
 *  - Runs in a single transaction: it either all lands or none of it does.
 *  - Does NOT touch inventory_items.quantity. Seeded stock_movements are historical
 *    log entries only; mutating real stock levels to match a fictional history would
 *    corrupt actual operational data.
 *  - Idempotent: re-running clears its own previous output first.
 *
 * Usage:  node scripts/seedAnalyticsHistory.js [--months=18]
 */

const pool = require('../config/db');

// ---------------------------------------------------------------- configuration
const REVENUE_STATUSES = ['Order Received', 'Completed'];
const IN_FLIGHT_STATUSES = [
  'Order Placed', 'Order Paid', 'To Be Packed', 'Order Shipped Out', 'Ready for Delivery'
];
// Orders older than this are always terminal -- a 12-month-old "To Be Packed" order
// would be an obvious artefact.
const IN_FLIGHT_WINDOW_DAYS = 30;

const SHARE_COMPLETED = 0.84;
const SHARE_CANCELLED = 0.08;   // remainder becomes in-flight (recent dates only)
const SHARE_WITH_CUSTOMER_ID = 0.70;
const SHARE_ON_TIME_DELIVERY = 0.80;
const SHARE_FULLY_PAID = 0.85;

// Philippine gift-wrapping business: weekend browsing lift, Christmas and
// Valentine's peaks, a secondary May lift for weddings and graduations.
const DOW_FACTOR = [1.10, 0.80, 0.85, 0.90, 1.00, 1.20, 1.40]; // Sun..Sat
const MONTH_FACTOR = [0.80, 1.50, 1.00, 0.90, 1.20, 1.10, 0.90, 0.90, 1.00, 1.00, 1.30, 1.90];
const BASE_ORDERS_START = 2.0;  // mean orders/day at the start of the window
const BASE_ORDERS_END = 6.0;    // mean orders/day by the end (growth trend)

// Deterministic PRNG so repeated runs produce the same dataset.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260823);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const randInt = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const iso = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addHours = (d, n) => { const x = new Date(d); x.setHours(x.getHours() + n); return x; };

// Poisson draw (Knuth) so daily counts vary the way arrivals actually do.
function poisson(mean) {
  const L = Math.exp(-mean);
  let k = 0, p = 1;
  do { k++; p *= rnd(); } while (p > L);
  return k - 1;
}

const WALK_IN_NAMES = [
  'Maria Santos', 'Jose Reyes', 'Ana Cruz', 'Miguel Torres', 'Liza Bautista',
  'Paolo Mendoza', 'Carmela Ramos', 'Nico Villanueva', 'Grace Aquino', 'Ramon Dela Cruz',
  'Bea Lim', 'Ito Panganiban', 'Divine Castro', 'Marco Silva', 'Rhea Navarro'
];
const CITIES = [
  ['NCR', 'Taguig'], ['NCR', 'Quezon City'], ['NCR', 'Makati'], ['NCR', 'Pasig'],
  ['Region IV-A', 'Antipolo'], ['Region III', 'San Fernando'], ['Region VII', 'Cebu City']
];
const STREETS = ['Rizal', 'Mabini', 'Bonifacio', 'Luna'];
const PAY_METHODS = ['Cash', 'GCash', 'Bank', 'Cash on Delivery'];
const INVOICE_PAY_METHODS = ['Cash', 'GCash', 'Bank Transfer'];

// -------------------------------------------------------------- chunked insert
async function bulkInsert(client, table, columns, rows, chunkSize = 400) {
  if (!rows.length) return 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const params = [];
    const tuples = chunk.map(row => {
      const ph = row.map(v => { params.push(v); return '$' + params.length; });
      return '(' + ph.join(',') + ')';
    });
    await client.query(
      'INSERT INTO ' + table + ' (' + columns.join(',') + ') VALUES ' + tuples.join(','),
      params
    );
  }
  return rows.length;
}

// Shared with clearAnalyticsHistory.js. Order matters: order_products has a
// NO ACTION foreign key to orders, so lines must be removed before their parents.
const CLEAR_STEPS = [
  "DELETE FROM order_products WHERE order_id LIKE 'SEED-%'",
  "DELETE FROM order_status_history WHERE order_id LIKE 'SEED-%'",
  "DELETE FROM delivery_status_history WHERE order_id LIKE 'SEED-%'",
  "DELETE FROM invoices WHERE order_id LIKE 'SEED-%'",
  "DELETE FROM orders WHERE order_id LIKE 'SEED-%'",
  "DELETE FROM order_history_products WHERE order_id LIKE 'SEED-%'",
  "DELETE FROM order_history WHERE order_id LIKE 'SEED-%'",
  "DELETE FROM stock_movements WHERE reason LIKE 'SEED:%'"
];

async function clearSeed(client) {
  let n = 0;
  for (const stmt of CLEAR_STEPS) n += (await client.query(stmt)).rowCount;
  return n;
}

// ------------------------------------------------------------------------- main
async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed: NODE_ENV=production.');
    process.exit(1);
  }
  const monthsArg = process.argv.find(a => a.startsWith('--months='));
  const months = monthsArg ? parseInt(monthsArg.split('=')[1], 10) : 18;

  const client = await pool.connect();
  try {
    const skus = (await client.query(
      'SELECT sku, name, unit_price, ' +
      'COALESCE(NULLIF(cost_price, 0), ROUND(unit_price * 0.7, 2)) AS cost_price ' +
      'FROM inventory_items WHERE is_active = true AND unit_price > 0'
    )).rows;
    if (skus.length < 5) throw new Error('Not enough sellable SKUs to seed against.');

    const staff = (await client.query(
      'SELECT user_id FROM users WHERE is_active = true ORDER BY user_id'
    )).rows.map(r => r.user_id);
    if (!staff.length) throw new Error('No active users to attribute activity to.');

    const customers = (await client.query(
      'SELECT customer_id, name FROM customer_details ORDER BY customer_id'
    )).rows;

    const modes = (await client.query(
      'SELECT id, name, type FROM delivery_modes WHERE is_active = true ORDER BY id'
    )).rows;

    console.log('Reference data: ' + skus.length + ' SKUs, ' + staff.length + ' staff, ' +
      customers.length + ' customers, ' + modes.length + ' delivery modes');

    await client.query('BEGIN');

    const cleared = await clearSeed(client);
    if (cleared) console.log('Cleared ' + cleared + ' rows from a previous seed run.');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setMonth(start.getMonth() - months);
    const totalDays = Math.round((today - start) / 86400000);

    const liveOrders = [], liveLines = [], histOrders = [], histLines = [];
    const invoices = [], statusHist = [], deliveryHist = [], movements = [];
    let seq = 0, invSeq = 9000;
    const stockBalance = new Map(); // notional running balance per SKU for the movement log

    for (let dayIdx = 0; dayIdx <= totalDays; dayIdx++) {
      const date = addDays(start, dayIdx);
      const progress = dayIdx / Math.max(1, totalDays);
      const mean =
        (BASE_ORDERS_START + (BASE_ORDERS_END - BASE_ORDERS_START) * progress) *
        DOW_FACTOR[date.getDay()] *
        MONTH_FACTOR[date.getMonth()];

      const count = poisson(mean);
      for (let n = 0; n < count; n++) {
        seq++;
        const orderId = 'SEED-' + iso(date).replace(/-/g, '') + '-' + String(seq).padStart(5, '0');
        const ageDays = totalDays - dayIdx;

        // ---- status --------------------------------------------------------
        const roll = rnd();
        let status;
        if (ageDays > IN_FLIGHT_WINDOW_DAYS) {
          status = roll < SHARE_CANCELLED / (SHARE_COMPLETED + SHARE_CANCELLED)
            ? 'Cancelled' : 'Completed';
        } else if (roll < SHARE_COMPLETED) {
          status = 'Completed';
        } else if (roll < SHARE_COMPLETED + SHARE_CANCELLED) {
          status = 'Cancelled';
        } else {
          status = pick(IN_FLIGHT_STATUSES);
        }
        const isTerminal = status === 'Completed' || status === 'Cancelled';
        const isRevenue = REVENUE_STATUSES.includes(status);

        // ---- customer ------------------------------------------------------
        let customerId = null, custName;
        if (customers.length && rnd() < SHARE_WITH_CUSTOMER_ID) {
          const c = pick(customers);
          customerId = c.customer_id;
          custName = c.name;
        } else {
          custName = pick(WALK_IN_NAMES);
        }
        const city = pick(CITIES)[1];

        // ---- lines ---------------------------------------------------------
        const lineCount = randInt(1, 6);
        const chosen = new Set();
        const lines = [];
        let total = 0;
        for (let l = 0; l < lineCount; l++) {
          const s = pick(skus);
          if (chosen.has(s.sku)) continue;
          chosen.add(s.sku);
          const qty = randInt(1, 12);
          const unitPrice = Number(s.unit_price);
          const costPrice = Number(s.cost_price);
          total += qty * unitPrice;
          lines.push([orderId, s.sku, qty, unitPrice, costPrice]);

          if (isRevenue) {
            const prev = stockBalance.has(s.sku) ? stockBalance.get(s.sku) : 500;
            const next = Math.max(0, prev - qty);
            stockBalance.set(s.sku, next);
            movements.push([
              s.sku, 'STOCK_OUT', qty, prev, next,
              'SEED: fulfilled ' + orderId, String(pick(staff)),
              addHours(date, randInt(9, 17)), 'order_fulfilment'
            ]);
          }
        }
        if (!lines.length) continue;
        total = Math.round(total * 100) / 100;
        const units = lines.reduce((a, l) => a + l[2], 0);

        const expected = addDays(date, randInt(3, 10));
        const placedAt = addHours(date, randInt(8, 20));
        const mode = modes.length ? pick(modes) : null;
        const address = randInt(1, 999) + ' ' + pick(STREETS) + ' St, ' + city;
        const email = custName.split(' ')[0].toLowerCase() + '@example.com';
        const cell = '09' + randInt(100000000, 999999999);

        // delivered on or around the promise date
        const deliveredAt = isRevenue
          ? addDays(expected, rnd() < SHARE_ON_TIME_DELIVERY ? -randInt(0, 2) : randInt(1, 6))
          : null;

        if (isTerminal) {
          histOrders.push([
            orderId, custName, custName, custName, iso(date), iso(expected), status,
            address, total, 'Full Payment', pick(PAY_METHODS), null,
            'Seeded demonstration order', null, cell, email,
            addHours(deliveredAt || expected, 2), pick(staff), customerId,
            isRevenue ? 'Delivered' : 'Cancelled',
            mode ? mode.name : null, mode ? mode.id : null, mode ? mode.type : null,
            mode ? mode.name : null, deliveredAt, units
          ]);
          for (const l of lines) histLines.push([l[0], l[1], l[2], l[3], l[4]]);
        } else {
          liveOrders.push([
            orderId, custName, custName, iso(date), iso(expected), status, address, total,
            'Full Payment', pick(PAY_METHODS), 'Seeded demonstration order', cell, email,
            customerId, placedAt, pick(staff), placedAt, 'Preparing',
            mode ? mode.name : null, mode ? mode.id : null, mode ? mode.type : null,
            mode ? mode.name : null, units
          ]);
          for (const l of lines) liveLines.push([l[0], l[1], l[2], l[3], l[4]]);
        }

        // ---- invoices -------------------------------------------------------
        if (status !== 'Cancelled') {
          const dpAmount = Math.round(total * (0.3 + rnd() * 0.2) * 100) / 100;
          const rbAmount = Math.round((total - dpAmount) * 100) / 100;
          const dpIssued = addHours(date, randInt(9, 18));
          const dpPaid = addDays(dpIssued, randInt(0, 5));
          const fullyPaid = isRevenue && rnd() < SHARE_FULLY_PAID;
          const d = iso(date).replace(/-/g, '');

          invSeq++;
          invoices.push([
            'WNT-DP-' + d + '-' + invSeq, orderId, customerId, 'DOWN_PAYMENT',
            fullyPaid ? 'PAID' : 'UNPAID', total, 0, 0, total,
            dpAmount, rbAmount, dpAmount, fullyPaid ? dpAmount : 0,
            pick(INVOICE_PAY_METHODS), dpIssued, fullyPaid ? dpPaid : null, pick(staff)
          ]);
          if (fullyPaid) {
            const rbPaid = addDays(dpPaid, randInt(1, 14));
            invSeq++;
            invoices.push([
              'WNT-RB-' + d + '-' + invSeq, orderId, customerId, 'REMAINING_BALANCE',
              'PAID', total, 0, 0, total, dpAmount, rbAmount, rbAmount, rbAmount,
              pick(INVOICE_PAY_METHODS), dpPaid, rbPaid, pick(staff)
            ]);
          }
        }

        // ---- lifecycle history (drives cycle-time + activity analytics) ------
        // The first transition is customer-initiated, so updated_by is NULL --
        // matching how the real checkout paths behave.
        statusHist.push([orderId, null, 'Order Placed', null, placedAt, 'Seeded: order created']);
        let cursor = placedAt;
        let path;
        if (!isTerminal) {
          path = [status];
        } else if (status === 'Cancelled') {
          path = ['Order Paid', 'Cancelled'];
        } else {
          path = ['Order Paid', 'To Be Packed', 'Order Shipped Out', 'Completed'];
        }
        for (const st of path) {
          cursor = addHours(cursor, randInt(4, 40));
          statusHist.push([orderId, null, st, pick(staff), cursor, 'Seeded: status advanced']);
        }

        if (status !== 'Cancelled') {
          let dcur = addHours(placedAt, randInt(6, 30));
          const dpath = isRevenue
            ? ['Preparing', 'Ready for Delivery', 'Sent / Shipped', 'Delivered']
            : ['Preparing', 'Ready for Delivery'];
          for (const st of dpath) {
            deliveryHist.push([
              orderId, st, 'Seeded: delivery stage',
              mode ? mode.name : null, mode ? mode.name : null,
              mode ? 'TRK' + randInt(100000, 999999) : null,
              pick(staff), dcur, mode ? mode.id : null, mode ? mode.type : null
            ]);
            dcur = addHours(dcur, randInt(8, 48));
          }
        }
      }

      // periodic replenishment so the stock-in vs stock-out chart has both sides
      if (dayIdx % 14 === 0) {
        for (const s of skus.slice(0, Math.min(12, skus.length))) {
          const qty = randInt(50, 200);
          const prev = stockBalance.has(s.sku) ? stockBalance.get(s.sku) : 500;
          const next = prev + qty;
          stockBalance.set(s.sku, next);
          movements.push([
            s.sku, 'STOCK_IN', qty, prev, next, 'SEED: supplier replenishment',
            String(pick(staff)), addHours(date, randInt(8, 12)), 'manual'
          ]);
        }
      }
    }

    console.log('Writing ' + (liveOrders.length + histOrders.length) + ' orders...');

    await bulkInsert(client, 'orders', [
      'order_id', 'name', 'shipped_to', 'order_date', 'expected_delivery', 'status',
      'shipping_address', 'total_cost', 'payment_type', 'payment_method', 'remarks',
      'cellphone', 'email_address', 'customer_id', 'order_placed_at', 'status_updated_by',
      'status_updated_at', 'delivery_status', 'delivery_method', 'delivery_mode_id',
      'delivery_type', 'courier_name', 'order_quantity'
    ], liveOrders);

    await bulkInsert(client, 'order_products',
      ['order_id', 'sku', 'quantity', 'unit_price', 'cost_price'], liveLines);

    await bulkInsert(client, 'order_history', [
      'order_id', 'customer_name', 'name', 'shipped_to', 'order_date', 'expected_delivery',
      'status', 'shipping_address', 'total_cost', 'payment_type', 'payment_method',
      'account_name', 'remarks', 'telephone', 'cellphone', 'email_address', 'archived_at',
      'archived_by', 'customer_id', 'delivery_status', 'delivery_method', 'delivery_mode_id',
      'delivery_type', 'courier_name', 'delivered_at', 'order_quantity'
    ], histOrders);

    await bulkInsert(client, 'order_history_products',
      ['order_id', 'sku', 'quantity', 'unit_price', 'cost_price'], histLines);

    await bulkInsert(client, 'invoices', [
      'invoice_number', 'order_id', 'customer_id', 'invoice_type', 'status', 'subtotal',
      'delivery_fee', 'additional_fee', 'total_order_amount', 'down_payment_amount',
      'remaining_balance_amount', 'amount_due', 'amount_paid', 'payment_method',
      'issued_at', 'paid_at', 'created_by'
    ], invoices);

    await bulkInsert(client, 'order_status_history',
      ['order_id', 'old_status', 'new_status', 'updated_by', 'updated_at', 'notes'], statusHist);

    await bulkInsert(client, 'delivery_status_history', [
      'order_id', 'status', 'remarks', 'delivery_method', 'courier_name',
      'tracking_number', 'updated_by', 'created_at', 'delivery_mode_id', 'delivery_type'
    ], deliveryHist);

    await bulkInsert(client, 'stock_movements', [
      'product_id', 'movement_type', 'quantity', 'previous_quantity', 'new_quantity',
      'reason', 'performed_by', 'created_at', 'source'
    ], movements);

    await client.query('COMMIT');

    console.log('\nSeed complete:');
    console.log('  orders (in-flight)       ' + liveOrders.length);
    console.log('  order_history (terminal) ' + histOrders.length);
    console.log('  order lines              ' + (liveLines.length + histLines.length));
    console.log('  invoices                 ' + invoices.length);
    console.log('  order_status_history     ' + statusHist.length);
    console.log('  delivery_status_history  ' + deliveryHist.length);
    console.log('  stock_movements          ' + movements.length);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed, rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { clearSeed, CLEAR_STEPS };
if (require.main === module) main();
