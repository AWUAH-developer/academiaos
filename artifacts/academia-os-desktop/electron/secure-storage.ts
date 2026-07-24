/**
 * AcademiaOS Desktop — Secure Credential Storage
 *
 * Uses Electron's built-in safeStorage API (replaces archived keytar).
 *
 * Backing store per platform:
 *   Windows : DPAPI (Data Protection API) — user-scoped, machine-tied
 *   macOS   : Keychain
 *   Linux   : libsecret / GNOME Keyring / KWallet
 *
 * The safeStorage API handles encryption; we persist the opaque encrypted
 * Buffers ourselves as base64 strings in a JSON vault file stored in
 * Electron's app.getPath('userData') directory.
 *
 * Security properties:
 * - Tokens are NEVER written to the local SQLite database.
 * - Tokens are NEVER stored in localStorage or sessionStorage.
 * - The vault file is unreadable by other OS users (DPAPI is user-scoped).
 * - The DB encryption key is generated once per device and stored here;
 *   it is never derived from username, password, school ID or device ID.
 */
import { safeStorage, app } from 'electron';
import fs from 'fs';
import path from 'path';

// ── Vault file ─────────────────────────────────────────────────────────────────
// A JSON map from account string → base64-encoded DPAPI-encrypted buffer.
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
  // Write to temp file then rename for atomic replacement
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(vault), { mode: 0o600, encoding: 'utf8' });
  fs.renameSync(tmp, p);
}

// ── Account key constants ─────────────────────────────────────────────────────
export const ACCOUNT_ACCESS_TOKEN  = 'access_token';
export const ACCOUNT_REFRESH_TOKEN = 'refresh_token';
export const ACCOUNT_DB_KEY        = 'db_encryption_key';
export const ACCOUNT_DEVICE_ID     = 'device_id';

// ── Core operations ───────────────────────────────────────────────────────────
export async function saveCredential(account: string, value: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available on this system. Cannot store credentials securely.');
  }
  const encrypted = safeStorage.encryptString(value);
  const vault = readVault();
  vault[account] = encrypted.toString('base64');
  writeVault(vault);
}

export async function getCredential(account: string): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) return null;
  const vault = readVault();
  const encoded = vault[account];
  if (!encoded) return null;
  try {
    const buf = Buffer.from(encoded, 'base64');
    return safeStorage.decryptString(buf);
  } catch {
    // Decryption failed — key may have changed (e.g. new OS user or reinstall)
    return null;
  }
}

export async function deleteCredential(account: string): Promise<void> {
  const vault = readVault();
  delete vault[account];
  writeVault(vault);
}

/**
 * Clear auth tokens on logout.
 * Deliberately keeps DB_KEY and DEVICE_ID so the local encrypted database
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
 * key if one does not already exist.  Never derived from user data.
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
 * Throws if no key exists (first-time setup must call ensureDbKey first).
 */
export async function getDbKey(): Promise<string> {
  const key = await getCredential(ACCOUNT_DB_KEY);
  if (!key) throw new Error('No database encryption key found. Call ensureDbKey() first.');
  return key;
}
