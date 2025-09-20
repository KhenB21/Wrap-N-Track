-- Migration 017: Add expiration columns to inventory_items table
-- This migration adds the missing expirable and expiration columns

-- Add expirable column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'expirable') THEN
        ALTER TABLE inventory_items ADD COLUMN expirable BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add expiration column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'expiration') THEN
        ALTER TABLE inventory_items ADD COLUMN expiration DATE;
    END IF;
END $$;

-- Add comments to the new columns
COMMENT ON COLUMN inventory_items.expirable IS 'Indicates if the product has an expiration date';
COMMENT ON COLUMN inventory_items.expiration IS 'The expiration date of the product (if expirable is true)';

-- Create index on expirable for better performance when filtering
CREATE INDEX IF NOT EXISTS idx_inventory_items_expirable ON inventory_items(expirable);

-- Create index on expiration for better performance when filtering by date
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiration ON inventory_items(expiration);
