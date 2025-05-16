-- Migration: 003_add_khen_user
-- Description: Add Khen user with admin role
-- Created: 2024-03-20

-- Up Migration:
-- Insert Khen user (password: 123)
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES (
    'Khen',
    'khen@gmail.com',
    '$2b$10$14AVGRFYUQUcGXGDlejXM.TV38j7oSeXQCAyJRHNHyprww.hRHPoC',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Down Migration:
DELETE FROM users WHERE email = 'khen@gmail.com'; 