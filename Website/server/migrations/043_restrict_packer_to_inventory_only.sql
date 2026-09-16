-- Migration 043: Restrict packer role to Inventory-only access
-- Migration 021 gave packer read access to Dashboard, Orders, and Order History,
-- but the application (Sidebar.js / usePermissions.js) only grants packer access
-- to Inventory. This migration aligns role_feature_access with that.

DELETE FROM role_feature_access
WHERE role = 'packer'
AND feature_id IN (
    SELECT feature_id FROM features
    WHERE name IN ('Dashboard', 'Orders', 'Order History')
);
