/* ===========================================================================
   Order stock accounting — the single source of truth for when an order's
   products are on the shelf and when they are committed to a customer.
   ---------------------------------------------------------------------------
   This exists because the rule used to be hand-copied into three separate
   lists in routes/orders.js, and they drifted:

     - the deduct checks listed 'tobepack'   (no trailing "ed")
     - the cancel/restock check listed both  'tobepack' AND 'tobepacked'

   The app sends the status "To Be Packed", which normalises to 'tobepacked'.
   So the deduct never fired while the restock did, and every order cancelled
   out of To Be Packed silently ADDED its quantity back to inventory that had
   never been taken off it. ('To Be Pack' without the "ed" appears nowhere in
   the app — only in two test scripts, which is why the tests passed.)

   The fix is structural, not a spelling patch: deduct and restore are now
   driven by the same predicate, so they cannot disagree again. If a status is
   added to DEDUCTED_STATUSES, both halves learn about it at once.
   =========================================================================== */

// Statuses at which the order's products have already been taken off the shelf.
// Anything not listed here (Pending, Order Placed, Order Paid, Cancelled) means
// the stock is still available.
const DEDUCTED_STATUSES = [
  'tobepack',           // legacy/test spelling, kept so old rows still resolve
  'tobepacked',         // what the application actually sends
  'ordershippedout',
  'readyfordeliver',
  'readyfordelivery',
  'enroute',
  'orderreceived',
  'completed',
];

// Lowercase, strip spaces and hyphens: "To Be Packed" -> "tobepacked".
// Matches the normaliser used client-side in OrderDetails.js.
const normalizeOrderStatus = (status) =>
  typeof status === 'string' ? status.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') : '';

const hasStockDeducted = (status) => DEDUCTED_STATUSES.includes(normalizeOrderStatus(status));

// Statuses an order may be cancelled from. Ready for Delivery is included:
// the goods are packed but have not left, so the stock can still go back on
// the shelf. En Route and beyond are excluded — those are physically gone.
const CANCELLABLE_STATUSES = [
  'pending',
  'orderplaced',
  'orderpaid',
  'tobepack',
  'tobepacked',
  'readyfordeliver',
  'readyfordelivery',
];

const isCancellable = (status) => CANCELLABLE_STATUSES.includes(normalizeOrderStatus(status));

/* Fetch the order's product lines. Caller supplies the transaction client. */
async function getOrderLines(client, orderId) {
  const { rows } = await client.query(
    'SELECT sku, quantity FROM order_products WHERE order_id = $1',
    [orderId]
  );
  return rows;
}

/* Take the order's products off the shelf.
   Throws on insufficient stock so the caller's transaction rolls back — a
   partial deduction would leave inventory in a state nothing can reconcile. */
async function deductOrderStock(client, orderId, lines = null) {
  const rows = lines || await getOrderLines(client, orderId);

  for (const line of rows) {
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const result = await client.query(
      'UPDATE inventory_items SET quantity = quantity - $1, last_updated = NOW() WHERE sku = $2 RETURNING quantity',
      [qty, line.sku]
    );

    if (result.rowCount === 0) {
      const err = new Error(`SKU ${line.sku} not found while deducting stock`);
      err.statusCode = 400;
      throw err;
    }
    if (Number(result.rows[0].quantity) < 0) {
      const err = new Error(`Insufficient stock for SKU ${line.sku}`);
      err.statusCode = 400;
      throw err;
    }
  }

  return rows;
}

/* Put the order's products back on the shelf. */
async function restoreOrderStock(client, orderId, lines = null) {
  const rows = lines || await getOrderLines(client, orderId);

  for (const line of rows) {
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const result = await client.query(
      'UPDATE inventory_items SET quantity = quantity + $1, last_updated = NOW() WHERE sku = $2',
      [qty, line.sku]
    );
    if (result.rowCount === 0) {
      // A product deleted from inventory after the order was placed. Not worth
      // failing a cancellation over, but it must not pass silently.
      console.warn(`[orderStock] Cannot restore SKU ${line.sku} for order ${orderId}: no inventory row.`);
    }
  }

  return rows;
}

/* Apply whatever inventory movement a status change implies.

   Deduct and restore are both decided by hasStockDeducted(), so the two can
   never disagree: stock moves only when a transition CROSSES the committed
   boundary, and a transition within one side of it (To Be Packed -> Ready for
   Delivery, or Pending -> Order Paid) moves nothing. That also makes repeated
   calls for the same effective transition harmless. */
async function applyStatusStockChange(client, orderId, fromStatus, toStatus) {
  const was = hasStockDeducted(fromStatus);
  const now = hasStockDeducted(toStatus);

  if (was === now) return { action: 'none' };

  if (!was && now) {
    const lines = await deductOrderStock(client, orderId);
    return { action: 'deducted', lines };
  }

  const lines = await restoreOrderStock(client, orderId);
  return { action: 'restored', lines };
}

module.exports = {
  DEDUCTED_STATUSES,
  CANCELLABLE_STATUSES,
  normalizeOrderStatus,
  hasStockDeducted,
  isCancellable,
  getOrderLines,
  deductOrderStock,
  restoreOrderStock,
  applyStatusStockChange,
};
