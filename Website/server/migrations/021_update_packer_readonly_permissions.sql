-- Migration 021: Update packer role to read-only permissions
-- This migration updates the packer role to have read-only access

-- Update packer role feature access to be read-only
-- Remove write access features and keep only read access
DELETE FROM role_feature_access 
WHERE role = 'packer' 
AND feature_id IN (
    SELECT feature_id FROM features 
    WHERE name IN ('Users', 'Settings')
);

-- Ensure packer has read access to Dashboard, Inventory, Orders, Order History
INSERT INTO role_feature_access (role, feature_id)
SELECT 'packer', feature_id FROM features
WHERE name IN ('Dashboard', 'Inventory', 'Orders', 'Order History')
ON CONFLICT (role, feature_id) DO NOTHING;

-- Add a function to check if a role is read-only
CREATE OR REPLACE FUNCTION is_readonly_role(role_name VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN role_name = 'packer';
END;
$$ LANGUAGE plpgsql;

-- Add a function to check if user can perform write operations
CREATE OR REPLACE FUNCTION can_write_operation(user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    SELECT role INTO user_role FROM users WHERE user_id = user_id;
    RETURN NOT is_readonly_role(user_role);
END;
$$ LANGUAGE plpgsql;
