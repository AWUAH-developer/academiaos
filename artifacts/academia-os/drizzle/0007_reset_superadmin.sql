-- Migration 0007: Reset superadmin password and clear lockout
-- New password: Kwaku@2026
UPDATE users
SET
  password_hash     = '$2b$12$/0MLsrMob/s46RvKA8/7Ae0h64sUM0G6auL/Duj.eMhMLiecbvoYK',
  failed_login_count = 0,
  locked_until      = NULL,
  status            = 'ACTIVE',
  must_change_password = false,
  updated_at        = now()
WHERE username = 'superadmin';

-- Clear all login attempt records for superadmin so rate limiter resets
DELETE FROM login_attempts WHERE username = 'superadmin';
