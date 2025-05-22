-- Up Migration:
ALTER TABLE orders ADD COLUMN package_name VARCHAR(100);

-- Down Migration:
ALTER TABLE orders DROP COLUMN package_name; 