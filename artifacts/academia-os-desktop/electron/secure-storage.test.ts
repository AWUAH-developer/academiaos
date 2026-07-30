/**
 * AcademiaOS Desktop — Secure Storage Unit Tests
 *
 * Mocks Electron's safeStorage and the fs/path modules to run in Node.js
 * without a live Electron instance.
 *
 * Tests verify:
 *  1. isAsyncEncryptionAvailable is awaited (not used synchronously)
 *  2. result property (not value) is read from decryptStringAsync
 *  3. shouldReEncrypt triggers re-encryption of the stored credential
 *  4. Unavailable async secure storage fails safely (throws, no plaintext)
 *  5. Legacy sync-encrypted credentials are decrypted and migrated to async
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Vault state shared between mock fs calls ──────────────────────────────────
let vaultData: Record<string, string> = {};
let writtenVault: string | null = null;

// ── Mock: electron ────────────────────────────────────────────────────────────
const mockSafeStorage = {
  isAsyncEncryptionAvailable: vi.fn<[], Promise<boolean>>(),
  encryptStringAsync:         vi.fn<[string], Promise<Buffer>>(),
  decryptStringAsync:         vi.fn<[Buffer], Promise<{ result: string; shouldReEncrypt: boolean }>>(),
  isEncryptionAvailable:      vi.fn<[], boolean>(),
  decryptString:              vi.fn<[Buffer], string>(),
  encryptString:              vi.fn<[string], Buffer>(),
};

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
  app: { getPath: vi.fn(() => '/tmp/test') },
}));

// ── Mock: fs ──────────────────────────────────────────────────────────────────
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn((filePath: string) => {
      if (String(filePath).endsWith('.json')) return JSON.stringify(vaultData);
      throw new Error('ENOENT');
    }),
    writeFileSync: vi.fn((_path: string, content: string) => {
      writtenVault = content;
    }),
    renameSync: vi.fn(() => {
      // Simulate atomic write: apply the pending written content to vaultData
      if (writtenVault !== null) {
        vaultData = JSON.parse(writtenVault);
        writtenVault = null;
      }
    }),
  },
}));

// ── Mock: path ────────────────────────────────────────────────────────────────
vi.mock('path', () => ({
  default: { join: vi.fn((...args: string[]) => args.join('/')) },
}));

// ── Helper ────────────────────────────────────────────────────────────────────
function fakeEncrypt(value: string): Buffer {
  return Buffer.from(`encrypted:${value}`, 'utf8');
}

function fakeDecrypt(buf: Buffer): string {
  const s = buf.toString('utf8');
  if (!s.startsWith('encrypted:')) throw new Error('Bad ciphertext');
  return s.slice('encrypted:'.length);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('secure-storage', () => {
  beforeEach(async () => {
    vaultData = {};
    writtenVault = null;
    vi.clearAllMocks();
    // Reset module so each test gets a fresh import with clean mock state
    vi.resetModules();
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('1. isAsyncEncryptionAvailable is awaited before saving a credential', async () => {
    mockSafeStorage.isAsyncEncryptionAvailable.mockResolvedValue(true);
    mockSafeStorage.encryptStringAsync.mockImplementation(async (v: string) => fakeEncrypt(v));

    const { saveCredential } = await import('./secure-storage');
    await saveCredential('test_key', 'secret_value');

    // Must have been called and awaited — the result must have been used
    expect(mockSafeStorage.isAsyncEncryptionAvailable).toHaveBeenCalledTimes(1);
    // Encryption must have proceeded (not short-circuited)
    expect(mockSafeStorage.encryptStringAsync).toHaveBeenCalledWith('secret_value');
    expect(vaultData['test_key']).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('2. result (not value) is read from decryptStringAsync', async () => {
    // Seed an async-encrypted credential
    const encoded = fakeEncrypt('my_token').toString('base64');
    vaultData = { access_token: encoded };

    mockSafeStorage.isAsyncEncryptionAvailable.mockResolvedValue(true);
    mockSafeStorage.decryptStringAsync.mockResolvedValue({
      result: 'my_token',
      shouldReEncrypt: false,
    });

    const { getCredential, ACCOUNT_ACCESS_TOKEN } = await import('./secure-storage');
    const result = await getCredential(ACCOUNT_ACCESS_TOKEN);

    expect(result).toBe('my_token');
    // Confirm decryptStringAsync was called
    expect(mockSafeStorage.decryptStringAsync).toHaveBeenCalledTimes(1);
    // Confirm encryptStringAsync was NOT called (shouldReEncrypt = false)
    expect(mockSafeStorage.encryptStringAsync).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('3. shouldReEncrypt = true triggers re-encryption of the credential', async () => {
    const encoded = fakeEncrypt('db_key_value').toString('base64');
    vaultData = { db_encryption_key: encoded };

    mockSafeStorage.isAsyncEncryptionAvailable.mockResolvedValue(true);
    mockSafeStorage.decryptStringAsync.mockResolvedValue({
      result: 'db_key_value',
      shouldReEncrypt: true,
    });
    mockSafeStorage.encryptStringAsync.mockImplementation(async (v: string) => fakeEncrypt(v));

    const { getCredential, ACCOUNT_DB_KEY } = await import('./secure-storage');
    const result = await getCredential(ACCOUNT_DB_KEY);

    // Value is still returned correctly
    expect(result).toBe('db_key_value');
    // Re-encryption must have been triggered
    expect(mockSafeStorage.encryptStringAsync).toHaveBeenCalledWith('db_key_value');
    // Vault must have been updated
    expect(vaultData['db_encryption_key']).toBeTruthy();
    // Decoded new vault entry must decrypt to the same value
    const newBuf = Buffer.from(vaultData['db_encryption_key'], 'base64');
    expect(fakeDecrypt(newBuf)).toBe('db_key_value');
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('4. unavailable async secure storage fails safely — throws, no plaintext written', async () => {
    mockSafeStorage.isAsyncEncryptionAvailable.mockResolvedValue(false);

    const { saveCredential } = await import('./secure-storage');

    await expect(saveCredential('access_token', 'secret')).rejects.toThrow(
      'Secure storage is not available'
    );

    // Vault must remain empty — nothing written
    expect(Object.keys(vaultData)).toHaveLength(0);
    // encryptStringAsync must never have been called
    expect(mockSafeStorage.encryptStringAsync).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('5. legacy sync-encrypted credentials are decrypted then migrated to async', async () => {
    // Seed a sync-encrypted value (encrypted: prefix simulates old DPAPI blob)
    const legacyEncoded = fakeEncrypt('refresh_token_value').toString('base64');
    vaultData = { refresh_token: legacyEncoded };

    // Async decrypt fails (legacy format not understood by new API)
    mockSafeStorage.isAsyncEncryptionAvailable
      .mockResolvedValueOnce(true)   // getCredential path-1 check
      .mockResolvedValueOnce(true)   // migration check inside path-2
      .mockResolvedValueOnce(true);  // saveCredential security guard
    mockSafeStorage.decryptStringAsync.mockRejectedValue(
      new Error('Unsupported ciphertext format')
    );
    // Sync decrypt succeeds
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    mockSafeStorage.decryptString.mockImplementation(fakeDecrypt);
    // Async re-encrypt succeeds
    mockSafeStorage.encryptStringAsync.mockImplementation(async (v: string) => fakeEncrypt(v));

    const { getCredential, ACCOUNT_REFRESH_TOKEN } = await import('./secure-storage');
    const result = await getCredential(ACCOUNT_REFRESH_TOKEN);

    // Value is returned correctly
    expect(result).toBe('refresh_token_value');
    // Sync path was used as fallback
    expect(mockSafeStorage.decryptString).toHaveBeenCalledTimes(1);
    // Async re-encryption was applied to upgrade the stored credential
    expect(mockSafeStorage.encryptStringAsync).toHaveBeenCalledWith('refresh_token_value');
    // Vault was updated with the new async-encrypted blob
    expect(vaultData['refresh_token']).toBeTruthy();
  });
});
