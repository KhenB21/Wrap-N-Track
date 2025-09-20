-- Migration 019: Add fast-moving product tracking
-- This migration adds fast-moving product detection and sales tracking

-- Add fast_moving column to inventory_items table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'fast_moving') THEN
        ALTER TABLE inventory_items ADD COLUMN fast_moving BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add sales tracking columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'sales_count_30_days') THEN
        ALTER TABLE inventory_items ADD COLUMN sales_count_30_days INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'last_sales_update') THEN
        ALTER TABLE inventory_items ADD COLUMN last_sales_update TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN inventory_items.fast_moving IS 'Indicates if the product is considered fast-moving based on sales data';
COMMENT ON COLUMN inventory_items.sales_count_30_days IS 'Number of units sold in the last 30 days';
COMMENT ON COLUMN inventory_items.last_sales_update IS 'Last time sales data was updated';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_fast_moving ON inventory_items(fast_moving);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sales_count ON inventory_items(sales_count_30_days);

-- Create a function to update fast-moving status
CREATE OR REPLACE FUNCTION update_fast_moving_status()
RETURNS void AS $$
BEGIN
    -- Update fast_moving status based on sales in last 30 days
    -- Consider a product fast-moving if it sold more than 50 units in 30 days
    UPDATE inventory_items 
    SET fast_moving = (sales_count_30_days >= 50),
        last_sales_update = NOW()
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update sales count from orders
CREATE OR REPLACE FUNCTION update_sales_count_from_orders()
RETURNS void AS $$
BEGIN
    -- This would be called when orders are processed
    -- For now, we'll set some sample data
    UPDATE inventory_items 
    SET sales_count_30_days = GREATEST(0, sales_count_30_days - 1)
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;
