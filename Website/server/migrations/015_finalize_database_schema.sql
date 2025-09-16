-- Migration 015: Finalize database schema
-- This migration ensures all required tables and columns exist safely

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
        ALTER TABLE inventory_items ADD COLUMN supplier_id INTEGER;
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'inventory_items' 
                       AND constraint_name = 'inventory_items_supplier_id_fkey') THEN
            ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_supplier_id_fkey 
            FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id);
        END IF;
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

-- Ensure all other required tables exist
CREATE TABLE IF NOT EXISTS customer_details (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    shipped_to VARCHAR(255) NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    shipping_address TEXT NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_type VARCHAR(50) NOT NULL DEFAULT 'Pending',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Pending',
    account_name VARCHAR(255),
    remarks TEXT,
    telephone VARCHAR(20),
    cellphone VARCHAR(20),
    email_address VARCHAR(255),
    total_profit_estimation DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_products (
    line_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    profit_margin DECIMAL(5,2) DEFAULT 0.00,
    profit_estimation DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_items (
    sku VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    category VARCHAR(100),
    image_data BYTEA,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uom VARCHAR(20),
    conversion_qty INTEGER,
    expiration DATE,
    reorder_level INTEGER DEFAULT 0,
    supplier_id INTEGER REFERENCES suppliers(supplier_id)
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer')),
    profile_picture_data BYTEA,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_email_verified BOOLEAN DEFAULT false,
    email_verification_code VARCHAR(10),
    email_verification_expires_at TIMESTAMP,
    reset_code VARCHAR(10),
    reset_code_expires TIMESTAMP
);

-- Create order_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_history (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    shipped_to VARCHAR(255) NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status VARCHAR(50) NOT NULL,
    shipping_address TEXT NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_type VARCHAR(50) NOT NULL DEFAULT 'Pending',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Pending',
    account_name VARCHAR(255),
    remarks TEXT,
    telephone VARCHAR(20),
    cellphone VARCHAR(20),
    email_address VARCHAR(255),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_by INTEGER REFERENCES users(user_id)
);

-- Create order_history_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_history_products (
    order_id VARCHAR(50) REFERENCES order_history(order_id) ON DELETE CASCADE,
    sku VARCHAR(50) REFERENCES inventory_items(sku),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (order_id, sku)
);

-- Create available_inventory view if it doesn't exist
CREATE OR REPLACE VIEW available_inventory AS
SELECT 
    i.sku,
    i.name,
    i.description,
    i.quantity,
    i.unit_price,
    i.category,
    i.image_data,
    i.last_updated,
    i.uom,
    i.conversion_qty,
    i.expiration,
    i.reorder_level,
    i.supplier_id,
    s.name as supplier_name,
    GREATEST(0, i.quantity - COALESCE(SUM(CASE 
        WHEN o.status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED') 
        THEN op.quantity 
        ELSE 0 
    END), 0)) AS available_quantity
FROM inventory_items i
LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
LEFT JOIN order_products op ON i.sku = op.sku
LEFT JOIN orders o ON op.order_id = o.order_id
GROUP BY i.sku, i.name, i.description, i.quantity, i.unit_price, i.category, 
         i.image_data, i.last_updated, i.uom, i.conversion_qty, i.expiration, 
         i.reorder_level, i.supplier_id, s.name;
