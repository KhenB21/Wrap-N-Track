-- Migration 032: Showcase Bundles table for dynamic gallery management
CREATE TABLE IF NOT EXISTS showcase_bundles (
  id               SERIAL PRIMARY KEY,
  category         VARCHAR(20)  NOT NULL CHECK (category IN ('wedding', 'corporate', 'bespoke')),
  title            VARCHAR(255) NOT NULL,
  description      TEXT         NOT NULL,
  cover_image      BYTEA,
  cover_image_mime VARCHAR(50),
  created_by       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_active        BOOLEAN      NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_showcase_bundles_category ON showcase_bundles(category);
CREATE INDEX IF NOT EXISTS idx_showcase_bundles_active   ON showcase_bundles(is_active);
