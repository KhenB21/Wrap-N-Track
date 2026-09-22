-- Migration 049: cancelling an order clears its accounts receivable
--
-- New rule (services/orderCancellation.js): when an order is cancelled, every
-- invoice that has not been paid is voided, and a paid down payment is kept
-- (non-refundable) as revenue from a cancelled order. Orders cancelled before
-- this rule existed still carry UNPAID invoices, which kept showing up as
-- outstanding AR. This applies the same settlement to them retroactively.

-- 1. Void unpaid invoices of cancelled orders (live or archived).
UPDATE invoices i
SET status = 'CANCELLED',
    amount_due = 0,
    remaining_balance_amount = 0,
    cancelled_at = COALESCE(i.cancelled_at, NOW()),
    payment_notes = CONCAT_WS(E'\n', NULLIF(i.payment_notes, ''), 'Voided: order was cancelled.'),
    updated_at = NOW()
WHERE i.status NOT IN ('PAID', 'CANCELLED')
  AND EXISTS (
    SELECT 1 FROM all_orders o
    WHERE o.order_id = i.order_id AND o.status = 'Cancelled'
  );

-- 2. Paid invoices of cancelled orders stay PAID (the kept deposit) but owe nothing.
UPDATE invoices i
SET amount_due = 0,
    remaining_balance_amount = 0,
    updated_at = NOW()
WHERE i.status = 'PAID'
  AND EXISTS (
    SELECT 1 FROM all_orders o
    WHERE o.order_id = i.order_id AND o.status = 'Cancelled'
  );

-- 3. Cancelled orders still in the live table carry no balance.
UPDATE orders
SET remaining_balance = 0
WHERE status = 'Cancelled';
