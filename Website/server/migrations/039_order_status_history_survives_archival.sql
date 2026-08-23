-- Migration 039: stop archival from destroying order status history
--
-- order_status_history.order_id carried a foreign key to orders(order_id) with
-- ON DELETE CASCADE. Completing or cancelling an order archives it into
-- order_history and then DELETEs the orders row -- which silently cascaded away
-- that order's entire status history. That is why the table held only 16 rows
-- against 79 orders, and it makes order cycle-time analysis impossible for exactly
-- the orders that completed.
--
-- Its sibling delivery_status_history has never had a foreign key and its rows
-- survive archival correctly. This aligns order_status_history with that design:
-- an append-only audit log keyed by order_id.
--
-- Nothing in the application deletes from this table explicitly (the cascade was
-- the only remover), so no code changes are required.

ALTER TABLE order_status_history
  DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey;

-- order_id is now the lookup key with no FK behind it, so make sure it is indexed.
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON order_status_history(order_id);

COMMENT ON TABLE order_status_history IS
  'Append-only audit log of order status transitions. Intentionally has no FK to orders: rows must survive archival into order_history.';
