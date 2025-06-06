-- Migration: Add conversion_qty column to inventory_items if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='inventory_items' AND column_name='conversion_qty'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN conversion_qty NUMERIC(10,2);
    END IF;
END$$; 