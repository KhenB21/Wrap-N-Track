-- Migration 035: track last login time for users
--
-- The employee profile page needs a real "last login" timestamp instead of
-- fabricating one client-side. Nullable so existing users show "Never" until
-- their next successful login.

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
