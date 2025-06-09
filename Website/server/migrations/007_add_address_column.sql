-- Up Migration:
ALTER TABLE customer_details
ADD COLUMN IF NOT EXISTS address TEXT;

-- Down Migration:
ALTER TABLE customer_details
DROP COLUMN IF EXISTS address; 