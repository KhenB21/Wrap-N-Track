-- Supplier-level lead time, used as a fallback by the reorder-point formula when a
-- product doesn't have its own inventory_items.lead_time_days set. Approved per the
-- reordering formula proposal (Issue 2).

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
