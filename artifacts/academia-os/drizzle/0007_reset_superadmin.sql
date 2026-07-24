-- Migration 0007: Clear superadmin lockout (lockout recovery only)
--
-- This migration clears the account lockout state for the superadmin user
-- so an operator can log in and set a secure password via the web UI.
--
-- It does NOT set password_hash to any known value.
-- Password recovery must be performed separately using the secure
-- provisioning script (scripts/superadmin-recovery.mjs) which reads
-- the temporary recovery password from a Replit Secret.
--
-- This migration is safe to run on an already-unlocked account:
-- resetting failed_login_count to 0 and clearing locked_until is idempotent.

UPDATE users
SET
  failed_login_count   = 0,
  locked_until         = NULL,
  status               = 'ACTIVE',
  must_change_password = true,
  updated_at           = now()
WHERE username = 'superadmin';

-- Remove any lingering rate-limit records so login attempts start fresh.
DELETE FROM login_attempts WHERE username = 'superadmin';
