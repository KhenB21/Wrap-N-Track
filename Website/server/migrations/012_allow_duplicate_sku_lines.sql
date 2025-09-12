-- Migration 012: Allow duplicate SKU lines per order
-- 1. Add line_id surrogate key
-- 2. Drop old composite PK (order_id, sku)
-- 3. Recreate supporting indexes
-- Safe-guarded with IF EXISTS checks.

BEGIN;

-- Add line_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='order_products' AND column_name='line_id'
    ) THEN
        ALTER TABLE order_products ADD COLUMN line_id SERIAL;
    END IF;
END $$;

-- Drop old PK if still composite (order_id, sku)
DO $$
DECLARE
    pk_name text;
BEGIN
    SELECT conname INTO pk_name
    FROM pg_constraint
    WHERE conrelid = 'order_products'::regclass
      AND contype = 'p';

    IF pk_name IS NOT NULL THEN
        -- Check definition
        IF (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = pk_name) LIKE 'PRIMARY KEY (order_id, sku)%' THEN
            EXECUTE format('ALTER TABLE order_products DROP CONSTRAINT %I', pk_name);
        END IF;
    END IF;
END $$;

-- Add new PK on line_id if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid='order_products'::regclass AND contype='p'
    ) THEN
        ALTER TABLE order_products ADD CONSTRAINT order_products_pkey PRIMARY KEY (line_id);
    END IF;
END $$;

-- Helpful index for lookups by order_id
CREATE INDEX IF NOT EXISTS idx_order_products_order_id ON order_products(order_id);
-- Helpful index for order_id + sku aggregations
CREATE INDEX IF NOT EXISTS idx_order_products_order_id_sku ON order_products(order_id, sku);

COMMIT;
