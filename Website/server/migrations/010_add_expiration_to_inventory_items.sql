-- Migration: Add expiration column to inventory_items if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='inventory_items' AND column_name='expiration'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN expiration DATE;
    END IF;
END$$; 