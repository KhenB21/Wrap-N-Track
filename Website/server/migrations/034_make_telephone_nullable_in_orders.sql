-- Migration 034: make orders.telephone nullable
--
-- Migration 001 created orders.telephone as NOT NULL. Migration 015 used
-- CREATE TABLE IF NOT EXISTS so it was a no-op and left the constraint in
-- place. Customer-facing orders (bundle detail page) only capture a mobile
-- number (cellphone); landline (telephone) is a legacy field that is no
-- longer required. Dropping the NOT NULL constraint restores correct
-- behaviour without removing the column or discarding existing data.

ALTER TABLE orders ALTER COLUMN telephone DROP NOT NULL;
