/**
 * AcademiaOS Desktop — IPC handler registration
 *
 * Called from main.ts AFTER initializeDb() has completed, so getDb()
 * is safe to call synchronously from every handler below.
 *
 * All HTTP communication happens here (main process only).
 * The renderer holds no tokens and makes no direct network requests.
 *
 * Return values must be plain JSON-serialisable objects.
 * Never return Error instances directly.
 */
import { IpcMain } from 'electron';
import https from 'https';
import http, { type IncomingMessage } from 'http';
import crypto from 'crypto';
import { app } from 'electron';
import {
  saveCredential, getCredential, clearAuthCredentials,
  ACCOUNT_ACCESS_TOKEN, ACCOUNT_REFRESH_TOKEN, ACCOUNT_DEVICE_ID,
} from './secure-storage';
import {
  getDb, upsertLearners, upsertClasses, upsertStaff, addToOutbox, getPendingOps, markOpStatus,
} from './sqlite';

// ── Config ─────────────────────────────────────────────────────────────────────
const API_BASE    = 'https://academiaos.cc/api/desktop/v1';
const APP_VERSION = app.getVersion();

// ── HTTP helper (main-process HTTPS only) ──────────────────────────────────────
function apiRequest(
  urlPath: string,
  method: 'GET' | 'POST',
  body?: unknown,
  accessToken?: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url     = new URL(`${API_BASE}${urlPath}`);
    const payload = body ? JSON.stringify(body) : undefined;

    const req = https.request(
      {
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
        timeout: 30_000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve({ ok: (res.statusCode ?? 0) < 400, status: res.statusCode ?? 0, data });
          } catch {
            reject(new Error(`JSON parse error (HTTP ${res.statusCode})`));
          }
        });
      },
    );

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}


function resolveImageUrl(rawUrl: string): URL {
  const value = String(rawUrl ?? '').trim();

  if (!value) throw new Error('Logo URL is empty.');
  if (value.startsWith('//')) return new URL(`https:${value}`);

  return new URL(value, 'https://academiaos.cc');
}

function fetchImageDataUrl(
  rawUrl: string,
  accessToken?: string,
  redirectCount = 0,
): Promise<string> {
  if (rawUrl.startsWith('data:image/')) {
    return Promise.resolve(rawUrl);
  }

  if (redirectCount > 5) {
    return Promise.reject(new Error('Too many logo redirects.'));
  }

  const url = resolveImageUrl(rawUrl);
  const isAcademiaHost =
    url.hostname === 'academiaos.cc' ||
    url.hostname.endsWith('.academiaos.cc');

  return new Promise((resolve, reject) => {
    const onResponse = (response: IncomingMessage) => {
      const status = response.statusCode ?? 0;

      if (
        [301, 302, 303, 307, 308].includes(status) &&
        response.headers.location
      ) {
        response.resume();
        const nextUrl = new URL(
          response.headers.location,
          url,
        ).toString();

        fetchImageDataUrl(
          nextUrl,
          accessToken,
          redirectCount + 1,
        ).then(resolve, reject);
        return;
      }

      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error(`Logo request returned HTTP ${status}.`));
        return;
      }

      const mime = String(
        response.headers['content-type'] ?? 'image/png',
      ).split(';')[0].trim();

      if (!mime.startsWith('image/')) {
        response.resume();
        reject(new Error(`Logo response is ${mime}.`));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;

      response.on('data', (chunk: Buffer) => {
        total += chunk.length;

        if (total > 10 * 1024 * 1024) {
          request.destroy(
            new Error('School logo is larger than 10 MB.'),
          );
          return;
        }

        chunks.push(chunk);
      });

      response.on('end', () => {
        const image = Buffer.concat(chunks);
        resolve(
          `data:${mime};base64,${image.toString('base64')}`,
        );
      });
    };

    const options = {
      headers: {
        'User-Agent': `AcademiaOS-Desktop/${APP_VERSION}`,
        Accept: 'image/*',
        ...(accessToken && isAcademiaHost
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
      },
      timeout: 30_000,
    };

    const request =
      url.protocol === 'http:'
        ? http.request(url, options, onResponse)
        : https.request(url, options, onResponse);

    request.on('timeout', () => {
      request.destroy(new Error('Logo request timed out.'));
    });

    request.on('error', reject);
    request.end();
  });
}

// ── Device identifier ──────────────────────────────────────────────────────────
async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getCredential(ACCOUNT_DEVICE_ID);
  if (existing) return existing;
  const id = `win-${crypto.randomUUID()}`;
  await saveCredential(ACCOUNT_DEVICE_ID, id);
  return id;
}

// ── Type helpers ───────────────────────────────────────────────────────────────
type ApiData = Record<string, unknown>;
function data(res: { data: unknown }) {
  return (res.data as ApiData)?.data as ApiData;
}
function errOf(res: { data: unknown }) {
  return (res.data as ApiData)?.error;
}

// ── Handler registration ───────────────────────────────────────────────────────
export function setupIpcHandlers(ipcMain: IpcMain): void {

  // ── auth:login ──────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_, {
    username, password, deviceName,
  }: { username: string; password: string; deviceName?: string }) => {
    try {
      const deviceId = await getOrCreateDeviceId();
      const platform = process.platform === 'darwin' ? 'mac'
        : process.platform === 'linux' ? 'linux' : 'windows';

      const res = await apiRequest('/auth/login', 'POST', {
        username, password,
        deviceIdentifier: deviceId,
        deviceName: deviceName ?? `AcademiaOS Desktop (${process.platform})`,
        platform,
        appVersion: APP_VERSION,
      });

      if (!res.ok) return { ok: false, error: errOf(res) };

      const d = data(res);
      const tokens = d.tokens as ApiData;

      await saveCredential(ACCOUNT_ACCESS_TOKEN,  tokens.accessToken  as string);
      await saveCredential(ACCOUNT_REFRESH_TOKEN, tokens.refreshToken as string);

      // Persist minimal session metadata in SQLite
      const db = getDb();
      db.prepare(`
        INSERT OR REPLACE INTO device_meta
          (id, device_id, device_name, platform, app_version,
           user_id, school_id, school_name, role, updated_at)
        VALUES (1, @did, @dname, @plat, @ver, @uid, @sid, @sname, @role, datetime('now'))
      `).run({
        did:   deviceId,
        dname: deviceName ?? 'AcademiaOS Desktop',
        plat:  platform,
        ver:   APP_VERSION,
        uid:   (d.user as ApiData).id,
        sid:   ((d.user as ApiData).school as ApiData)?.id   ?? null,
        sname: ((d.user as ApiData).school as ApiData)?.name ?? null,
        role:  (d.user as ApiData).role,
      });

      return { ok: true, user: d.user, tokens: d.tokens, deviceId: d.deviceId };
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } };
    }
  });

  // ── auth:refresh ────────────────────────────────────────────────────────────
  ipcMain.handle('auth:refresh', async () => {
    try {
      const refreshToken = await getCredential(ACCOUNT_REFRESH_TOKEN);
      if (!refreshToken) return { ok: false, error: { code: 'NO_REFRESH_TOKEN' } };

      const res = await apiRequest('/auth/refresh', 'POST', { refreshToken });
      if (!res.ok) return { ok: false, error: errOf(res) };

      const tokens = data(res).tokens as ApiData;
      await saveCredential(ACCOUNT_ACCESS_TOKEN,  tokens.accessToken  as string);
      await saveCredential(ACCOUNT_REFRESH_TOKEN, tokens.refreshToken as string);
      return { ok: true, tokens };
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } };
    }
  });

  // ── auth:logout ─────────────────────────────────────────────────────────────
  ipcMain.handle('auth:logout', async () => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (accessToken) {
        await apiRequest('/auth/logout', 'POST', {}, accessToken).catch(() => {});
      }
    } finally {
      await clearAuthCredentials();
    }
    return { ok: true };
  });

  // ── auth:getSession ─────────────────────────────────────────────────────────
  ipcMain.handle('auth:getSession', async () => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (!accessToken) return { ok: false, loggedIn: false };

      const res = await apiRequest('/session', 'GET', undefined, accessToken);
      if (!res.ok) return { ok: false, loggedIn: false, error: errOf(res) };

      const sessionData = data(res);
      const sessionUser = (sessionData.user ?? {}) as ApiData;
      const sessionSchool = (sessionUser.school ?? {}) as ApiData;
      const currentLogo =
        sessionSchool.logoUrl ??
        sessionSchool.logo_url ??
        sessionSchool.logo ??
        sessionSchool.schoolLogoUrl;

      if (!currentLogo) {
        try {
          const syncResponse = await apiRequest(
            '/sync/initial',
            'POST',
            {},
            accessToken,
          );

          if (syncResponse.ok) {
            const initialData = data(syncResponse);
            const syncedSchool = (initialData.school ?? {}) as ApiData;
            const syncedLogo =
              syncedSchool.logoUrl ??
              syncedSchool.logo_url ??
              syncedSchool.logo ??
              syncedSchool.schoolLogoUrl ??
              null;

            sessionUser.school = {
              ...syncedSchool,
              ...sessionSchool,
              logoUrl: syncedLogo,
            };
            sessionData.user = sessionUser;
          }
        } catch {
          // Keep the valid session even if logo enrichment fails.
        }
      }

      return { ok: true, loggedIn: true, ...sessionData };
    } catch {
      return { ok: false, loggedIn: false };
    }
  });

  // ── sync:initial ────────────────────────────────────────────────────────────
  ipcMain.handle('sync:initial', async () => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (!accessToken) return { ok: false, error: { code: 'NOT_AUTHENTICATED' } };

      const res = await apiRequest('/sync/initial', 'POST', {}, accessToken);
      if (!res.ok) return { ok: false, error: errOf(res) };

      const d = data(res);
      const db = getDb();

      if (Array.isArray(d.learners) && (d.learners as unknown[]).length > 0) {
        upsertLearners(db, d.learners as Record<string, unknown>[]);
      }

      if (Array.isArray(d.classes)) {
        upsertClasses(db, d.classes as Record<string, unknown>[]);
      }

      if (Array.isArray(d.staff) && (d.staff as unknown[]).length > 0) {
        upsertStaff(db, d.staff as Record<string, unknown>[]);
      }

      db.prepare(`
        INSERT OR REPLACE INTO sync_cursor (entity_type, last_synced, record_count)
        VALUES (?, ?, ?)
      `).run('learners', d.syncCursor, (d.learners as unknown[])?.length ?? 0);

      db.prepare(`
        INSERT OR REPLACE INTO sync_cursor (entity_type, last_synced, record_count)
        VALUES (?, ?, ?)
      `).run('staff', d.syncCursor, (d.staff as unknown[])?.length ?? 0);

      db.prepare(`
        INSERT OR REPLACE INTO sync_cursor (entity_type, last_synced, record_count)
        VALUES (?, ?, ?)
      `).run('classes', d.syncCursor, (d.classes as unknown[])?.length ?? 0);

      return { ok: true, data: d };
    } catch (err) {
      return { ok: false, error: { code: 'SYNC_ERROR', message: String(err) } };
    }
  });

  // ── sync:incremental ────────────────────────────────────────────────────────
  ipcMain.handle('sync:incremental', async (_, { syncCursor }: { syncCursor: string }) => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (!accessToken) return { ok: false, error: { code: 'NOT_AUTHENTICATED' } };

      const res = await apiRequest('/sync/incremental', 'POST', { syncCursor }, accessToken);
      if (!res.ok) return { ok: false, error: errOf(res) };

      const d   = data(res);
      const db  = getDb();
      const chg = d.changes as Record<string, unknown[]>;

      if (chg?.learners?.length) upsertLearners(db, chg.learners as Record<string, unknown>[]);
      if (chg?.classes?.length) upsertClasses(db, chg.classes as Record<string, unknown>[]);
      if (chg?.staff?.length) upsertStaff(db, chg.staff as Record<string, unknown>[]);
      db.prepare(`
        INSERT OR REPLACE INTO sync_cursor (entity_type, last_synced, record_count)
        VALUES (?, ?, ?)
      `).run('learners', d.syncCursor, chg?.learners?.length ?? 0);

      return { ok: true, data: d };
    } catch (err) {
      return { ok: false, error: { code: 'SYNC_ERROR', message: String(err) } };
    }
  });

  // ── sync:uploadOutbox ───────────────────────────────────────────────────────
  ipcMain.handle('sync:uploadOutbox', async () => {
    try {
      const accessToken = await getCredential(ACCOUNT_ACCESS_TOKEN);
      if (!accessToken) return { ok: false, error: { code: 'NOT_AUTHENTICATED' } };

      const db      = getDb();
      const pending = getPendingOps(db) as Array<{
        id: string; idempotency_key: string; device_id: string; user_id: string;
        school_id: string; operation_type: string; payload_json: string;
        record_version: number | null; created_at: string;
      }>;

      if (!pending.length) return { ok: true, processed: 0 };

      const ops = pending.map((row) => ({
        operationId:    row.id,
        idempotencyKey: row.idempotency_key,
        deviceId:       row.device_id,
        schoolId:       row.school_id,
        type:           row.operation_type,
        payload:        JSON.parse(row.payload_json),
        createdAt:      row.created_at,
        recordVersion:  row.record_version ?? undefined,
      }));

      // Mark as UPLOADING before sending
      pending.forEach((op) => markOpStatus(db, op.id, 'UPLOADING'));

      const res = await apiRequest('/sync/outbox', 'POST', { operations: ops }, accessToken);

      if (!res.ok) {
        // Revert to PENDING so next sync can retry
        pending.forEach((op) => markOpStatus(db, op.id, 'PENDING'));
        return { ok: false, error: errOf(res) };
      }

      const results = (data(res).results as Array<{
        operationId: string; status: string; message?: string;
      }>);

      for (const r of results) {
        const finalStatus = r.status === 'ALREADY_PROCESSED' ? 'SYNCED' : r.status;
        markOpStatus(db, r.operationId, finalStatus, r.message);
      }

      return { ok: true, processed: pending.length, results };
    } catch (err) {
      return { ok: false, error: { code: 'UPLOAD_ERROR', message: String(err) } };
    }
  });

  // ── sync:status ─────────────────────────────────────────────────────────────
  ipcMain.handle('sync:status', async () => {
    const db        = getDb();
    const cursors   = db.prepare(`SELECT * FROM sync_cursor`).all() as Array<{
      entity_type: string; last_synced: string; record_count: number;
    }>;
    const pending   = db.prepare(`SELECT COUNT(*) as n FROM outbox WHERE status = 'PENDING'`).get() as { n: number };
    const conflicts = db.prepare(`SELECT COUNT(*) as n FROM conflicts WHERE resolved = 0`).get() as { n: number };
    return { ok: true, cursors, pendingOps: pending.n, conflictCount: conflicts.n };
  });

  // ── db:getLearners
  ipcMain.handle('db:getLearners', async (_, opts: {
    classId?: string;
    search?: string;
  } = {}) => {
    const db = getDb();

    let sql = `
      SELECT
        l.*,
        c.name AS class_name,
        c.stream AS class_stream
      FROM cached_learners l
      LEFT JOIN cached_classes c ON c.id = l.class_id
      WHERE l.status = 'ACTIVE'
    `;

    const args: (string | number)[] = [];

    if (opts.classId) {
      sql += ` AND l.class_id = ?`;
      args.push(opts.classId);
    }

    if (opts.search) {
      const exact = opts.search.trim();
      const q = `%${exact}%`;
      sql += `
        AND (
          l.first_name LIKE ?
          OR l.last_name LIKE ?
          OR l.admission_no LIKE ?
          OR l.badge_code LIKE ?
        )
      `;
      args.push(q, q, q, q);

      sql += `
        ORDER BY
          CASE
            WHEN lower(COALESCE(l.badge_code, '')) = lower(?) THEN 0
            WHEN lower(COALESCE(l.admission_no, '')) = lower(?) THEN 1
            ELSE 2
          END,
          l.last_name,
          l.first_name
        LIMIT 500
      `;
      args.push(exact, exact);
    } else {
      sql += ` ORDER BY l.last_name, l.first_name LIMIT 500`;
    }

    return {
      ok: true,
      learners: db.prepare(sql).all(...args),
    };
  });

  // ── db:getStaff ─────────────────────────────────────────────────────────────
  ipcMain.handle('db:getStaff', async (_, opts: { search?: string } = {}) => {
    const db = getDb();
    let sql = `SELECT * FROM cached_staff WHERE status = 'ACTIVE'`;
    const args: string[] = [];

    if (opts.search) {
      const q = `%${opts.search}%`;
      sql += ` AND (name LIKE ? OR username LIKE ? OR role LIKE ?)`;
      args.push(q, q, q);
    }

    sql += ` ORDER BY name LIMIT 500`;

    const rows = db.prepare(sql).all(...args);
    return { ok: true, staff: rows };
  });

  // ── db:saveAttendance ───────────────────────────────────────────────────────
  ipcMain.handle('db:saveAttendance', async (_, params: {
    learnerId: string; date: string; status: string;
    schoolId: string; userId: string; deviceId: string;
  }) => {
    const db  = getDb();
    const id  = crypto.randomUUID();
    const idk = crypto.randomUUID();

    db.prepare(`
      INSERT OR REPLACE INTO cached_attendance
        (id, school_id, learner_id, date, status, is_local)
      VALUES (@id, @school_id, @learner_id, @date, @status, 1)
    `).run({
      id, school_id: params.schoolId, learner_id: params.learnerId,
      date: params.date, status: params.status,
    });

    addToOutbox(db, {
      id, idempotencyKey: idk,
      deviceId:      params.deviceId,
      userId:        params.userId,
      schoolId:      params.schoolId,
      operationType: 'ATTENDANCE_RECORD',
      payload:       { learnerId: params.learnerId, date: params.date, status: params.status },
    });

    return { ok: true, operationId: id, idempotencyKey: idk };
  });

  // ── db:getPendingOps ────────────────────────────────────────────────────────
  ipcMain.handle('db:getPendingOps', async () => {
    const db   = getDb();
    const rows = getPendingOps(db);
    return { ok: true, operations: rows };
  });

  // ── db:getConflicts ─────────────────────────────────────────────────────────
  ipcMain.handle('db:getConflicts', async () => {
    const db   = getDb();
    const rows = db.prepare(
      `SELECT * FROM conflicts WHERE resolved = 0 ORDER BY created_at DESC`,
    ).all();
    return { ok: true, conflicts: rows };
  });


  // ── media:loadImage
  ipcMain.handle('media:loadImage', async (_, payload: {
    url: string;
  }) => {
    try {
      const accessToken = await getCredential(
        ACCOUNT_ACCESS_TOKEN,
      );

      const dataUrl = await fetchImageDataUrl(
        payload.url,
        accessToken ?? undefined,
      );

      return { ok: true, dataUrl };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'LOGO_LOAD_FAILED',
          message: String(error),
        },
      };
    }
  });

  // ── app:getVersion / app:getPlatform ────────────────────────────────────────
  ipcMain.handle('app:getVersion',  () => ({ ok: true, version:  APP_VERSION }));
  ipcMain.handle('app:getPlatform', () => ({ ok: true, platform: process.platform }));
}
