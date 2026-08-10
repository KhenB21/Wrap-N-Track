-- Migration 036: expand users with admin-manageable profile fields
--
-- Powers the redesigned Account Management Add/Edit User form. All columns are
-- nullable so existing rows remain valid with no backfill required. `name` stays
-- the single source of truth for JWTs, login, and every existing `user.name`
-- reader in the app (order attribution, avatar initials, etc.) — the
-- accountManagement routes derive it from first_name/last_name on write instead
-- of every consumer needing to learn about the new columns.
-- `username` is UNIQUE but not tied to authentication (the app still logs
-- employees in by `name`) — it's a profile-only identifier for this pass.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
