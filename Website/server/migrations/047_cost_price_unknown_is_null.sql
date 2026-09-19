-- Migration 047: "never costed" must be NULL, not 0
--
-- inventory_items.cost_price was created with DEFAULT 0.00, so a product whose
-- original price has never been entered is indistinguishable from one that
-- genuinely costs nothing. The margin logic keys off NULL, not zero --
-- services/salesMetrics.js treats a line as costed when
-- `cost_price IS NOT NULL`, and routes/analytics.js sums margin only
-- `WHERE cost_price IS NOT NULL`. A default of 0 therefore reads as a free
-- product and yields a 100% margin, silently INFLATING profit, instead of
-- falling back to the target-margin estimate and being reported as estimated.
--
-- Understating profit with a visible "estimated" caption is recoverable;
-- overstating it with no warning is not. This makes the unknown case honest.
--
-- Note: a product that really is free (a giveaway) can no longer be recorded
-- as 0 -- it would have to be 0.01, or the margin logic needs a separate
-- 'is_free' flag. No such product exists today, and the Add/Edit Product form
-- now writes NULL (not 0) for a blank cost, so new rows match this convention.

-- 1. Existing rows: 0 means the cost was never entered.
UPDATE inventory_items
SET cost_price = NULL
WHERE cost_price = 0;

-- 2. New rows must default to unknown rather than free.
ALTER TABLE inventory_items
  ALTER COLUMN cost_price DROP DEFAULT;

-- order_products.cost_price is deliberately left alone: it has no DEFAULT and
-- no zero rows, so its NULLs already mean "cost not captured at order time".
