/**
 * AcademiaOS — Superadmin Secure Password Recovery
 *
 * PURPOSE
 *   One-time manual command that sets a new bcrypt hash for the superadmin
 *   account, forces a password change on next login, and clears all active
 *   sessions.
 *
 * USAGE
 *   1. Set the recovery password as a Replit Secret:
 *        SUPERADMIN_RECOVERY_PASSWORD=<your-strong-password>
 *      Never put this value in source code, git, or chat.
 *
 *   2. Run this script ONCE:
 *        node artifacts/academia-os/scripts/superadmin-recovery.mjs
 *
 *   3. Log in to production immediately and change the password via the
 *      web UI account settings.
 *
 *   4. Remove the SUPERADMIN_RECOVERY_PASSWORD secret from Replit.
 *
 * WHAT IT DOES
 *   - Reads the recovery password from SUPERADMIN_RECOVERY_PASSWORD env var.
 *   - bcrypt-hashes it server-side (cost factor 12).
 *   - Sets the superadmin password_hash, status = 'ACTIVE', locked_until = NULL,
 *     failed_login_count = 0, must_change_password = TRUE.
 *   - Deletes all desktop/mobile sessions for the superadmin user ID.
 *   - Deletes login_attempt records for 'superadmin'.
 *   - Logs success without logging the plaintext password.
 *
 * WHAT IT DOES NOT DO
 *   - It does NOT run automatically on startup.
 *   - It does NOT modify any data other than the superadmin user row.
 *   - It does NOT log the plaintext password at any point.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('[recovery] FATAL: DATABASE_URL is not set.');
  process.exit(1);
}
if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  console.error('[recovery] FATAL: DATABASE_URL is not a PostgreSQL connection string.');
  process.exit(1);
}

const recoveryPassword = process.env.SUPERADMIN_RECOVERY_PASSWORD?.trim();
if (!recoveryPassword) {
  console.error(
    '[recovery] FATAL: SUPERADMIN_RECOVERY_PASSWORD is not set.\n' +
    '  Set it as a Replit Secret, then run this script again.\n' +
    '  Remove the secret immediately after confirming production login.'
  );
  process.exit(1);
}

if (recoveryPassword.length < 12) {
  console.error('[recovery] FATAL: SUPERADMIN_RECOVERY_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

// Prevent accidental use against a dev database
const isProd = databaseUrl.includes('neon.tech') ||
               databaseUrl.includes('supabase') ||
               process.env.NODE_ENV === 'production' ||
               process.env.FORCE_RECOVERY === '1';

if (!isProd) {
  console.warn(
    '[recovery] WARNING: DATABASE_URL does not look like a production database.\n' +
    '  Set FORCE_RECOVERY=1 to override this check.'
  );
  process.exit(1);
}

console.log('[recovery] Connecting to database…');
const { Pool } = await import('pg');
const bcrypt = (await import('bcryptjs')).default ?? (await import('bcryptjs'));

const pool = new Pool({ connectionString: databaseUrl });

try {
  // 1. Verify the superadmin user exists
  const { rows: users } = await pool.query(
    `SELECT id, username FROM users WHERE username = 'superadmin' LIMIT 1`
  );
  if (users.length === 0) {
    console.error('[recovery] FATAL: No user with username = \'superadmin\' found in the database.');
    process.exit(1);
  }
  const superadminId = users[0].id;
  console.log('[recovery] Superadmin user found. Setting new credentials…');

  // 2. Hash the recovery password
  const hash = await bcrypt.hash(recoveryPassword, 12);

  // 3. Update the superadmin row
  await pool.query(
    `UPDATE users
     SET
       password_hash        = $1,
       failed_login_count   = 0,
       locked_until         = NULL,
       status               = 'ACTIVE',
       must_change_password = true,
       updated_at           = now()
     WHERE id = $2`,
    [hash, superadminId]
  );
  console.log('[recovery] Password hash updated. must_change_password = true.');

  // 4. Revoke all desktop/mobile sessions for this user
  const { rowCount: sessionCount } = await pool.query(
    `DELETE FROM mobile_sessions WHERE device_id IN (
       SELECT id FROM mobile_devices WHERE user_id = $1
     )`,
    [superadminId]
  );
  console.log(`[recovery] Revoked ${sessionCount ?? 0} active device session(s).`);

  // 5. Clear login attempt history
  await pool.query(`DELETE FROM login_attempts WHERE username = 'superadmin'`);
  console.log('[recovery] Cleared login_attempts records.');

  console.log(
    '\n[recovery] ✓ Complete.\n' +
    '  → Log in to production immediately and change the superadmin password\n' +
    '    via the web UI Account Settings page.\n' +
    '  → Then remove the SUPERADMIN_RECOVERY_PASSWORD Replit Secret.'
  );
} finally {
  await pool.end();
}
