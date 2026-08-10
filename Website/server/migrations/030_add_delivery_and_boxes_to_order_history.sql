-- Delivery/tracking/proof-of-delivery data and box count were only ever stored on `orders`.
-- When an order is archived (Completed/Cancelled) into `order_history`, that data was never
-- copied over before the `orders` row was deleted, so customers lost delivery info on any
-- order that reached a terminal state. This adds the same columns to `order_history` so the
-- archival INSERTs (routes/orders.js, routes/order-management.js) can carry the values over.

ALTER TABLE order_history
  ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delivery_mode_id INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS courier_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(150),
  ADD COLUMN IF NOT EXISTS tracking_link TEXT,
  ADD COLUMN IF NOT EXISTS tracking_link_available BOOLEAN,
  ADD COLUMN IF NOT EXISTS tracking_unavailable_message TEXT,
  ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_uploaded_by INTEGER,
  ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_remarks TEXT,
  ADD COLUMN IF NOT EXISTS delivery_updated_by INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_quantity INTEGER;
