-- Up Migration:
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'regular';

-- Down Migration:
ALTER TABLE orders
DROP COLUMN IF EXISTS order_type; 