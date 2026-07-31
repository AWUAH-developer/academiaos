/**
 * Scanner business logic — extracted from ipc-handlers for testability.
 *
 * All functions accept a minimal synchronous DB interface so they can be
 * tested against plain in-memory mocks without importing Electron or the
 * native SQLite module.
 *
 * The real ipc-handlers.ts passes getDb() here; tests pass mock objects.
 */
import crypto from 'crypto';

// ── Minimal DB interface ──────────────────────────────────────────────────────

export interface DbStatement {
  get(...params: unknown[]): unknown;
  run(params: Record<string, unknown>): unknown;
}

export interface MinimalDb {
  prepare(sql: string): DbStatement;
}

// ── Session context ───────────────────────────────────────────────────────────

export interface SessionContext {
  userId:   string;
  schoolId: string;
  deviceId: string;
  role:     string;
}

/**
 * Reads the signed-in user's identity from the trusted main-process
 * device_meta table — written at login time, never exposed to the renderer.
 */
export function getSessionContext(db: MinimalDb): SessionContext | null {
  const row = db.prepare(
    'SELECT user_id, school_id, device_id, role FROM device_meta WHERE id = 1',
  ).get() as Record<string, unknown> | undefined;

  if (!row?.user_id || !row?.school_id || !row?.device_id) return null;
  return {
    userId:   String(row.user_id),
    schoolId: String(row.school_id),
    deviceId: String(row.device_id),
    role:     String(row.role ?? ''),
  };
}

// ── Learner lookup ────────────────────────────────────────────────────────────

export interface LearnerRow {
  id:           string;
  school_id:    string;
  admission_no: string;
  first_name:   string;
  last_name:    string;
  class_id:     string | null;
  class_name:   string | null;
  class_stream: string | null;
  status:       string;
  photo_url:    string | null;
  badge_code:   string | null;
}

export function findLearnerByToken(
  db: MinimalDb,
  token: string,
  schoolId: string,
): LearnerRow | undefined {
  return db.prepare(`
    SELECT l.*, c.name AS class_name, c.stream AS class_stream
    FROM cached_learners l
    LEFT JOIN cached_classes c ON c.id = l.class_id
    WHERE (lower(trim(l.badge_code)) = lower(?) OR lower(trim(l.admission_no)) = lower(?))
      AND l.school_id = ?
    LIMIT 1
  `).get(token, token, schoolId) as LearnerRow | undefined;
}

// ── Staff lookup ──────────────────────────────────────────────────────────────

export interface StaffRow {
  id:        string;
  school_id: string;
  name:      string;
  username:  string;
  role:      string;
  status:    string;
  photo_url: string | null;
  badge_code: string | null;
}

export function findStaffByToken(
  db: MinimalDb,
  token: string,
  schoolId: string,
): StaffRow | undefined {
  return db.prepare(`
    SELECT *
    FROM cached_staff
    WHERE (lower(trim(badge_code)) = lower(?) OR lower(trim(username)) = lower(?))
      AND school_id = ?
    LIMIT 1
  `).get(token, token, schoolId) as StaffRow | undefined;
}

// ── Roles allowed to record staff attendance ──────────────────────────────────

const STAFF_ATTENDANCE_ROLES = new Set([
  'SECURITY',
  'SECURITY_OFFICER',
  'ATTENDANCE_OFFICER',
  'HEADTEACHER',
  'SCHOOL_ADMIN',
  'SUPER_ADMIN',
]);

export function isAuthorisedForStaffAttendance(role: string): boolean {
  return STAFF_ATTENDANCE_ROLES.has(role);
}

// ── Error result helpers ──────────────────────────────────────────────────────

export interface ScannerError {
  code: string;
  message: string;
}

export interface ScannerResult<T = Record<string, unknown>> {
  ok:       boolean;
  error?:   ScannerError;
  data?:    T;
  learner?: LearnerRow;
  staff?:   StaffRow;
}

// ── recordLearnerAttendance ───────────────────────────────────────────────────

export function recordLearnerAttendance(
  db: MinimalDb,
  ctx: SessionContext,
  cardToken: string,
  date: string,
  addToOutboxFn: (op: {
    id: string; idempotencyKey: string; deviceId: string;
    userId: string; schoolId: string; operationType: string; payload: unknown;
  }) => void,
): ScannerResult {
  const clean = cardToken.trim();
  if (clean.length < 4) {
    return { ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid card code.' } };
  }

  const learner = findLearnerByToken(db, clean, ctx.schoolId);

  if (!learner) {
    return {
      ok: false,
      error: {
        code: 'LEARNER_NOT_FOUND',
        message: 'No learner found for this card in your school. Run a sync and try again.',
      },
    };
  }

  if (learner.status !== 'ACTIVE') {
    return {
      ok: false,
      error: {
        code: 'LEARNER_INACTIVE',
        message: `This learner's account is ${learner.status}. Attendance cannot be recorded.`,
      },
      learner,
    };
  }

  if (learner.school_id !== ctx.schoolId) {
    return {
      ok: false,
      error: { code: 'WRONG_SCHOOL', message: 'This card belongs to a different school.' },
    };
  }

  // Duplicate check
  const existing = db.prepare(`
    SELECT id FROM cached_attendance
    WHERE learner_id = ? AND date = ? AND status = 'PRESENT'
    LIMIT 1
  `).get(learner.id, date) as { id: string } | undefined;

  if (existing) {
    return {
      ok: false,
      error: {
        code: 'ALREADY_RECORDED',
        message: `${learner.first_name} ${learner.last_name} is already marked PRESENT for today.`,
      },
      learner,
    };
  }

  const id  = crypto.randomUUID();
  const idk = crypto.randomUUID();

  db.prepare(`
    INSERT OR REPLACE INTO cached_attendance
      (id, school_id, learner_id, date, status, is_local)
    VALUES (@id, @school_id, @learner_id, @date, @status, 1)
  `).run({
    id,
    school_id:  ctx.schoolId,
    learner_id: learner.id,
    date,
    status:     'PRESENT',
  });

  addToOutboxFn({
    id, idempotencyKey: idk,
    deviceId:      ctx.deviceId,
    userId:        ctx.userId,
    schoolId:      ctx.schoolId,
    operationType: 'ATTENDANCE_RECORD',
    payload:       { learnerId: learner.id, date, status: 'PRESENT' },
  });

  return { ok: true, data: { operationId: id }, learner };
}

// ── recordStaffAttendance ─────────────────────────────────────────────────────

export function recordStaffAttendance(
  db: MinimalDb,
  ctx: SessionContext,
  cardToken: string,
  date: string,
  type: 'ARRIVAL' | 'DEPARTURE',
  addToOutboxFn: (op: {
    id: string; idempotencyKey: string; deviceId: string;
    userId: string; schoolId: string; operationType: string; payload: unknown;
  }) => void,
): ScannerResult {
  if (!isAuthorisedForStaffAttendance(ctx.role)) {
    return {
      ok: false,
      error: {
        code: 'UNAUTHORISED',
        message: 'Recording staff attendance requires the Security or Attendance Officer role.',
      },
    };
  }

  const clean = cardToken.trim();
  if (clean.length < 4) {
    return { ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid card code.' } };
  }

  const staff = findStaffByToken(db, clean, ctx.schoolId);

  if (!staff) {
    return {
      ok: false,
      error: {
        code: 'STAFF_NOT_FOUND',
        message: 'No staff member found for this card in your school.',
      },
    };
  }

  if (staff.status !== 'ACTIVE') {
    return {
      ok: false,
      error: {
        code: 'STAFF_INACTIVE',
        message: `This staff member's account is ${staff.status}.`,
      },
    };
  }

  if (staff.school_id !== ctx.schoolId) {
    return {
      ok: false,
      error: { code: 'WRONG_SCHOOL', message: 'This card belongs to a different school.' },
    };
  }

  // No self-scan
  if (staff.id === ctx.userId) {
    return {
      ok: false,
      error: { code: 'NO_SELF_SCAN', message: 'You cannot record your own attendance.' },
    };
  }

  const id  = crypto.randomUUID();
  const idk = crypto.randomUUID();

  // Persist locally so the event survives restarts while offline
  db.prepare(`
    INSERT INTO cached_staff_attendance
      (id, school_id, staff_id, date, type, recorded_by, recorded_at, is_local)
    VALUES (@id, @school_id, @staff_id, @date, @type, @recorded_by, datetime('now'), 1)
  `).run({
    id,
    school_id:   ctx.schoolId,
    staff_id:    staff.id,
    date,
    type,
    recorded_by: ctx.userId,
  });

  addToOutboxFn({
    id, idempotencyKey: idk,
    deviceId:      ctx.deviceId,
    userId:        ctx.userId,
    schoolId:      ctx.schoolId,
    operationType: 'STAFF_ATTENDANCE',
    payload:       { staffId: staff.id, date, type, recordedBy: ctx.userId },
  });

  return { ok: true, data: { operationId: id }, staff };
}
