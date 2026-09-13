/* ===========================================================================
   Order payment gates
   ---------------------------------------------------------------------------
   Business rule: an order is confirmed into production once the 70% down
   payment is settled. The remaining 30% is collected later — see
   REQUIRE_FULL_PAYMENT_BEFORE below for where that balance becomes mandatory.

   Until now the "are the invoices paid?" check lived only in the browser
   (OrderDetails.js), so the mobile app, the Order Management dashboard and any
   direct API call could confirm a completely unpaid order into To Be Packed —
   which, now that To Be Packed deducts stock, would also commit inventory to an
   order nobody had paid for. This module is the server-side counterpart.

   The paid-amount expression deliberately mirrors calculatePaymentSummary() in
   routes/invoices.js. Two different definitions of "paid" is precisely the kind
   of drift that produced the To Be Packed stock bug, so if that expression
   changes, change it here too.
   =========================================================================== */

const pool = require('../config/db');
const { normalizeOrderStatus } = require('./orderStock');

// Share of the order total due up front to start production.
const DOWN_PAYMENT_RATE = 0.7;

// Invoice statuses that count as money actually received.
const PAID_STATUSES = ['PAID'];

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

/* Statuses that may not be entered until the down payment has been settled. */
const REQUIRE_DOWN_PAYMENT_BEFORE = [
  'tobepack',
  'tobepacked',
];

/* Statuses that may not be entered until the order is paid in full.
   The goods do not leave the shop with money outstanding: an order sits in
   Ready for Delivery until the remaining 30% is settled, and only then can it
   be shipped or completed. Note that Ready for Delivery itself is NOT listed —
   an order is allowed to reach and wait at that status while the balance is
   still being collected. */
const REQUIRE_FULL_PAYMENT_BEFORE = [
  'enroute',
  'ordershippedout',
  'orderreceived',
  'completed',
];

async function getOrderPaymentState(orderId, client = pool) {
  const orderResult = await client.query(
    'SELECT total_cost FROM orders WHERE order_id = $1',
    [orderId]
  );
  if (orderResult.rows.length === 0) return null;

  // The authoritative grand total lives on the invoices (it includes delivery
  // and additional fees); orders.total_cost is the products-only figure and is
  // the fallback for an order that has no invoice yet.
  const totalsResult = await client.query(`
    SELECT
      MAX(total_order_amount) AS grand_total,
      COALESCE(SUM(
        CASE
          WHEN amount_paid > 0 THEN amount_paid
          WHEN invoice_type = 'DOWN_PAYMENT' THEN down_payment_amount
          WHEN invoice_type = 'REMAINING_BALANCE' THEN GREATEST(total_order_amount - down_payment_amount, 0)
          ELSE 0
        END
      ) FILTER (WHERE status = ANY($2::varchar[])), 0) AS total_paid,
      BOOL_OR(invoice_type = 'DOWN_PAYMENT' AND status = ANY($2::varchar[])) AS down_payment_paid,
      COUNT(*) FILTER (WHERE invoice_type = 'DOWN_PAYMENT') AS down_payment_invoices
    FROM invoices
    WHERE order_id = $1 AND status <> 'CANCELLED'
  `, [orderId, PAID_STATUSES]);

  const row = totalsResult.rows[0] || {};
  const grandTotal = toMoney(row.grand_total) || toMoney(orderResult.rows[0].total_cost);
  const totalPaid = toMoney(row.total_paid);
  const remainingBalance = Math.max(0, toMoney(grandTotal - totalPaid));

  return {
    grandTotal,
    totalPaid,
    remainingBalance,
    downPaymentDue: toMoney(grandTotal * DOWN_PAYMENT_RATE),
    downPaymentPaid: Boolean(row.down_payment_paid),
    hasDownPaymentInvoice: Number(row.down_payment_invoices) > 0,
    fullyPaid: grandTotal > 0 && remainingBalance === 0,
  };
}

/* Returns null when the transition is allowed, or a reason string to reject
   it with. Only checks transitions that CROSS into a gated status, so an order
   already in To Be Packed can still be edited without re-proving payment. */
async function checkPaymentGate(orderId, fromStatus, toStatus, client = pool) {
  const from = normalizeOrderStatus(fromStatus);
  const to = normalizeOrderStatus(toStatus);
  if (!to || from === to) return null;

  const needsDownPayment = REQUIRE_DOWN_PAYMENT_BEFORE.includes(to) && !REQUIRE_DOWN_PAYMENT_BEFORE.includes(from);
  const needsFullPayment = REQUIRE_FULL_PAYMENT_BEFORE.includes(to) && !REQUIRE_FULL_PAYMENT_BEFORE.includes(from);
  if (!needsDownPayment && !needsFullPayment) return null;

  const state = await getOrderPaymentState(orderId, client);
  if (!state) return null;

  // An order with no total to collect (a replacement, a giveaway) has nothing
  // to gate on — blocking it would be a dead end with no way forward.
  if (state.grandTotal <= 0) return null;

  if (needsFullPayment && !state.fullyPaid) {
    return `This order cannot move to "${toStatus}" until it is paid in full. `
      + `₱${state.remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })} is still outstanding.`;
  }

  if (needsDownPayment && !state.downPaymentPaid) {
    return state.hasDownPaymentInvoice
      ? `The ${Math.round(DOWN_PAYMENT_RATE * 100)}% down payment invoice for this order has not been marked as paid yet. `
        + `Record the payment before confirming it into production.`
      : `Generate the ${Math.round(DOWN_PAYMENT_RATE * 100)}% down payment invoice and mark it paid before confirming this order into production.`;
  }

  return null;
}

module.exports = {
  DOWN_PAYMENT_RATE,
  REQUIRE_DOWN_PAYMENT_BEFORE,
  REQUIRE_FULL_PAYMENT_BEFORE,
  getOrderPaymentState,
  checkPaymentGate,
};
