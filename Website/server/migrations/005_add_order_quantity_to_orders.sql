-- Up Migration:
ALTER TABLE orders ADD COLUMN order_quantity INTEGER;

-- Down Migration:
ALTER TABLE orders DROP COLUMN order_quantity; 