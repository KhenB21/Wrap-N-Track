-- Migration 024: Add customer_id to order_history table
-- This migration adds customer_id field to order_history table to enable customer filtering

-- Add customer_id column to order_history table
ALTER TABLE order_history 
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customer_details(customer_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_order_history_customer_id ON order_history(customer_id);

-- Update existing records to have customer_id if possible
-- This will try to match by email address or name
UPDATE order_history 
SET customer_id = cd.customer_id
FROM customer_details cd
WHERE order_history.email_address = cd.email_address
AND order_history.customer_id IS NULL;

-- If no email match, try to match by name
UPDATE order_history 
SET customer_id = cd.customer_id
FROM customer_details cd
WHERE LOWER(order_history.customer_name) = LOWER(cd.name)
AND order_history.customer_id IS NULL
AND order_history.customer_id IS NULL;
