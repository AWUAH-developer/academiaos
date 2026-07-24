/**
 * IPC handler registration — called from main.ts.
 * Each handler validates inputs, delegates to secure-storage/sqlite/HTTP,
 * and returns plain serialisable objects to the renderer.
 *
 * IMPORTANT: Never return raw Error objects — only serialisable data.
 */
import { IpcMain } from 'electron';
import https from 'https';
import crypto from 'crypto';
import { app } from 'electron';
import {
  saveCredential, getCredential, clearAllCredentials, ensureDbKey,
  ACCOUNT_ACCESS_TOKEN, ACCOUNT_REFRESH_TOKEN, ACCOUNT_DEVICE_ID,
} from './secure-storage';
import {
  getDb, upsertLearners, addToOutbox, getPendingOps, markOpStatus,
} from './sqlite';

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = 'https://academiaos.cc/api/desktop/v1';
const APP_VERSION = app.getVersion();

// ── HTTP helper ───────────────────────────────────────────────────────────────
function apiRequest(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
  accessToken?: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request({
      hostname: url.hostname,
      port:     443,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':   `AcademiaOS-Desktop/${APP_VERSION}`,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          resolve({ ok: res.statusCode ? res.statusCode < 400 : false, status: res.statusCode ?? 0, data });
        } catch {
          reject(new Error(`JSON parse error (status ${res.statusCode})`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Device identifier ─────────────────────────────────────────────────────────
async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getCredential(ACCOUNT_DEVICE_ID);
  if (existing) return existing;
  const id = `win-${crypto.randomUUID()}`;
  await saveCredential(ACCOUNT_DEVICE_ID, id);
  return id;
}

// ── Handler registration ──────────────────────────────────────────────────────
export function setupIpcHandlers(ipcMain: IpcMain): void {
  // ── auth:login ─────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_, { username, password, deviceName }: { username: string; password: string; deviceName?: string }) => {
    try {
      const deviceId  = await getOrCreateDeviceId();
      await ensureDbKey();
      const res = await apiRequest('/auth/login', 'POST', {
        username, password,
        deviceIdentifier: deviceId,
        deviceName: deviceName ?? `AcademiaOS Desktop (${process.platform})`,
        platform: process.platform === 'darwin' ? 'mac' : process.platform === 'linux' ? 'linux' : 'windows',
        appVersion: APP_VERSION,
      });
      if (!res.ok) return { ok: false, error: (res.data as Record<string, unknown>)?.error };
      const { user, tokens, deviceId: serverDeviceId } = (res.data as Record<string, unknown>)?.data as Record<string, unknown>;
      await saveCredential(ACCOUNT_ACCESS_TOKEN,  (tokens as Record<string, unknown>).accessToken as string);
      await saveCredential(ACCOUNT_REFRESH_TOKEN, (tokens as Record<string, unknown>).refreshToken as string);
      // Persist session metadata in SQLite
      const db = getDb();
      db.prepare(`
        INSERT OR REPLACE INTO device_meta (id, device_id, device_name, platform, app_version, user_id, school_id, school_name, role, updated_at)
        VALUES (1, @device_id, @device_name, @platform, @app_version, @user_id, @school_id, @school_name, @role, datetime('now'))
      `).run({
        device_id: deviceId, device_name: `AcademiaOS Desktop`,
        platform: process.platform, app_version: APP_VERSION,
        user_id: (user as Record<string, unknown>).id,
        school_id: ((user as Record<string, unknown>).school as Record<string, unknown>)?.id ?? null,
        school_name: ((user as Record<string, unknown>).school as Record<string, unknown>)?.name ?? null,
        role: (user as Record<string, unknown>).role,
      });
      return { ok: true, user, tokens, deviceId: serverDeviceId };
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } };
    }
  });

  // ── auth:refresh ───────────────────────────────────────────────────────────
  ipcMain.handle('auth:refresh', async () => {
    try {
      const refreshToken = await getCredential(ACCOUNT_REFRESH_TOKEN);
      if (!refreshToken) return { ok: false, error: { code: 'NO_REFRESH_TOKEN' } };
      const res = await apiRequest('/auth/refresh', 'POST', { refreshToken });
      if (!res.ok) return { ok: false, error: (res.data as Record<string, unknown>)?.error };
      const { tokens } = (res.data as Record<string, unknown>)?.data as Record<string, unknown>;
      await saveCredential(ACCOUNT_ACCESS_TOKEN,  (tokens as Record<string, unknown>).accessToken as string);
      await saveCredential(ACCOUNT_REFRESH_TOKEN, (tokens as Record<string, unknown>).refreshToken as string);
      return { ok: true, tokens };
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } };
    }
  });

  // ── auth:logout ────────────────────────────────────────────────────────────
  ipcMain.handle('auth:logout', async () => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (accessToken) await apiRequest('/auth/logout', 'POST', {}, accessToken).catch(() => {});
    } finally {
      await clearAllCredentials();
    }
    return { ok: true };
  });

  // ── auth:getSession ────────────────────────────────────────────────────────
  ipcMain.handle('auth:getSession', async () => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (!accessToken) return { ok: false, loggedIn: false };
      const res = await apiRequest('/session', 'GET', undefined, accessToken);
      if (!res.ok) return { ok: false, loggedIn: false, error: (res.data as Record<string, unknown>)?.error };
      return { ok: true, loggedIn: true, ...(res.data as Record<string, unknown>)?.data as object };
    } catch {
      return { ok: false, loggedIn: false };
    }
  });

  // ── sync:initial ───────────────────────────────────────────────────────────
  ipcMain.handle('sync:initial', async () => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (!accessToken) return { ok: false, error: { code: 'NOT_AUTHENTICATED' } };
      const res = await apiRequest('/sync/initial', 'POST', {}, accessToken);
      if (!res.ok) return { ok: false, error: (res.data as Record<string, unknown>)?.error };
      const d = (res.data as Record<string, unknown>)?.data as Record<string, unknown>;
      const db = getDb();
      // Cache learners locally
      if (Array.isArray(d.learners) && d.learners.length > 0) {
        upsertLearners(db, d.learners as Record<string, unknown>[]);
      }
      // Update sync cursor
      db.prepare(`INSERT OR REPLACE INTO sync_cursor (entity_type, last_synced, record_count) VALUES (?, ?, ?)`).run('learners', d.syncCursor, (d.learners as unknown[])?.length ?? 0);
      return { ok: true, data: d };
    } catch (err) {
      return { ok: false, error: { code: 'SYNC_ERROR', message: String(err) } };
    }
  });

  // ── sync:incremental ───────────────────────────────────────────────────────
  ipcMain.handle('sync:incremental', async (_, { syncCursor }: { syncCursor: string }) => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (!accessToken) return { ok: false, error: { code: 'NOT_AUTHENTICATED' } };
      const res = await apiRequest('/sync/incremental', 'POST', { syncCursor }, accessToken);
      if (!res.ok) return { ok: false, error: (res.data as Record<string, unknown>)?.error };
      const d = (res.data as Record<string, unknown>)?.data as Record<string, unknown>;
      const db = getDb();
      const changes = d.changes as Record<string, unknown[]>;
      if (changes?.learners?.length) upsertLearners(db, changes.learners as Record<string, unknown>[]);
      db.prepare(`INSERT OR REPLACE INTO sync_cursor (entity_type, last_synced, record_count) VALUES (?, ?, ?)`).run('learners', d.syncCursor, changes?.learners?.length ?? 0);
      return { ok: true, data: d };
    } catch (err) {
      return { ok: false, error: { code: 'SYNC_ERROR', message: String(err) } };
    }
  });

  // ── sync:uploadOutbox ──────────────────────────────────────────────────────
  ipcMain.handle('sync:uploadOutbox', async () => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (!accessToken) return { ok: false, error: { code: 'NOT_AUTHENTICATED' } };
      const db      = getDb();
      const pending = getPendingOps(db) as Array<{
        id: string; idempotency_key: string; device_id: string; user_id: string;
        school_id: string; operation_type: string; payload_json: string; record_version: number | null;
      }>;
      if (!pending.length) return { ok: true, processed: 0 };
      const ops = pending.map((row) => ({
        operationId:    row.id,
        idempotencyKey: row.idempotency_key,
        deviceId:       row.device_id,
        schoolId:       row.school_id,
        type:           row.operation_type,
        payload:        JSON.parse(row.payload_json),
        createdAt:      new Date().toISOString(),
        recordVersion:  row.record_version ?? undefined,
      }));
      pending.forEach((op) => markOpStatus(db, op.id, 'UPLOADING'));
      const res = await apiRequest('/sync/outbox', 'POST', { operations: ops }, accessToken);
      if (!res.ok) {
        pending.forEach((op) => markOpStatus(db, op.id, 'PENDING'));
        return { ok: false, error: (res.data as Record<string, unknown>)?.error };
      }
      const results = ((res.data as Record<string, unknown>)?.data as Record<string, unknown>)?.results as Array<{ operationId: string; status: string; message?: string }>;
      for (const r of results) {
        markOpStatus(db, r.operationId, r.status === 'ALREADY_PROCESSED' ? 'SYNCED' : r.status, r.message);
      }
      return { ok: true, processed: pending.length, results };
    } catch (err) {
      return { ok: false, error: { code: 'UPLOAD_ERROR', message: String(err) } };
    }
  });

  // ── sync:status ────────────────────────────────────────────────────────────
  ipcMain.handle('sync:status', async () => {
    const db      = getDb();
    const cursors = db.prepare(`SELECT * FROM sync_cursor`).all() as Array<{ entity_type: string; last_synced: string; record_count: number }>;
    const pending = db.prepare(`SELECT COUNT(*) as n FROM outbox WHERE status = 'PENDING'`).get() as { n: number };
    const conflicts = db.prepare(`SELECT COUNT(*) as n FROM conflicts WHERE resolved = 0`).get() as { n: number };
    return {
      ok: true,
      cursors,
      pendingOps:    pending.n,
      conflictCount: conflicts.n,
    };
  });

  // ── db:getLearners ─────────────────────────────────────────────────────────
  ipcMain.handle('db:getLearners', async (_, { classId, search }: { classId?: string; search?: string } = {}) => {
    const db   = getDb();
    let sql    = `SELECT * FROM cached_learners WHERE status = 'ACTIVE'`;
    const args: string[] = [];
    if (classId) { sql += ` AND class_id = ?`; args.push(classId); }
    if (search)  { sql += ` AND (first_name LIKE ? OR last_name LIKE ? OR admission_no LIKE ?)`; const q = `%${search}%`; args.push(q, q, q); }
    sql += ` ORDER BY last_name, first_name LIMIT 500`;
    const rows = db.prepare(sql).all(...args);
    return { ok: true, learners: rows };
  });

  // ── db:saveAttendance ──────────────────────────────────────────────────────
  ipcMain.handle('db:saveAttendance', async (_, { learnerId, date, status, schoolId, userId, deviceId }: {
    learnerId: string; date: string; status: string;
    schoolId: string; userId: string; deviceId: string;
  }) => {
    const db  = getDb();
    const id  = crypto.randomUUID();
    const idk = crypto.randomUUID();
    // Save to local cache
    db.prepare(`
      INSERT OR REPLACE INTO cached_attendance (id, school_id, learner_id, date, status, is_local)
      VALUES (@id, @school_id, @learner_id, @date, @status, 1)
    `).run({ id, school_id: schoolId, learner_id: learnerId, date, status });
    // Queue for sync
    addToOutbox(db, {
      id, idempotencyKey: idk, deviceId, userId, schoolId,
      operationType: 'ATTENDANCE_RECORD',
      payload: { learnerId, date, status },
    });
    return { ok: true, operationId: id, idempotencyKey: idk };
  });

  // ── db:getPendingOps ───────────────────────────────────────────────────────
  ipcMain.handle('db:getPendingOps', async () => {
    const db   = getDb();
    const rows = getPendingOps(db);
    return { ok: true, operations: rows };
  });

  // ── db:getConflicts ────────────────────────────────────────────────────────
  ipcMain.handle('db:getConflicts', async () => {
    const db   = getDb();
    const rows = db.prepare(`SELECT * FROM conflicts WHERE resolved = 0 ORDER BY created_at DESC`).all();
    return { ok: true, conflicts: rows };
  });

  // ── app:getVersion ─────────────────────────────────────────────────────────
  ipcMain.handle('app:getVersion', () => ({ ok: true, version: APP_VERSION }));
  ipcMain.handle('app:getPlatform', () => ({ ok: true, platform: process.platform }));
}
