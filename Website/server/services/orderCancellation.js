/* ===========================================================================
   Order cancellation — payment rules
   ---------------------------------------------------------------------------
   Business rules (client feedback, Sept 2026):

   1. A fully paid order can NOT be cancelled. Only unpaid or partially paid
      (70% down payment settled) orders can.
   2. A down payment already received is NOT refunded when the order is
      cancelled. It is kept like a security deposit and is the only money from
      that order that counts as revenue — reported separately as revenue from
      cancelled orders (see services/salesMetrics.js and routes/analytics.js).
   3. Cancelling clears the order's accounts receivable: every invoice that has
      not been paid is voided, so nothing is left "outstanding" on an order that
      will never be fulfilled.

   There are three routes that can cancel an order (PUT /orders/:id,
   DELETE /orders/:id and PUT /order-management/orders/:id/status). All of them
   call checkCancellationGate() before, and settleInvoicesOnCancel() inside the
   same transaction as, the status change — so the rules cannot drift apart.
   =========================================================================== */

const { normalizeOrderStatus, isCancellable } = require('./orderStock');
const { getOrderPaymentState } = require('./orderPayments');

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Same "what counts as paid" expression as orderPayments / salesMetrics.
const PAID_AMOUNT_SQL = `
  CASE
    WHEN amount_paid > 0 THEN amount_paid
    WHEN invoice_type = 'DOWN_PAYMENT' THEN down_payment_amount
    WHEN invoice_type = 'REMAINING_BALANCE' THEN GREATEST(total_order_amount - down_payment_amount, 0)
    ELSE 0
  END`;

const isCancelStatus = (status) => normalizeOrderStatus(status) === 'cancelled';

/* Returns null when the move is allowed, or a reason string to reject it with.
   Only applies to moves INTO Cancelled; anything else passes through. */
async function checkCancellationGate(orderId, fromStatus, toStatus, client) {
  if (!isCancelStatus(toStatus) || isCancelStatus(fromStatus)) return null;

  if (!isCancellable(fromStatus)) {
    return `Order cannot be cancelled once it is "${fromStatus}". Cancellation is only possible up to Ready for Delivery.`;
  }

  const state = await getOrderPaymentState(orderId, client);
  if (state && state.fullyPaid) {
    return 'This order is already paid in full and can no longer be cancelled. '
      + 'Only unpaid or partially paid orders can be cancelled.';
  }
  return null;
}

/* Voids every unpaid invoice of the order (clearing its AR) and records the
   down payment that is being kept. Must run inside the caller's transaction,
   BEFORE the order is archived out of `orders`. */
async function settleInvoicesOnCancel(orderId, client, userId = null) {
  await client.query(`
    UPDATE invoices
    SET status = 'CANCELLED',
        amount_due = 0,
        remaining_balance_amount = 0,
        cancelled_at = NOW(),
        payment_notes = CONCAT_WS(E'\\n', NULLIF(payment_notes, ''), 'Voided: order was cancelled.'),
        updated_by = COALESCE($2, updated_by),
        updated_at = NOW()
    WHERE order_id = $1
      AND status NOT IN ('PAID', 'CANCELLED')
  `, [orderId, userId]);

  // Paid invoices stay PAID — that money is retained, not refunded. Their
  // amount_due is zeroed so nothing on a cancelled order reads as receivable.
  const paidResult = await client.query(`
    UPDATE invoices
    SET amount_due = 0,
        remaining_balance_amount = 0,
        updated_at = NOW()
    WHERE order_id = $1 AND status = 'PAID'
    RETURNING ${PAID_AMOUNT_SQL} AS paid
  `, [orderId]);
  const retainedDeposit = toMoney(paidResult.rows.reduce((sum, r) => sum + Number(r.paid || 0), 0));

  await client.query(`
    UPDATE orders
    SET remaining_balance = 0,
        total_verified_payments = $2,
        payment_status = $3
    WHERE order_id = $1
  `, [orderId, retainedDeposit, retainedDeposit > 0 ? 'Deposit Retained' : 'Cancelled']);

  return { retainedDeposit };
}

module.exports = {
  isCancelStatus,
  checkCancellationGate,
  settleInvoicesOnCancel,
};
