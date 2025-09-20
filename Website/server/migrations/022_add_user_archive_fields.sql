-- Migration 022: Add archive functionality to users table
-- This migration adds fields to support archiving users instead of deleting them

-- Add archive-related columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for better performance on archived users
CREATE INDEX IF NOT EXISTS idx_users_archived ON users(is_archived);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_users_timestamp ON users;

-- Create trigger
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_timestamp();

-- Update existing users to have proper archive status
UPDATE users 
SET is_archived = false 
WHERE is_archived IS NULL;
