-- Migration: Add order tracking timestamp columns
-- Description: Adds timestamp columns for tracking order lifecycle events

-- Add timestamp columns to orders table if they don't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_shipped_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_received_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS status_updated_by INTEGER REFERENCES users(user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_status_updated_at ON orders(status_updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_placed_at ON orders(order_placed_at);

-- Update existing orders to set order_placed_at from order_date if null
UPDATE orders 
SET order_placed_at = order_date 
WHERE order_placed_at IS NULL;

-- Update status_updated_at for existing orders if null
UPDATE orders 
SET status_updated_at = COALESCE(order_received_at, order_shipped_at, order_paid_at, order_placed_at, order_date)
WHERE status_updated_at IS NULL;

-- Create order_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(user_id),
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- Create index for order_status_history
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_updated_at ON order_status_history(updated_at);

-- Add comment for documentation
COMMENT ON COLUMN orders.order_placed_at IS 'Timestamp when order was initially placed';
COMMENT ON COLUMN orders.order_paid_at IS 'Timestamp when payment was confirmed';
COMMENT ON COLUMN orders.order_shipped_at IS 'Timestamp when order was shipped';
COMMENT ON COLUMN orders.order_received_at IS 'Timestamp when order was received by customer';
COMMENT ON COLUMN orders.status_updated_at IS 'Timestamp of last status update';
COMMENT ON COLUMN orders.status_updated_by IS 'User ID who last updated the status';
