-- Create supplier_orders table
CREATE TABLE IF NOT EXISTS supplier_orders (
  supplier_order_id TEXT PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Waiting', 'Received')),
  order_date TEXT NOT NULL,
  expected_delivery TEXT NOT NULL,
  remarks TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- Create supplier_order_items table
CREATE TABLE IF NOT EXISTS supplier_order_items (
  id SERIAL PRIMARY KEY,
  supplier_order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variation TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (supplier_order_id) REFERENCES supplier_orders(supplier_order_id),
  FOREIGN KEY (product_id) REFERENCES inventory_items(sku)
);

-- Create supplier_order_history table
CREATE TABLE IF NOT EXISTS supplier_order_history (
  supplier_order_id TEXT PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  received_date TEXT NOT NULL,
  expected_delivery TEXT NOT NULL,
  remarks TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- Create supplier_order_history_items table
CREATE TABLE IF NOT EXISTS supplier_order_history_items (
  id SERIAL PRIMARY KEY,
  supplier_order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variation TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (supplier_order_id) REFERENCES supplier_order_history(supplier_order_id),
  FOREIGN KEY (product_id) REFERENCES inventory_items(sku)
);

-- Add new columns to supplier_order_history
ALTER TABLE supplier_order_history 
ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Add new columns to supplier_order_history_items
ALTER TABLE supplier_order_history_items 
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS image_data BYTEA,
ADD COLUMN IF NOT EXISTS description TEXT; 