/* ===========================================================================
   Accounts receivable — the one definition of "outstanding"
   ---------------------------------------------------------------------------
   Every AR figure (dashboard tile, payments tab, business report, insights)
   used to be `SUM(amount_due - amount_paid) WHERE status <> 'CANCELLED'`.
   That over-counted in two ways the client reported:

   - invoices whose order was cancelled were never voided, so a cancelled
     order kept showing its unpaid balance as AR;
   - invoices whose order no longer exists at all (deleted test/demo orders)
     still counted, so AR showed money owed with no order behind it.

   It could also go negative: a PAID invoice has amount_due = 0 but a positive
   amount_paid, which subtracted from the total.

   Completed orders are excluded too: the server refuses to complete an order
   that is not paid in full (services/orderPayments.js), so an unpaid invoice
   left on a Completed order is a stale record, not money owed. (The local DB
   had 347 of these — all SEED- demo orders — making up ~₱1.17M of "AR" while
   only 29 orders were actually open.)

   Outstanding AR is now: unpaid, non-voided invoices, floored at zero, that
   belong to an order that exists (live or archived) and is still open — not
   Completed and not Cancelled.
   =========================================================================== */

/* Per-invoice outstanding amount. `a` is the invoices table alias. */
const outstandingAmountSql = (a = 'i') => `GREATEST(${a}.amount_due - ${a}.amount_paid, 0)`;

/* WHERE-clause predicate: the invoice is a real receivable. */
const receivableInvoiceSql = (a = 'i') => `(
  ${a}.status NOT IN ('PAID', 'CANCELLED')
  AND EXISTS (
    SELECT 1 FROM all_orders ar_o
    WHERE ar_o.order_id = ${a}.order_id AND ar_o.status NOT IN ('Cancelled', 'Completed')
  )
)`;

module.exports = {
  outstandingAmountSql,
  receivableInvoiceSql,
};
