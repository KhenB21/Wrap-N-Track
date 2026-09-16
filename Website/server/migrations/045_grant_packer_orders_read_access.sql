-- Migration 045: Grant packer read-only access to the Orders page
-- Packer keeps its read-only enforcement (server routes only expose GET
-- endpoints to this role; order status update stays admin/sales-only).

INSERT INTO role_feature_access (role, feature_id)
SELECT 'packer', feature_id FROM features
WHERE name = 'Orders'
ON CONFLICT (role, feature_id) DO NOTHING;
