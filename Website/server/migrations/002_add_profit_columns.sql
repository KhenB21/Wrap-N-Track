-- Up Migration:
-- Add total_profit_estimation column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_profit_estimation DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS package_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS order_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS approximate_budget DECIMAL(10,2) DEFAULT 0.00;

-- Add profit-related columns to order_products table
ALTER TABLE order_products 
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS profit_estimation DECIMAL(10,2) DEFAULT 0.00;

-- Down Migration:
ALTER TABLE orders 
DROP COLUMN IF EXISTS total_profit_estimation,
DROP COLUMN IF EXISTS package_name,
DROP COLUMN IF EXISTS order_quantity,
DROP COLUMN IF EXISTS approximate_budget;

ALTER TABLE order_products 
DROP COLUMN IF EXISTS profit_margin,
DROP COLUMN IF EXISTS profit_estimation; 