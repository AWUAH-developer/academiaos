/**
 * AcademiaOS Desktop — Secure Credential Storage
 *
 * Uses Electron 43's asynchronous safeStorage API.
 *
 * Backing store per platform:
 *   Windows : DPAPI (Data Protection API) — user-scoped, machine-tied
 *   macOS   : Keychain
 *   Linux   : libsecret / GNOME Keyring / KWallet
 *
 * API preference (Electron 43):
 *   safeStorage.isAsyncEncryptionAvailable() → Promise<boolean>  (must be awaited)
 *   safeStorage.encryptStringAsync(value)    → Promise<Buffer>
 *   safeStorage.decryptStringAsync(buf)      → Promise<{ result: string, shouldReEncrypt: boolean }>
 *
 *   When shouldReEncrypt is true the credential is atomically re-encrypted
 *   and the vault is updated so future reads use the refreshed key material.
 *
 *   A sync fallback (safeStorage.decryptString) exists ONLY to migrate
 *   credentials written by earlier versions of this module that called
 *   encryptString() synchronously.  Once successfully re-encrypted via the
 *   async path, the sync path is never hit again for that credential.
 *
 * Security properties:
 * - Tokens are NEVER written to the local SQLite database.
 * - Tokens are NEVER stored in localStorage or sessionStorage.
 * - The vault file is unreadable by other OS users (DPAPI is user-scoped).
 * - The DB encryption key is generated once per device; it is never derived
 *   from username, password, school ID or device ID.
 * - If async secure storage is unavailable, the app refuses to store
 *   credentials rather than silently falling back to plaintext.
 */
import { safeStorage, app } from 'electron';
import fs from 'fs';
import path from 'path';

// ── Vault file ─────────────────────────────────────────────────────────────────
// A JSON map: account string → base64-encoded OS-encrypted buffer.
// The file is owned by the Electron process user; other OS users cannot read it.
function vaultPath(): string {
  return path.join(app.getPath('userData'), '.academos-vault.json');
}

type Vault = Record<string, string>; // account → base64(encrypted)

function readVault(): Vault {
  try {
    const raw = fs.readFileSync(vaultPath(), { encoding: 'utf8' });
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Vault) : {};
  } catch {
    return {};
  }
}

function writeVault(vault: Vault): void {
  const p = vaultPath();
  const tmp = `${p}.tmp`;
  // Write to temp file then rename for atomic replacement
  fs.writeFileSync(tmp, JSON.stringify(vault), { mode: 0o600, encoding: 'utf8' });
  fs.renameSync(tmp, p);
}

// ── Account key constants ─────────────────────────────────────────────────────
export const ACCOUNT_ACCESS_TOKEN  = 'access_token';
export const ACCOUNT_REFRESH_TOKEN = 'refresh_token';
export const ACCOUNT_DB_KEY        = 'db_encryption_key';
export const ACCOUNT_DEVICE_ID     = 'device_id';

// ── Encryption guard ──────────────────────────────────────────────────────────
/**
 * Throws with a user-facing message if async safeStorage is unavailable.
 * The app must NOT fall back to plaintext storage for new writes.
 *
 * isAsyncEncryptionAvailable() returns Promise<boolean> in Electron 43 —
 * it MUST be awaited.
 */
async function requireAsyncEncryption(): Promise<void> {
  if (!await safeStorage.isAsyncEncryptionAvailable()) {
    throw new Error(
      'Secure storage is not available on this system. ' +
      'AcademiaOS cannot store credentials safely. ' +
      'Please ensure the OS credential store (DPAPI / Keychain / libsecret) is accessible.'
    );
  }
}

// ── Core operations ───────────────────────────────────────────────────────────

/**
 * Encrypt a string with the async safeStorage API and persist it to the vault.
 * Throws if async encryption is unavailable — never falls back to plaintext.
 */
export async function saveCredential(account: string, value: string): Promise<void> {
  await requireAsyncEncryption();
  const encrypted = await safeStorage.encryptStringAsync(value);
  const vault = readVault();
  vault[account] = encrypted.toString('base64');
  writeVault(vault);
}

/**
 * Retrieve a credential from the vault.
 *
 * Decryption strategy:
 *  1. Try the async API (Electron 43+).
 *     - decryptStringAsync returns { result, shouldReEncrypt }.
 *     - If shouldReEncrypt is true, atomically re-encrypt via saveCredential().
 *  2. If async decryption throws (e.g. a value was encrypted with the legacy
 *     sync API), fall back to safeStorage.decryptString() and immediately
 *     re-encrypt with the async API so future reads use the preferred path.
 *  3. If both paths fail, return null — caller must prompt re-authentication.
 *
 * Returns null if the account is not in the vault.
 */
export async function getCredential(account: string): Promise<string | null> {
  const vault = readVault();
  const encoded = vault[account];
  if (!encoded) return null;

  const buf = Buffer.from(encoded, 'base64');

  // ── Path 1: async API (preferred, Electron 43+) ───────────────────────────
  if (await safeStorage.isAsyncEncryptionAvailable()) {
    try {
      const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(buf);

      if (shouldReEncrypt) {
        // OS indicates key rotation is needed — re-encrypt atomically.
        try {
          await saveCredential(account, result);
        } catch (reEncryptErr) {
          // Log the failure but don't block the read — value is still usable
          // for this session; re-encryption will be retried on next access.
          console.warn(
            `[secure-storage] Re-encryption of '${account}' failed:`,
            (reEncryptErr as Error).message
          );
        }
      }

      return result;
    } catch {
      // Async decrypt failed — may be a legacy sync-encrypted credential.
      // Fall through to sync compatibility path.
    }
  }

  // ── Path 2: sync compatibility (legacy credentials only) ─────────────────
  // This path is hit ONLY if the credential was written by an older version
  // of this file that called safeStorage.encryptString() (sync).
  // On successful decryption we immediately re-encrypt with the async API,
  // so this branch is never hit again for that credential.
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const legacyValue = safeStorage.decryptString(buf);

      // Immediately upgrade to async encryption.
      if (await safeStorage.isAsyncEncryptionAvailable()) {
        try {
          await saveCredential(account, legacyValue);
        } catch (reEncryptErr) {
          console.warn(
            `[secure-storage] Migration re-encryption of '${account}' failed:`,
            (reEncryptErr as Error).message
          );
        }
      }

      return legacyValue;
    } catch {
      // Both paths exhausted — credential is unreadable.
      console.error(
        `[secure-storage] Could not decrypt '${account}'. ` +
        'The credential may have been created on a different machine or user account.'
      );
      return null;
    }
  }

  return null;
}

/**
 * Remove a single credential from the vault.
 */
export async function deleteCredential(account: string): Promise<void> {
  const vault = readVault();
  delete vault[account];
  writeVault(vault);
}

/**
 * Clear auth tokens on logout.
 * Deliberately keeps DB_KEY and DEVICE_ID so the encrypted local database
 * remains accessible after re-login on the same machine.
 */
export async function clearAuthCredentials(): Promise<void> {
  await Promise.allSettled([
    deleteCredential(ACCOUNT_ACCESS_TOKEN),
    deleteCredential(ACCOUNT_REFRESH_TOKEN),
  ]);
}

/**
 * Generate and persist a cryptographically random 256-bit database encryption
 * key if one does not already exist.
 * - Never derived from user data.
 * - Stored via the async safeStorage API.
 * - Throws if safeStorage is unavailable — never stores plaintext.
 */
export async function ensureDbKey(): Promise<string> {
  const existing = await getCredential(ACCOUNT_DB_KEY);
  if (existing) return existing;

  const { randomBytes } = await import('crypto');
  // 32 bytes → 64 hex chars → used as sqleet encryption passphrase
  const key = randomBytes(32).toString('hex');
  await saveCredential(ACCOUNT_DB_KEY, key);
  return key;
}

/**
 * Return the stored DB key without generating a new one.
 * Throws if no key exists — first-time setup must call ensureDbKey() first.
 */
export async function getDbKey(): Promise<string> {
  const key = await getCredential(ACCOUNT_DB_KEY);
  if (!key) throw new Error('No database encryption key found. Call ensureDbKey() first.');
  return key;
}
