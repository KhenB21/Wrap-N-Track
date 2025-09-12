-- Create table to persist which inventory SKUs are available to customers by category
-- Categories should match UI keys: packaging, beverages, food, kitchenware, homeDecor,
-- faceAndBody, clothing, customization, others

CREATE TABLE IF NOT EXISTS available_inventory (
  category TEXT NOT NULL,
  sku TEXT NOT NULL REFERENCES inventory_items(sku) ON DELETE CASCADE,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (category, sku)
);


