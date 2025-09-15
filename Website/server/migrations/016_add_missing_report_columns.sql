-- Migration 016: Add missing columns for inventory reports
-- This migration adds missing columns that are referenced in inventory reports

-- Add unit_price column to order_products table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_products' 
                   AND column_name = 'unit_price') THEN
        ALTER TABLE order_products ADD COLUMN unit_price NUMERIC(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- Add lead_time_days column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'lead_time_days') THEN
        ALTER TABLE inventory_items ADD COLUMN lead_time_days INTEGER DEFAULT 7;
    END IF;
END $$;

-- Add safety_stock_days column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'safety_stock_days') THEN
        ALTER TABLE inventory_items ADD COLUMN safety_stock_days INTEGER DEFAULT 3;
    END IF;
END $$;

-- Add minimum_stock_level column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'minimum_stock_level') THEN
        ALTER TABLE inventory_items ADD COLUMN minimum_stock_level INTEGER DEFAULT 5;
    END IF;
END $$;

-- Add maximum_stock_level column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'maximum_stock_level') THEN
        ALTER TABLE inventory_items ADD COLUMN maximum_stock_level INTEGER DEFAULT 100;
    END IF;
END $$;

-- Add cost_price column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'cost_price') THEN
        ALTER TABLE inventory_items ADD COLUMN cost_price NUMERIC(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- Add markup_percentage column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'markup_percentage') THEN
        ALTER TABLE inventory_items ADD COLUMN markup_percentage DECIMAL(5,2) DEFAULT 0.00;
    END IF;
END $$;

-- Add status column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'status') THEN
        ALTER TABLE inventory_items ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

-- Add is_active column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE inventory_items ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add created_at column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE inventory_items ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add updated_at column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE inventory_items ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add archived_at column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'archived_at') THEN
        ALTER TABLE inventory_items ADD COLUMN archived_at TIMESTAMP;
    END IF;
END $$;

-- Update existing order_products to have unit_price from inventory_items
UPDATE order_products 
SET unit_price = COALESCE(i.unit_price, 0.00)
FROM inventory_items i 
WHERE order_products.sku = i.sku 
AND (order_products.unit_price IS NULL OR order_products.unit_price = 0.00);

-- Update existing inventory_items to have cost_price (estimate as 70% of unit_price)
UPDATE inventory_items 
SET cost_price = ROUND(unit_price * 0.7, 2)
WHERE cost_price IS NULL OR cost_price = 0.00;

-- Update existing inventory_items to have markup_percentage
UPDATE inventory_items 
SET markup_percentage = ROUND(((unit_price - cost_price) / NULLIF(cost_price, 0)) * 100, 2)
WHERE markup_percentage IS NULL OR markup_percentage = 0.00
AND cost_price > 0;

-- Add comments for documentation
COMMENT ON COLUMN order_products.unit_price IS 'Unit price of the product at the time of order';
COMMENT ON COLUMN inventory_items.lead_time_days IS 'Number of days it takes to receive new stock from supplier';
COMMENT ON COLUMN inventory_items.safety_stock_days IS 'Number of days of safety stock to maintain';
COMMENT ON COLUMN inventory_items.minimum_stock_level IS 'Minimum stock level before reordering';
COMMENT ON COLUMN inventory_items.maximum_stock_level IS 'Maximum stock level for storage capacity';
COMMENT ON COLUMN inventory_items.cost_price IS 'Cost price of the item from supplier';
COMMENT ON COLUMN inventory_items.markup_percentage IS 'Markup percentage over cost price';
COMMENT ON COLUMN inventory_items.status IS 'Status of the inventory item (active, inactive, discontinued)';
COMMENT ON COLUMN inventory_items.is_active IS 'Whether the inventory item is currently active';
COMMENT ON COLUMN inventory_items.created_at IS 'Timestamp when the item was created';
COMMENT ON COLUMN inventory_items.updated_at IS 'Timestamp when the item was last updated';
COMMENT ON COLUMN inventory_items.archived_at IS 'Timestamp when the item was archived';
