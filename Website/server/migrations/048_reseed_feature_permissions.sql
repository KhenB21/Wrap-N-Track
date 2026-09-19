-- Migration 048: restore the feature / role-access reference data
--
-- `features` and `role_feature_access` are reference data, not user data, but
-- they live in ordinary tables and were emptied along with everything else when
-- the database was cleared. Empty tables are not an error anywhere: the
-- permissions screen fed by GET /account-management/roles/:role/permissions
-- (routes/accountManagement.js) simply renders nothing, and real access control
-- is enforced client-side in hooks/usePermissions.js, so nobody was locked out
-- or over-granted. It just looked like no role could do anything.
--
-- It also silently neutered migration 045: that INSERT selects the 'Orders'
-- feature by name, and with `features` empty it matched no rows and granted
-- nothing. The packer -> Orders grant is therefore re-applied below rather than
-- left to 045, which will never run again (the runner records it as executed).
--
-- Values mirror the working set from the development database. Both statements
-- are idempotent: re-running changes nothing, and an environment that still has
-- this data is left untouched.

-- 1. The features themselves. `features.name` has no UNIQUE constraint, so this
--    guards with NOT EXISTS rather than ON CONFLICT.
INSERT INTO features (name)
SELECT v.name
FROM (VALUES
    ('Dashboard'),
    ('Inventory'),
    ('Orders'),
    ('Order History'),
    ('Users'),
    ('Settings'),
    ('Showcase Gallery')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM features f WHERE f.name = v.name);

-- Keep the sequence ahead of any rows inserted above.
SELECT setval(
  'features_feature_id_seq',
  COALESCE((SELECT MAX(feature_id) FROM features), 0) + 1,
  false
);

-- 2. Which role sees which feature. Joined by name so it does not depend on
--    feature_id matching between environments.
INSERT INTO role_feature_access (role, feature_id)
SELECT v.role, f.feature_id
FROM (VALUES
    ('admin', 'Dashboard'),
    ('admin', 'Inventory'),
    ('admin', 'Orders'),
    ('admin', 'Order History'),
    ('admin', 'Users'),
    ('admin', 'Settings'),
    ('sales_manager', 'Dashboard'),
    ('sales_manager', 'Inventory'),
    ('sales_manager', 'Orders'),
    ('sales_manager', 'Order History'),
    ('business_developer', 'Dashboard'),
    ('business_developer', 'Orders'),
    ('business_developer', 'Order History'),
    ('assistant_sales', 'Dashboard'),
    ('assistant_sales', 'Inventory'),
    ('assistant_sales', 'Orders'),
    ('creatives', 'Inventory'),
    ('creatives', 'Showcase Gallery'),
    ('packer', 'Inventory'),
    ('packer', 'Orders')
) AS v(role, name)
JOIN features f ON f.name = v.name
ON CONFLICT (role, feature_id) DO NOTHING;
