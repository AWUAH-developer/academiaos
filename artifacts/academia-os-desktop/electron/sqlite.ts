/**
 * Local encrypted SQLite database
 *
 * Uses better-sqlite3 (synchronous API — safe in main process).
 * In production, swap to better-sqlite3-multiple-ciphers or
 * @journeyapps/sqlcipher for full SQLCipher at-rest encryption.
 * The schema and all code below are encryption-library agnostic.
 *
 * Schema overview:
 *   device_meta        — device identifier, version, last seen
 *   local_session      — cached auth session (no plaintext tokens)
 *   sync_cursor        — last successful sync timestamp per entity
 *   cached_learners    — offline learner records
 *   cached_classes     — class/stream lookup
 *   cached_staff       — staff profiles
 *   cached_fee_cats    — fee categories
 *   outbox             — pending offline mutations (PENDING→UPLOADING→SYNCED/CONFLICT/REJECTED)
 *   conflicts          — records needing manual resolution
 */
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.join(app.getPath('userData'), 'academiaos.db');
  _db = new Database(dbPath);

  // Performance pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('temp_store = MEMORY');

  // NOTE: For SQLCipher encryption, add here:
  // _db.pragma(`key = '${encryptionKey}'`);

  createSchema(_db);
  return _db;
}

function createSchema(db: Database.Database): void {
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

    -- Cached session metadata (tokens live in OS keychain, NOT here)
    CREATE TABLE IF NOT EXISTS local_session (
      id              INTEGER PRIMARY KEY CHECK (id = 1),
      server_session_id TEXT NOT NULL,
      device_id       TEXT NOT NULL,
      access_expires  TEXT NOT NULL,
      refresh_expires TEXT NOT NULL,
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Sync state per entity type
    CREATE TABLE IF NOT EXISTS sync_cursor (
      entity_type   TEXT PRIMARY KEY,
      last_synced   TEXT NOT NULL,
      record_count  INTEGER NOT NULL DEFAULT 0
    );

    -- Cached reference data
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
      data_json       TEXT,   -- full learner JSON blob
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
      id                TEXT PRIMARY KEY,          -- client UUID
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

    -- Cached attendance (for offline display + edit detection)
    CREATE TABLE IF NOT EXISTS cached_attendance (
      id              TEXT PRIMARY KEY,
      school_id       TEXT NOT NULL,
      learner_id      TEXT NOT NULL,
      date            TEXT NOT NULL,
      status          TEXT NOT NULL,
      check_in_time   TEXT,
      check_out_time  TEXT,
      reason          TEXT,
      is_local        INTEGER NOT NULL DEFAULT 0,  -- 1 = not yet synced to server
      synced_at       TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS cached_att_learner_date ON cached_attendance(learner_id, date);

    -- Index for quick learner lookup
    CREATE INDEX IF NOT EXISTS idx_learner_badge ON cached_learners(badge_code);
    CREATE INDEX IF NOT EXISTS idx_learner_class  ON cached_learners(class_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_status  ON outbox(status, created_at);
  `);
}

// ── Query helpers ─────────────────────────────────────────────────────────────
export function upsertLearners(db: Database.Database, rows: Record<string, unknown>[]): void {
  const stmt = db.prepare(`
    INSERT INTO cached_learners
      (id, school_id, admission_no, first_name, last_name, class_id, status,
       photo_url, badge_code, gender, date_of_birth, payment_plan, data_json, synced_at)
    VALUES
      (@id, @school_id, @admission_no, @first_name, @last_name, @class_id, @status,
       @photo_url, @badge_code, @gender, @date_of_birth, @payment_plan, @data_json, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      admission_no = excluded.admission_no, first_name = excluded.first_name,
      last_name = excluded.last_name, class_id = excluded.class_id, status = excluded.status,
      photo_url = excluded.photo_url, badge_code = excluded.badge_code,
      gender = excluded.gender, date_of_birth = excluded.date_of_birth,
      payment_plan = excluded.payment_plan, data_json = excluded.data_json,
      synced_at = datetime('now')
  `);
  const upsertMany = db.transaction((items: Record<string, unknown>[]) => {
    for (const item of items) stmt.run(item);
  });
  upsertMany(rows.map((r) => ({
    id: r.id, school_id: r.schoolId, admission_no: r.admissionNo,
    first_name: r.firstName, last_name: r.lastName, class_id: r.classId ?? null,
    status: r.status, photo_url: r.photoUrl ?? null, badge_code: r.badgeCode ?? null,
    gender: r.gender ?? null, date_of_birth: r.dateOfBirth ?? null,
    payment_plan: r.paymentPlan ?? null, data_json: JSON.stringify(r),
  })));
}

export function addToOutbox(db: Database.Database, op: {
  id: string; idempotencyKey: string; deviceId: string; userId: string; schoolId: string;
  operationType: string; payload: unknown; recordVersion?: number;
}): void {
  db.prepare(`
    INSERT INTO outbox (id, idempotency_key, device_id, user_id, school_id,
      operation_type, payload_json, record_version)
    VALUES (@id, @idempotency_key, @device_id, @user_id, @school_id,
      @operation_type, @payload_json, @record_version)
  `).run({
    id: op.id, idempotency_key: op.idempotencyKey, device_id: op.deviceId,
    user_id: op.userId, school_id: op.schoolId, operation_type: op.operationType,
    payload_json: JSON.stringify(op.payload), record_version: op.recordVersion ?? null,
  });
}

export function getPendingOps(db: Database.Database): unknown[] {
  return db.prepare(`SELECT * FROM outbox WHERE status = 'PENDING' ORDER BY created_at`).all();
}

export function markOpStatus(db: Database.Database, id: string, status: string, error?: string): void {
  db.prepare(`
    UPDATE outbox SET status = @status, error_message = @error, attempted_at = datetime('now'),
      synced_at = CASE WHEN @status = 'SYNCED' THEN datetime('now') ELSE synced_at END
    WHERE id = @id
  `).run({ id, status, error: error ?? null });
}
