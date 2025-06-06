-- Migration: Add ENUM type for UoM and constrain the uom column

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'uom_enum') THEN
        CREATE TYPE uom_enum AS ENUM (
            'Each', 'Piece', 'Set', 'Pair', 'Dozen', 'Roll', 'Sheet', 'Bag', 'Box', 'Bundle',
            'Meter', 'Centimeter', 'Foot', 'Gram', 'Kilogram', 'Milliliter', 'Liter', 'Kit', 'Unit', 'Task'
        );
    END IF;
END$$;

-- Only alter the column if it exists and is not already of type uom_enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='inventory_items' AND column_name='uom'
    ) THEN
        BEGIN
            ALTER TABLE inventory_items
                ALTER COLUMN uom TYPE uom_enum
                USING uom::uom_enum;
        EXCEPTION WHEN others THEN
            -- Ignore error if already of type uom_enum
            NULL;
        END;
    END IF;
END$$; 