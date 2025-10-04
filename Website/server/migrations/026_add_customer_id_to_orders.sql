-- Migration: Add customer_id to orders table
-- Description: Links orders to customer_details table for customer order tracking

-- Add customer_id column to orders table if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customer_details(customer_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Try to backfill customer_id from email_address if possible
-- This will match orders to customers based on email
UPDATE orders o
SET customer_id = cd.customer_id
FROM customer_details cd
WHERE o.customer_id IS NULL 
  AND o.email_address IS NOT NULL 
  AND o.email_address = cd.email_address;

-- Try to backfill customer_id from phone number if email didn't match
UPDATE orders o
SET customer_id = cd.customer_id
FROM customer_details cd
WHERE o.customer_id IS NULL 
  AND o.cellphone IS NOT NULL 
  AND o.cellphone = cd.phone_number;

-- Try to backfill customer_id from name if still not matched
UPDATE orders o
SET customer_id = cd.customer_id
FROM customer_details cd
WHERE o.customer_id IS NULL 
  AND o.name IS NOT NULL 
  AND LOWER(o.name) = LOWER(cd.name);

-- Add comment for documentation
COMMENT ON COLUMN orders.customer_id IS 'Foreign key linking order to customer_details table';
