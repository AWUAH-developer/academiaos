/**
 * Secure credential storage — wraps the OS keychain/credential-store via keytar.
 *
 * Windows : Windows Credential Manager
 * macOS   : Keychain
 * Linux   : libsecret / GNOME Keyring / KWallet
 *
 * Stored credentials:
 *   - accessToken  (rotated frequently)
 *   - refreshToken (long-lived, revocable server-side)
 *   - dbKey        (local SQLite encryption key — generated once per device)
 *
 * Never stored here:
 *   - Passwords
 *   - Database content
 *   - School data
 */
import keytar from 'keytar';

const SERVICE = 'AcademiaOS';

export const ACCOUNT_ACCESS_TOKEN  = 'access_token';
export const ACCOUNT_REFRESH_TOKEN = 'refresh_token';
export const ACCOUNT_DB_KEY        = 'db_encryption_key';
export const ACCOUNT_DEVICE_ID     = 'device_id';

export async function saveCredential(account: string, value: string): Promise<void> {
  await keytar.setPassword(SERVICE, account, value);
}

export async function getCredential(account: string): Promise<string | null> {
  return keytar.getPassword(SERVICE, account);
}

export async function deleteCredential(account: string): Promise<void> {
  await keytar.deletePassword(SERVICE, account);
}

export async function clearAllCredentials(): Promise<void> {
  await Promise.allSettled([
    deleteCredential(ACCOUNT_ACCESS_TOKEN),
    deleteCredential(ACCOUNT_REFRESH_TOKEN),
  ]);
  // Note: we deliberately keep ACCOUNT_DB_KEY and ACCOUNT_DEVICE_ID on logout
  // so the local encrypted database remains accessible after re-login.
}

/** Generate and persist a new database encryption key if one doesn't exist */
export async function ensureDbKey(): Promise<string> {
  const existing = await getCredential(ACCOUNT_DB_KEY);
  if (existing) return existing;
  const { randomBytes } = await import('crypto');
  const key = randomBytes(32).toString('hex'); // 256-bit key
  await saveCredential(ACCOUNT_DB_KEY, key);
  return key;
}
