-- Migration 014: Add suppliers table and reorder_level column
-- This migration adds the missing suppliers table and reorder_level column to inventory_items

-- Create suppliers table
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

-- Add reorder_level column to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;

-- Add supplier_id foreign key to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(supplier_id);

-- Create index on supplier_id for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);

-- Create index on supplier name for better search performance
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

-- Add comments for documentation
COMMENT ON TABLE suppliers IS 'Table storing supplier information for inventory items';
COMMENT ON COLUMN suppliers.supplier_id IS 'Primary key for suppliers table';
COMMENT ON COLUMN suppliers.name IS 'Supplier company name';
COMMENT ON COLUMN suppliers.contact_person IS 'Primary contact person at the supplier';
COMMENT ON COLUMN suppliers.email IS 'Supplier email address';
COMMENT ON COLUMN suppliers.phone IS 'Supplier phone number';
COMMENT ON COLUMN suppliers.address IS 'Supplier street address';
COMMENT ON COLUMN suppliers.city IS 'Supplier city';
COMMENT ON COLUMN suppliers.state IS 'Supplier state/province';
COMMENT ON COLUMN suppliers.postal_code IS 'Supplier postal/zip code';
COMMENT ON COLUMN suppliers.country IS 'Supplier country';
COMMENT ON COLUMN suppliers.website IS 'Supplier website URL';
COMMENT ON COLUMN suppliers.notes IS 'Additional notes about the supplier';
COMMENT ON COLUMN suppliers.is_active IS 'Whether the supplier is currently active';
COMMENT ON COLUMN suppliers.created_at IS 'Timestamp when supplier was created';
COMMENT ON COLUMN suppliers.updated_at IS 'Timestamp when supplier was last updated';

COMMENT ON COLUMN inventory_items.reorder_level IS 'Minimum stock level at which to reorder this item';
COMMENT ON COLUMN inventory_items.supplier_id IS 'Foreign key reference to suppliers table';
