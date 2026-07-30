/**
 * AcademiaOS Desktop — Local encrypted SQLite database
 *
 * Library  : better-sqlite3-multiple-ciphers 12.11.1
 * API      : synchronous (safe in Electron main process)
 *
 * DATABASE CIPHER: SQLEET
 *   better-sqlite3-multiple-ciphers supports multiple ciphers.  AcademiaOS
 *   uses the library default cipher, which is sqleet (an independent
 *   AES-256-CBC variant).  No cipher-selection PRAGMA is issued; the library
 *   activates sqleet when only PRAGMA key is applied.
 *   Do NOT describe this database as SQLCipher-encrypted — it is sqleet.
 *
 * Encryption:
 *   - Key is a 256-bit random hex string generated once per device.
 *   - Key is stored in the OS credential store (Electron safeStorage/DPAPI).
 *   - Key is applied via `PRAGMA key` BEFORE any schema access or query.
 *   - The resulting .db file is unreadable as plain SQLite.
 *
 * Startup:
 *   1. main.ts calls ensureDbKey() → gets or creates the encryption key.
 *   2. main.ts calls initializeDb(key) → opens the DB, applies key, creates schema.
 *   3. setupIpcHandlers() is called — all handlers use getDb() synchronously.
 *
 * Migration path (dev → production):
 *   If a plaintext SQLite database exists on disk (from an earlier dev build
 *   that lacked encryption), openOrMigrate() detects it and re-encrypts it
 *   in-place using sqlcipher_export().  sqlcipher_export() is a utility
 *   function included in better-sqlite3-multiple-ciphers that exports with
 *   the currently active cipher (sqleet in this case) — it is a function
 *   name, not an indicator that SQLCipher is being used.
 *   The plaintext file is renamed to .plaintext-backup (not deleted) as a
 *   safety net.
 *
 * Proof of encryption:
 *   After AcademiaOS signs in and caches data:
 *     $ sqlite3 ~/.config/AcademiaOS/academiaos.db ".tables"
 *   → "Error: file is not a database" confirms encryption is active.
 */
import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// ── Module-level singleton ────────────────────────────────────────────────────
let _db: InstanceType<typeof Database> | null = null;

/**
 * Open (or migrate) the local database with the provided encryption key.
 * Must be called from the main process before any IPC handler invokes getDb().
 */
export function initializeDb(encryptionKey: string): void {
  if (_db) return; // already initialized
  const dbPath = path.join(app.getPath('userData'), 'academiaos.db');
  _db = openOrMigrate(dbPath, encryptionKey);
  applyPragmas(_db);
  createSchema(_db);
}

/**
 * Return the open database handle.
 * Throws if initializeDb() has not been called yet.
 */
export function getDb(): InstanceType<typeof Database> {
  if (!_db) throw new Error('Database not initialized. Call initializeDb() first.');
  return _db;
}

// ── Open / migration logic ────────────────────────────────────────────────────
function openOrMigrate(dbPath: string, key: string): InstanceType<typeof Database> {
  // ── Attempt 1: open as already-encrypted DB ──────────────────────────────
  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      db.pragma(`key = "${key}"`);
      // Probe: if the key is wrong or the file is plaintext, this throws
      db.prepare('SELECT count(*) FROM sqlite_master').get();
      return db; // ✓ encrypted DB, correct key
    } catch {
      // Fall through to migration check
    }

    // ── Attempt 2: is it a plaintext (dev) database? ─────────────────────
    try {
      const plainDb = new Database(dbPath);
      plainDb.prepare('SELECT count(*) FROM sqlite_master').get();
      // It IS plaintext — perform in-place encryption
      const encPath = dbPath + '.encrypting';
      plainDb.exec(`ATTACH DATABASE '${encPath}' AS encrypted KEY "${key}"`);
      plainDb.exec(`SELECT sqlcipher_export('encrypted')`);
      plainDb.exec(`DETACH DATABASE encrypted`);
      plainDb.close();

      // Rename safely: keep plaintext as backup, promote encrypted to canonical path
      const backupPath = dbPath + '.plaintext-backup';
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      fs.renameSync(dbPath, backupPath);
      fs.renameSync(encPath, dbPath);

      // Now open the freshly-encrypted DB
      const encDb = new Database(dbPath);
      encDb.pragma(`key = "${key}"`);
      encDb.prepare('SELECT count(*) FROM sqlite_master').get(); // sanity check
      return encDb; // ✓ migrated and encrypted
    } catch {
      // Both attempts failed — DB is corrupted or incompatible
      // Back it up and start fresh
      const corruptPath = dbPath + `.corrupt-${Date.now()}`;
      fs.renameSync(dbPath, corruptPath);
    }
  }

  // ── Fresh database (first run or after corrupt backup) ───────────────────
  const db = new Database(dbPath);
  db.pragma(`key = "${key}"`);
  return db;
}

// ── Pragmas ───────────────────────────────────────────────────────────────────
function applyPragmas(db: InstanceType<typeof Database>): void {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -8000'); // 8 MB page cache
}

// ── Schema ────────────────────────────────────────────────────────────────────
function createSchema(db: InstanceType<typeof Database>): void {
  db.exec(`
    -- Device identity
    CREATE TABLE IF NOT EXISTS device_meta (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      device_id     TEXT    NOT NULL,
      device_name   TEXT,
      platform      TEXT    NOT NULL DEFAULT 'windows',
      app_version   TEXT,
      user_id       TEXT,
      school_id     TEXT,
      school_name   TEXT,
      role          TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Cached session metadata
    -- (Tokens live in OS vault via safeStorage — never here)
    CREATE TABLE IF NOT EXISTS local_session (
      id                INTEGER PRIMARY KEY CHECK (id = 1),
      server_session_id TEXT NOT NULL,
      device_id         TEXT NOT NULL,
      access_expires    TEXT NOT NULL,
      refresh_expires   TEXT NOT NULL,
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Sync state per entity type
    CREATE TABLE IF NOT EXISTS sync_cursor (
      entity_type   TEXT PRIMARY KEY,
      last_synced   TEXT NOT NULL,
      record_count  INTEGER NOT NULL DEFAULT 0
    );

    -- Reference data caches
    CREATE TABLE IF NOT EXISTS cached_learners (
      id              TEXT PRIMARY KEY,
      school_id       TEXT NOT NULL,
      admission_no    TEXT NOT NULL,
      first_name      TEXT NOT NULL,
      last_name       TEXT NOT NULL,
      class_id        TEXT,
      status          TEXT NOT NULL DEFAULT 'ACTIVE',
      photo_url       TEXT,
      badge_code      TEXT UNIQUE,
      gender          TEXT,
      date_of_birth   TEXT,
      payment_plan    TEXT,
      data_json       TEXT,
      synced_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cached_classes (
      id          TEXT PRIMARY KEY,
      school_id   TEXT NOT NULL,
      name        TEXT NOT NULL,
      stream      TEXT,
      level       TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      synced_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cached_staff (
      id          TEXT PRIMARY KEY,
      school_id   TEXT NOT NULL,
      name        TEXT NOT NULL,
      username    TEXT NOT NULL,
      role        TEXT NOT NULL,
      status      TEXT NOT NULL,
      photo_url   TEXT,
      synced_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cached_fee_cats (
      id            TEXT PRIMARY KEY,
      school_id     TEXT NOT NULL,
      name          TEXT NOT NULL,
      code          TEXT NOT NULL,
      is_canteen    INTEGER NOT NULL DEFAULT 0,
      is_daily      INTEGER NOT NULL DEFAULT 0,
      synced_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Offline operation outbox
    CREATE TABLE IF NOT EXISTS outbox (
      id                TEXT PRIMARY KEY,
      idempotency_key   TEXT NOT NULL UNIQUE,
      device_id         TEXT NOT NULL,
      user_id           TEXT NOT NULL,
      school_id         TEXT NOT NULL,
      operation_type    TEXT NOT NULL,
      payload_json      TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'PENDING',
        -- PENDING | UPLOADING | SYNCED | CONFLICT | REJECTED
      error_message     TEXT,
      record_version    INTEGER,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      attempted_at      TEXT,
      synced_at         TEXT
    );

    -- Conflicts requiring manual review
    CREATE TABLE IF NOT EXISTS conflicts (
      id              TEXT PRIMARY KEY,
      outbox_id       TEXT NOT NULL REFERENCES outbox(id),
      operation_type  TEXT NOT NULL,
      client_payload  TEXT NOT NULL,
      server_value    TEXT,
      reason          TEXT,
      resolved        INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at     TEXT
    );

    -- Offline attendance cache
    CREATE TABLE IF NOT EXISTS cached_attendance (
      id              TEXT PRIMARY KEY,
      school_id       TEXT NOT NULL,
      learner_id      TEXT NOT NULL,
      date            TEXT NOT NULL,
      status          TEXT NOT NULL,
      check_in_time   TEXT,
      check_out_time  TEXT,
      reason          TEXT,
      is_local        INTEGER NOT NULL DEFAULT 0,
      synced_at       TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS cached_att_learner_date
      ON cached_attendance(learner_id, date);

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_learner_badge  ON cached_learners(badge_code);
    CREATE INDEX IF NOT EXISTS idx_learner_class  ON cached_learners(class_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_status  ON outbox(status, created_at);
  `);
}

// ── Query helpers ─────────────────────────────────────────────────────────────
export function upsertLearners(
  db: InstanceType<typeof Database>,
  rows: Record<string, unknown>[],
): void {
  const stmt = db.prepare(`
    INSERT INTO cached_learners
      (id, school_id, admission_no, first_name, last_name, class_id, status,
       photo_url, badge_code, gender, date_of_birth, payment_plan, data_json, synced_at)
    VALUES
      (@id, @school_id, @admission_no, @first_name, @last_name, @class_id, @status,
       @photo_url, @badge_code, @gender, @date_of_birth, @payment_plan, @data_json, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      admission_no = excluded.admission_no,
      first_name   = excluded.first_name,
      last_name    = excluded.last_name,
      class_id     = excluded.class_id,
      status       = excluded.status,
      photo_url    = excluded.photo_url,
      badge_code   = excluded.badge_code,
      gender       = excluded.gender,
      date_of_birth = excluded.date_of_birth,
      payment_plan = excluded.payment_plan,
      data_json    = excluded.data_json,
      synced_at    = datetime('now')
  `);

  const upsertMany = db.transaction((items: Record<string, unknown>[]) => {
    for (const item of items) stmt.run(item);
  });

  upsertMany(
    rows.map((r) => ({
      id: r.id,
      school_id:    r.schoolId,
      admission_no: r.admissionNo,
      first_name:   r.firstName,
      last_name:    r.lastName,
      class_id:     r.classId ?? null,
      status:       r.status,
      photo_url:    r.photoUrl    ?? null,
      badge_code:   r.badgeCode   ?? null,
      gender:       r.gender      ?? null,
      date_of_birth: r.dateOfBirth ?? null,
      payment_plan: r.paymentPlan ?? null,
      data_json:    JSON.stringify(r),
    })),
  );
}

export function addToOutbox(
  db: InstanceType<typeof Database>,
  op: {
    id: string; idempotencyKey: string; deviceId: string; userId: string;
    schoolId: string; operationType: string; payload: unknown; recordVersion?: number;
  },
): void {
  db.prepare(`
    INSERT INTO outbox
      (id, idempotency_key, device_id, user_id, school_id,
       operation_type, payload_json, record_version)
    VALUES
      (@id, @idk, @device_id, @user_id, @school_id,
       @op_type, @payload, @rv)
  `).run({
    id:        op.id,
    idk:       op.idempotencyKey,
    device_id: op.deviceId,
    user_id:   op.userId,
    school_id: op.schoolId,
    op_type:   op.operationType,
    payload:   JSON.stringify(op.payload),
    rv:        op.recordVersion ?? null,
  });
}

export function getPendingOps(db: InstanceType<typeof Database>): unknown[] {
  return db
    .prepare(`SELECT * FROM outbox WHERE status = 'PENDING' ORDER BY created_at`)
    .all();
}

export function markOpStatus(
  db: InstanceType<typeof Database>,
  id: string,
  status: string,
  error?: string,
): void {
  db.prepare(`
    UPDATE outbox
    SET status        = @status,
        error_message = @error,
        attempted_at  = datetime('now'),
        synced_at     = CASE WHEN @status = 'SYNCED' THEN datetime('now') ELSE synced_at END
    WHERE id = @id
  `).run({ id, status, error: error ?? null });
}

export function upsertStaff(
  db: InstanceType<typeof Database>,
  rows: Record<string, unknown>[],
): void {
  const statement = db.prepare(`
    INSERT INTO cached_staff
      (id, school_id, name, username, role, status, photo_url, synced_at)
    VALUES
      (@id, @school_id, @name, @username, @role, @status, @photo_url, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      school_id = excluded.school_id,
      name = excluded.name,
      username = excluded.username,
      role = excluded.role,
      status = excluded.status,
      photo_url = excluded.photo_url,
      synced_at = datetime('now')
  `);

  const saveRows = db.transaction((items: Record<string, unknown>[]) => {
    for (const row of items) {
      statement.run({
        id: String(row.id ?? ''),
        school_id: String(row.schoolId ?? row.school_id ?? ''),
        name: String(row.name ?? ''),
        username: String(row.username ?? ''),
        role: String(row.role ?? ''),
        status: String(row.status ?? 'ACTIVE'),
        photo_url: row.photoUrl ?? row.photo_url ?? null,
      });
    }
  });

  saveRows(rows);
}
