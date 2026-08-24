-- Migration 037: Cost snapshot on order lines + analytics indexes
--
-- Historical gross margin cannot be computed today: order lines store the selling
-- price (unit_price) but never the cost at the time of sale, so any margin figure
-- derived from inventory_items.cost_price silently drifts the moment a product's
-- cost changes. This adds a per-line cost snapshot to both the live and archived
-- order-line tables.
--
-- Runs BEFORE 038 (the unified analytics views) because those views project
-- cost_price and would fail if the column did not exist yet.

ALTER TABLE order_products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);

ALTER TABLE order_history_products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);

-- Backfill from the product's current cost. This is an approximation for rows that
-- already exist — the true historical cost was never recorded — and is only a
-- starting point. Every line written from here on captures the cost at write time.
UPDATE order_products op
SET cost_price = i.cost_price
FROM inventory_items i
WHERE op.sku = i.sku
  AND op.cost_price IS NULL
  AND i.cost_price > 0;

UPDATE order_history_products ohp
SET cost_price = i.cost_price
FROM inventory_items i
WHERE ohp.sku = i.sku
  AND ohp.cost_price IS NULL
  AND i.cost_price > 0;

COMMENT ON COLUMN order_products.cost_price IS
  'Unit cost at the time the order line was created. NULL means unknown - render as "-", never as zero margin.';
COMMENT ON COLUMN order_history_products.cost_price IS
  'Unit cost at the time the order line was created. NULL means unknown - render as "-", never as zero margin.';

-- Indexes supporting the analytics read path. Every analytics query filters on
-- order_date and joins order lines by sku; order_history had neither index because
-- nothing ever read from it.
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_history_order_date ON order_history(order_date);
CREATE INDEX IF NOT EXISTS idx_order_history_products_sku ON order_history_products(sku);
CREATE INDEX IF NOT EXISTS idx_order_products_sku ON order_products(sku);
