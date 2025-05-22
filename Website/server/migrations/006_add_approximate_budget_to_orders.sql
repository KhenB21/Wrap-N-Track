-- Up Migration:
ALTER TABLE orders ADD COLUMN approximate_budget NUMERIC(10,2);

-- Down Migration:
ALTER TABLE orders DROP COLUMN approximate_budget; 