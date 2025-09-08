-- Add company, notes, status, and date_joined fields to customer_details table

-- Up Migration:
ALTER TABLE customer_details 
ADD COLUMN IF NOT EXISTS company VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add check constraint for status
ALTER TABLE customer_details 
ADD CONSTRAINT customer_status_check 
CHECK (status IN ('active', 'inactive'));

-- Update existing records to have default status if null
UPDATE customer_details 
SET status = 'active' 
WHERE status IS NULL;

-- Update existing records to have date_joined if null
UPDATE customer_details 
SET date_joined = created_at 
WHERE date_joined IS NULL;

-- Down Migration (commented out for safety):
/*
ALTER TABLE customer_details 
DROP COLUMN IF EXISTS company,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS date_joined,
DROP COLUMN IF EXISTS address;

DROP CONSTRAINT IF EXISTS customer_status_check;
*/
