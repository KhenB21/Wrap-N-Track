-- Up Migration:
-- First, drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Then update the roles
UPDATE users SET role = 'director' WHERE role = 'employee';

-- Finally, add the new constraint
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer'));

-- Down Migration:
-- First, update any rows with new roles back to 'employee'
UPDATE users SET role = 'employee' 
WHERE role IN ('business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer');

-- Then restore the original constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role::text = ANY (ARRAY['admin'::character varying::text, 'employee'::character varying::text])); 