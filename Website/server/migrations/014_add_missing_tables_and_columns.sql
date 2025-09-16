-- Migration 014: Add missing tables and columns
-- This migration adds the missing suppliers table and reorder_level column

-- Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    website VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add reorder_level column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'reorder_level') THEN
        ALTER TABLE inventory_items ADD COLUMN reorder_level INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add supplier_id column to inventory_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' 
                   AND column_name = 'supplier_id') THEN
        ALTER TABLE inventory_items ADD COLUMN supplier_id INTEGER REFERENCES suppliers(supplier_id);
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- Add some sample suppliers if the table is empty
INSERT INTO suppliers (name, contact_person, email, phone, address, city, state, postal_code, country, is_active)
SELECT * FROM (VALUES 
    ('Gift Wrap Central', 'John Smith', 'john@giftwrapcentral.com', '+1-555-0101', '123 Main St', 'New York', 'NY', '10001', 'USA', true),
    ('Premium Packaging Co', 'Sarah Johnson', 'sarah@premiumpackaging.com', '+1-555-0102', '456 Oak Ave', 'Los Angeles', 'CA', '90210', 'USA', true),
    ('Creative Wraps Ltd', 'Mike Brown', 'mike@creativewraps.com', '+1-555-0103', '789 Pine St', 'Chicago', 'IL', '60601', 'USA', true)
) AS v(name, contact_person, email, phone, address, city, state, postal_code, country, is_active)
WHERE NOT EXISTS (SELECT 1 FROM suppliers LIMIT 1);

-- Update existing inventory items to have a default reorder level if they don't have one
UPDATE inventory_items 
SET reorder_level = 10 
WHERE reorder_level IS NULL OR reorder_level = 0;
