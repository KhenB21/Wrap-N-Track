-- Migration 023: Cart and Delivery Monitoring System
-- This migration adds support for customer cart functionality and enhanced order status tracking

-- Create customer_cart table
CREATE TABLE IF NOT EXISTS customer_cart (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customer_details(customer_id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL REFERENCES inventory_items(sku) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, sku)
);

-- Create cart_items view for easier querying
CREATE OR REPLACE VIEW cart_items AS
SELECT 
    cc.cart_id,
    cc.customer_id,
    cc.sku,
    ii.name as product_name,
    ii.description,
    ii.unit_price,
    ii.image_data,
    cc.quantity,
    (ii.unit_price * cc.quantity) as total_price,
    cc.added_at,
    cc.updated_at
FROM customer_cart cc
JOIN inventory_items ii ON cc.sku = ii.sku;

-- First, fix the existing "Ready for Deliver" to "Ready for Delivery"
UPDATE orders SET status = 'Ready for Delivery' WHERE status = 'Ready for Deliver';

-- Add new order statuses to support 4-stage tracking
-- We'll use an enum constraint to ensure valid statuses
DO $$ 
BEGIN
    -- Add new status values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Order Placed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
        ALTER TYPE order_status_enum ADD VALUE 'Order Placed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Order Paid' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
        ALTER TYPE order_status_enum ADD VALUE 'Order Paid';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Order Shipped Out' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
        ALTER TYPE order_status_enum ADD VALUE 'Order Shipped Out';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Order Received' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
        ALTER TYPE order_status_enum ADD VALUE 'Order Received';
    END IF;
    
    -- Add employee-side statuses
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'To Be Packed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
        ALTER TYPE order_status_enum ADD VALUE 'To Be Packed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Ready for Delivery' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
        ALTER TYPE order_status_enum ADD VALUE 'Ready for Delivery';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
        ALTER TYPE order_status_enum ADD VALUE 'Completed';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- If the enum doesn't exist, create it
        CREATE TYPE order_status_enum AS ENUM (
            'Pending',
            'Order Placed',
            'Order Paid', 
            'To Be Packed',
            'Order Shipped Out',
            'Ready for Delivery',
            'Order Received',
            'Completed',
            'Cancelled'
        );
        
        -- Update the orders table to use the enum
        ALTER TABLE orders ALTER COLUMN status TYPE order_status_enum USING status::order_status_enum;
END $$;

-- Add order tracking fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customer_details(customer_id),
ADD COLUMN IF NOT EXISTS order_placed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_shipped_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_received_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status_updated_by INTEGER REFERENCES users(user_id),
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create order_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS order_status_history (
    history_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_cart_customer_id ON customer_cart(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_cart_sku ON customer_cart(sku);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Create function to update order status with history tracking
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id VARCHAR(50),
    p_new_status VARCHAR(50),
    p_updated_by INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR(50);
    v_customer_id INTEGER;
BEGIN
    -- Get current status and customer_id
    SELECT status, customer_id INTO v_old_status, v_customer_id
    FROM orders 
    WHERE order_id = p_order_id;
    
    -- If order not found, return false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- If status is the same, return true (no change needed)
    IF v_old_status = p_new_status THEN
        RETURN TRUE;
    END IF;
    
    -- Update the order status
    UPDATE orders 
    SET 
        status = p_new_status,
        status_updated_by = p_updated_by,
        status_updated_at = CURRENT_TIMESTAMP,
        -- Update specific timestamp fields based on status
        order_placed_at = CASE WHEN p_new_status = 'Order Placed' THEN CURRENT_TIMESTAMP ELSE order_placed_at END,
        order_paid_at = CASE WHEN p_new_status = 'Order Paid' THEN CURRENT_TIMESTAMP ELSE order_paid_at END,
        order_shipped_at = CASE WHEN p_new_status = 'Order Shipped Out' THEN CURRENT_TIMESTAMP ELSE order_shipped_at END,
        order_received_at = CASE WHEN p_new_status = 'Order Received' THEN CURRENT_TIMESTAMP ELSE order_received_at END
    WHERE order_id = p_order_id;
    
    -- Insert into history table
    INSERT INTO order_status_history (order_id, old_status, new_status, updated_by, notes)
    VALUES (p_order_id, v_old_status, p_new_status, p_updated_by, p_notes);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get customer's cart total
CREATE OR REPLACE FUNCTION get_cart_total(p_customer_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(ii.unit_price * cc.quantity), 0)
    INTO v_total
    FROM customer_cart cc
    JOIN inventory_items ii ON cc.sku = ii.sku
    WHERE cc.customer_id = p_customer_id;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Create function to get customer's cart item count
CREATE OR REPLACE FUNCTION get_cart_item_count(p_customer_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_count
    FROM customer_cart
    WHERE customer_id = p_customer_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp on cart changes
CREATE OR REPLACE FUNCTION update_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cart_updated_at
    BEFORE UPDATE ON customer_cart
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_updated_at();

-- Insert sample data for testing (optional)
-- This can be removed in production
INSERT INTO customer_cart (customer_id, sku, quantity) 
SELECT 
    cd.customer_id,
    ii.sku,
    1
FROM customer_details cd
CROSS JOIN inventory_items ii
WHERE cd.customer_id = 1 AND ii.sku = 'SAMPLE001'
ON CONFLICT (customer_id, sku) DO NOTHING;
