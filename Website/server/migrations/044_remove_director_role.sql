-- Migration 044: Remove the 'director' role
-- 'Director' was never part of Pensée Gifting Studio's documented org structure
-- (Managing Partners, Business Development Manager, Social Media Admin, Sales
-- Manager, Creative Director, Packers). Deactivate any account on this role,
-- drop its feature access, and remove it from the allowed role list.

-- Deactivate any user still on the director role (kept, not deleted).
-- Role is also reset to 'packer' (least-privilege) so the row satisfies the
-- tightened CHECK constraint below; is_active = false means they cannot log
-- in regardless of role.
UPDATE users
SET is_active = false, role = 'packer'
WHERE role = 'director';

-- Drop director's feature access rows
DELETE FROM role_feature_access
WHERE role = 'director';

-- Remove director from the allowed roles constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'business_developer', 'creatives', 'sales_manager', 'assistant_sales', 'packer'));
