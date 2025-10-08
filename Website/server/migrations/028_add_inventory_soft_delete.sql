-- Migration 028: Add soft delete support to inventory_items
-- This migration adds is_active column for soft delete functionality

-- Add is_active column to inventory_items table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'inventory_items'
                   AND column_name = 'is_active') THEN
        ALTER TABLE inventory_items ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN inventory_items.is_active IS 'Soft delete flag - true for active items, false for deleted items';

-- Create index for performance when filtering active items
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active ON inventory_items(is_active);

-- Update any existing items to be active (should already be true due to default)
UPDATE inventory_items SET is_active = true WHERE is_active IS NULL;
