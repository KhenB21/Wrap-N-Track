-- Up Migration:
-- First, drop the existing customer_details table
DROP TABLE IF EXISTS customer_details;

-- Create a new customer_details table without user_id foreign key
CREATE TABLE customer_details (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add authentication fields to existing customer_details table
ALTER TABLE customer_details
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_picture_data BYTEA;

-- Down Migration:
-- Drop the new table
DROP TABLE IF EXISTS customer_details;

-- Recreate the original table
CREATE TABLE customer_details (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    CONSTRAINT user_id_length CHECK (user_id >= 1000 AND user_id <= 9999)
);
