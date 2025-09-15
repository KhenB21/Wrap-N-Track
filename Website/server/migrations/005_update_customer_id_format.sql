-- Up Migration:
-- First, drop any foreign key constraints that reference customer_details
DO $$ 
BEGIN
    -- Drop foreign key constraints that reference customer_details
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_details') THEN
        -- Get all foreign key constraints that reference customer_details
        FOR rec IN 
            SELECT conname, conrelid::regclass as table_name
            FROM pg_constraint 
            WHERE confrelid = 'customer_details'::regclass
        LOOP
            EXECUTE 'ALTER TABLE ' || rec.table_name || ' DROP CONSTRAINT IF EXISTS ' || rec.conname;
        END LOOP;
    END IF;
END $$;

-- Drop the existing customer_details table
DROP TABLE IF EXISTS customer_details;

-- Create a function to generate random 6-digit numbers
CREATE OR REPLACE FUNCTION generate_customer_id()
RETURNS INTEGER AS $$
DECLARE
    new_id INTEGER;
BEGIN
    LOOP
        -- Generate a random 6-digit number
        new_id := floor(random() * 900000 + 100000)::INTEGER;
        
        -- Check if the ID already exists
        EXIT WHEN NOT EXISTS (SELECT 1 FROM customer_details WHERE customer_id = new_id);
    END LOOP;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create the customer_details table with the new ID format
CREATE TABLE customer_details (
    customer_id INTEGER PRIMARY KEY DEFAULT generate_customer_id(),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration:
DROP TABLE IF EXISTS customer_details;
DROP FUNCTION IF EXISTS generate_customer_id();

-- Recreate the original table
CREATE TABLE customer_details (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 