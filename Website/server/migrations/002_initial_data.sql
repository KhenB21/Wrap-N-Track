-- Up Migration:
-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES (
    'Admin User',
    'admin@wraptrack.com',
    '$2b$10$3euPcmQFCiblsZeEu5s7p.9BU8F8jQz6P1t3JxKqXzXxXxXxXxXxXx', -- This is bcrypt hash for 'admin123'
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert default features
INSERT INTO features (name, frame_reference) VALUES
    ('Dashboard', 'Dashboard'),
    ('Inventory', 'Inventory'),
    ('Orders', 'Orders'),
    ('Order History', 'OrderHistory'),
    ('Users', 'Users'),
    ('Settings', 'Settings')
ON CONFLICT (feature_id) DO NOTHING;

-- Insert role-feature access mappings
INSERT INTO role_feature_access (role, feature_id)
SELECT 'admin', feature_id FROM features
ON CONFLICT (role, feature_id) DO NOTHING;

INSERT INTO role_feature_access (role, feature_id)
SELECT 'business_developer', feature_id FROM features
WHERE name IN ('Dashboard', 'Orders', 'Order History')
ON CONFLICT (role, feature_id) DO NOTHING;

INSERT INTO role_feature_access (role, feature_id)
SELECT 'creatives', feature_id FROM features
WHERE name IN ('Dashboard', 'Inventory')
ON CONFLICT (role, feature_id) DO NOTHING;

INSERT INTO role_feature_access (role, feature_id)
SELECT 'director', feature_id FROM features
ON CONFLICT (role, feature_id) DO NOTHING;

INSERT INTO role_feature_access (role, feature_id)
SELECT 'sales_manager', feature_id FROM features
WHERE name IN ('Dashboard', 'Orders', 'Order History', 'Inventory')
ON CONFLICT (role, feature_id) DO NOTHING;

INSERT INTO role_feature_access (role, feature_id)
SELECT 'assistant_sales', feature_id FROM features
WHERE name IN ('Dashboard', 'Orders', 'Inventory')
ON CONFLICT (role, feature_id) DO NOTHING;

INSERT INTO role_feature_access (role, feature_id)
SELECT 'packer', feature_id FROM features
WHERE name IN ('Dashboard', 'Orders', 'Inventory')
ON CONFLICT (role, feature_id) DO NOTHING;

-- Insert sample inventory items
INSERT INTO inventory_items (sku, name, description, quantity, unit_price, category)
VALUES
    ('WRAP001', 'Basic Gift Wrap', 'Standard gift wrapping paper', 100, 2.99, 'Wrapping Paper'),
    ('WRAP002', 'Premium Gift Wrap', 'High-quality gift wrapping paper', 50, 4.99, 'Wrapping Paper'),
    ('BOW001', 'Standard Bow', 'Regular gift bow', 200, 1.99, 'Accessories'),
    ('BOW002', 'Premium Bow', 'Luxury gift bow', 100, 3.99, 'Accessories'),
    ('TAG001', 'Gift Tag', 'Standard gift tag', 500, 0.99, 'Accessories'),
    ('BOX001', 'Small Gift Box', 'Small sized gift box', 75, 2.99, 'Boxes'),
    ('BOX002', 'Medium Gift Box', 'Medium sized gift box', 50, 4.99, 'Boxes'),
    ('BOX003', 'Large Gift Box', 'Large sized gift box', 25, 6.99, 'Boxes')
ON CONFLICT (sku) DO NOTHING;

-- Down Migration:
DELETE FROM inventory_items WHERE sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003');
DELETE FROM role_feature_access;
DELETE FROM features;
DELETE FROM users WHERE email = 'admin@wraptrack.com'; 