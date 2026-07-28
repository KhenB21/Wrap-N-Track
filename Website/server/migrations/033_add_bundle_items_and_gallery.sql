-- Gallery images for showcase bundles (up to 10 per bundle)
CREATE TABLE IF NOT EXISTS bundle_gallery_images (
  id         SERIAL PRIMARY KEY,
  bundle_id  INTEGER NOT NULL REFERENCES showcase_bundles(id) ON DELETE CASCADE,
  image_data BYTEA   NOT NULL,
  image_mime VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
  sort_order SMALLINT   NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bundle_gallery_bundle ON bundle_gallery_images(bundle_id, sort_order);

-- Inventory items bundled inside a showcase bundle (links to inventory_items via SKU)
CREATE TABLE IF NOT EXISTS bundle_items (
  id        SERIAL PRIMARY KEY,
  bundle_id INTEGER     NOT NULL REFERENCES showcase_bundles(id) ON DELETE CASCADE,
  sku       VARCHAR(50) NOT NULL REFERENCES inventory_items(sku) ON DELETE RESTRICT,
  quantity  INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (bundle_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items(bundle_id);
