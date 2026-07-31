/**
 * Scanner IPC handler logic tests — AcademiaOS Desktop
 *
 * Tests the scanner-logic module (the business logic extracted from
 * ipc-handlers for testability) using lightweight in-memory mocks.
 *
 * Covers: learner/staff lookup, happy path, inactive records,
 * wrong-school rejection, self-scan prevention, duplicate protection,
 * unauthorised role, and outbox payload shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSessionContext,
  recordLearnerAttendance,
  recordStaffAttendance,
  isAuthorisedForStaffAttendance,
  findLearnerByToken,
  findStaffByToken,
  type MinimalDb,
  type SessionContext,
  type LearnerRow,
  type StaffRow,
} from './scanner-logic';

// ── Mock crypto (uuid must be stable for assertions) ─────────────────────────
vi.mock('crypto', () => ({
  default: {
    randomUUID: vi.fn(() => 'test-uuid-1234'),
  },
  randomUUID: vi.fn(() => 'test-uuid-1234'),
}));

// ── DB builder ────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

/**
 * Creates a minimal mock DB where each `prepare(sql).get(...args)` resolves
 * against a map of expected return values keyed on the first arg.
 */
function makeDb(queryResults: Map<string, unknown>): MinimalDb & { runCalls: Row[] } {
  const runCalls: Row[] = [];

  const db = {
    runCalls,
    prepare(sql: string) {
      return {
        get(...args: unknown[]): unknown {
          // Match by checking if any key in queryResults appears in the sql
          for (const [key, value] of queryResults) {
            if (sql.includes(key)) {
              // If a specific arg override exists, use it
              return value;
            }
          }
          return undefined;
        },
        run(params: Row): void {
          runCalls.push({ sql, ...params });
        },
      };
    },
  };

  return db;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCHOOL_A = 'school-aaa';
const SCHOOL_B = 'school-bbb';
const USER_ID  = 'user-security-001';

const CTX_SECURITY: SessionContext = {
  userId:   USER_ID,
  schoolId: SCHOOL_A,
  deviceId: 'device-win-001',
  role:     'SECURITY',
};

const CTX_TEACHER: SessionContext = {
  userId:   'user-teacher-001',
  schoolId: SCHOOL_A,
  deviceId: 'device-win-001',
  role:     'TEACHER',
};

const ACTIVE_LEARNER: LearnerRow = {
  id:           'learner-001',
  school_id:    SCHOOL_A,
  admission_no: 'ADM-001',
  first_name:   'Alice',
  last_name:    'Mensah',
  class_id:     'class-1',
  class_name:   'Form 1',
  class_stream: 'A',
  status:       'ACTIVE',
  photo_url:    null,
  badge_code:   'CARD-ABC123',
};

const INACTIVE_LEARNER: LearnerRow = {
  ...ACTIVE_LEARNER,
  id:     'learner-002',
  status: 'INACTIVE',
};

const WRONG_SCHOOL_LEARNER: LearnerRow = {
  ...ACTIVE_LEARNER,
  id:       'learner-003',
  school_id: SCHOOL_B,
};

const ACTIVE_STAFF: StaffRow = {
  id:        'staff-001',
  school_id: SCHOOL_A,
  name:      'Mr Kofi Boateng',
  username:  'kboateng',
  role:      'TEACHER',
  status:    'ACTIVE',
  photo_url: null,
  badge_code: 'STAFF-XYZ789',
};

// ── getSessionContext ─────────────────────────────────────────────────────────

describe('getSessionContext', () => {
  it('returns context when device_meta is populated', () => {
    const db = makeDb(new Map([
      ['device_meta', { user_id: 'u1', school_id: 's1', device_id: 'd1', role: 'SECURITY' }],
    ]));
    const ctx = getSessionContext(db);
    expect(ctx).toEqual({ userId: 'u1', schoolId: 's1', deviceId: 'd1', role: 'SECURITY' });
  });

  it('returns null when device_meta is empty', () => {
    const db = makeDb(new Map([['device_meta', undefined]]));
    const ctx = getSessionContext(db);
    expect(ctx).toBeNull();
  });

  it('returns null when user_id is missing', () => {
    const db = makeDb(new Map([
      ['device_meta', { school_id: 's1', device_id: 'd1', role: 'TEACHER' }],
    ]));
    const ctx = getSessionContext(db);
    expect(ctx).toBeNull();
  });
});

// ── isAuthorisedForStaffAttendance ────────────────────────────────────────────

describe('isAuthorisedForStaffAttendance', () => {
  it.each(['SECURITY', 'SECURITY_OFFICER', 'ATTENDANCE_OFFICER', 'HEADTEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'])(
    'returns true for %s',
    (role) => { expect(isAuthorisedForStaffAttendance(role)).toBe(true); },
  );
  it.each(['TEACHER', 'ACADEMIC_ADMIN', 'SCHOOL_ADMIN_VIEWER', 'PARENT', ''])(
    'returns false for %s',
    (role) => { expect(isAuthorisedForStaffAttendance(role)).toBe(false); },
  );
});

// ── recordLearnerAttendance ───────────────────────────────────────────────────

describe('recordLearnerAttendance', () => {
  let outboxCalls: unknown[];
  let outboxFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    outboxCalls = [];
    outboxFn = vi.fn((op: unknown) => { outboxCalls.push(op); });
  });

  it('rejects short tokens', () => {
    const db = makeDb(new Map());
    const result = recordLearnerAttendance(db, CTX_SECURITY, 'AB', '2026-07-31', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INVALID_TOKEN');
    expect(outboxCalls).toHaveLength(0);
  });

  it('returns LEARNER_NOT_FOUND when no matching learner', () => {
    const db = makeDb(new Map([
      ['cached_learners', undefined],
      ['cached_attendance', undefined],
    ]));
    const result = recordLearnerAttendance(db, CTX_SECURITY, 'CARD-UNKNOWN', '2026-07-31', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('LEARNER_NOT_FOUND');
  });

  it('returns LEARNER_INACTIVE for inactive learner', () => {
    const db = makeDb(new Map([['cached_learners', INACTIVE_LEARNER]]));
    const result = recordLearnerAttendance(db, CTX_SECURITY, 'ADM-001', '2026-07-31', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('LEARNER_INACTIVE');
    expect(outboxCalls).toHaveLength(0);
  });

  it('returns WRONG_SCHOOL for learner in different school', () => {
    const db = makeDb(new Map([['cached_learners', WRONG_SCHOOL_LEARNER]]));
    const result = recordLearnerAttendance(db, CTX_SECURITY, 'ADM-001', '2026-07-31', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('WRONG_SCHOOL');
    expect(outboxCalls).toHaveLength(0);
  });

  it('returns ALREADY_RECORDED when attendance row exists for today', () => {
    let callIndex = 0;
    const db: MinimalDb & { runCalls: Row[] } = {
      runCalls: [],
      prepare(sql: string) {
        return {
          get(..._args: unknown[]): unknown {
            if (sql.includes('cached_learners')) return ACTIVE_LEARNER;
            if (sql.includes('cached_attendance')) return { id: 'existing-att-001' };
            return undefined;
          },
          run(params: Row) { db.runCalls.push(params); },
        };
      },
    };
    const result = recordLearnerAttendance(db, CTX_SECURITY, 'CARD-ABC123', '2026-07-31', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('ALREADY_RECORDED');
    expect(result.learner).toBeDefined();
    expect(outboxCalls).toHaveLength(0);
  });

  it('records attendance and enqueues outbox op on success', () => {
    let callIndex = 0;
    const runCalls: Row[] = [];
    const db: MinimalDb & { runCalls: Row[] } = {
      runCalls,
      prepare(sql: string) {
        return {
          get(..._args: unknown[]): unknown {
            if (sql.includes('cached_learners')) return ACTIVE_LEARNER;
            if (sql.includes('cached_attendance')) return undefined; // no duplicate
            return undefined;
          },
          run(params: Row) { runCalls.push({ _sql: sql, ...params }); },
        };
      },
    };

    const result = recordLearnerAttendance(db, CTX_SECURITY, 'CARD-ABC123', '2026-07-31', outboxFn);
    expect(result.ok).toBe(true);
    expect(result.learner?.first_name).toBe('Alice');
    expect(outboxCalls).toHaveLength(1);

    const op = outboxCalls[0] as Record<string, unknown>;
    expect(op.operationType).toBe('ATTENDANCE_RECORD');
    expect(op.schoolId).toBe(SCHOOL_A);
    expect(op.userId).toBe(USER_ID);
    expect((op.payload as Record<string, unknown>)?.status).toBe('PRESENT');
    expect((op.payload as Record<string, unknown>)?.learnerId).toBe('learner-001');
  });
});

// ── recordStaffAttendance ─────────────────────────────────────────────────────

describe('recordStaffAttendance', () => {
  let outboxCalls: unknown[];
  let outboxFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    outboxCalls = [];
    outboxFn = vi.fn((op: unknown) => { outboxCalls.push(op); });
  });

  it('rejects TEACHER role (not authorised)', () => {
    const db = makeDb(new Map());
    const result = recordStaffAttendance(db, CTX_TEACHER, 'STAFF-XYZ789', '2026-07-31', 'ARRIVAL', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORISED');
    expect(outboxCalls).toHaveLength(0);
  });

  it('rejects short tokens', () => {
    const db = makeDb(new Map());
    const result = recordStaffAttendance(db, CTX_SECURITY, 'AB', '2026-07-31', 'ARRIVAL', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INVALID_TOKEN');
  });

  it('returns STAFF_NOT_FOUND for unknown token', () => {
    const db = makeDb(new Map([['cached_staff', undefined]]));
    const result = recordStaffAttendance(db, CTX_SECURITY, 'UNKNOWN-TOKEN', '2026-07-31', 'ARRIVAL', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('STAFF_NOT_FOUND');
    expect(outboxCalls).toHaveLength(0);
  });

  it('prevents self-scan', () => {
    const selfStaff: StaffRow = {
      ...ACTIVE_STAFF,
      id: USER_ID, // matches the officer's own user id
    };
    const db = makeDb(new Map([['cached_staff', selfStaff]]));
    const result = recordStaffAttendance(db, CTX_SECURITY, 'STAFF-XYZ789', '2026-07-31', 'ARRIVAL', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('NO_SELF_SCAN');
    expect(outboxCalls).toHaveLength(0);
  });

  it('rejects inactive staff', () => {
    const inactiveStaff: StaffRow = { ...ACTIVE_STAFF, status: 'INACTIVE' };
    const db = makeDb(new Map([['cached_staff', inactiveStaff]]));
    const result = recordStaffAttendance(db, CTX_SECURITY, 'STAFF-XYZ789', '2026-07-31', 'ARRIVAL', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('STAFF_INACTIVE');
    expect(outboxCalls).toHaveLength(0);
  });

  it('rejects wrong-school staff', () => {
    const wrongSchoolStaff: StaffRow = { ...ACTIVE_STAFF, school_id: SCHOOL_B };
    const db = makeDb(new Map([['cached_staff', wrongSchoolStaff]]));
    const result = recordStaffAttendance(db, CTX_SECURITY, 'STAFF-XYZ789', '2026-07-31', 'ARRIVAL', outboxFn);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('WRONG_SCHOOL');
    expect(outboxCalls).toHaveLength(0);
  });

  it('records ARRIVAL, persists locally, and enqueues outbox op on success', () => {
    const runCalls: Row[] = [];
    const db: MinimalDb & { runCalls: Row[] } = {
      runCalls,
      prepare(sql: string) {
        return {
          get(..._args: unknown[]): unknown {
            if (sql.includes('cached_staff')) return ACTIVE_STAFF;
            return undefined;
          },
          run(params: Row) { runCalls.push({ _sql: sql, ...params }); },
        };
      },
    };

    const result = recordStaffAttendance(db, CTX_SECURITY, 'STAFF-XYZ789', '2026-07-31', 'ARRIVAL', outboxFn);
    expect(result.ok).toBe(true);
    expect(result.staff?.name).toBe('Mr Kofi Boateng');

    // Verify local INSERT into cached_staff_attendance
    const insertCall = runCalls.find((c) => String(c._sql).includes('cached_staff_attendance'));
    expect(insertCall).toBeDefined();
    expect(insertCall?.staff_id).toBe('staff-001');
    expect(insertCall?.school_id).toBe(SCHOOL_A);
    expect(insertCall?.type).toBe('ARRIVAL');
    expect(insertCall?.recorded_by).toBe(USER_ID);

    // Verify outbox operation
    expect(outboxCalls).toHaveLength(1);
    const op = outboxCalls[0] as Record<string, unknown>;
    expect(op.operationType).toBe('STAFF_ATTENDANCE');
    expect(op.schoolId).toBe(SCHOOL_A);
    expect(op.userId).toBe(USER_ID);
    const payload = op.payload as Record<string, unknown>;
    expect(payload.type).toBe('ARRIVAL');
    expect(payload.staffId).toBe('staff-001');
    expect(payload.recordedBy).toBe(USER_ID);
  });

  it('records DEPARTURE type correctly', () => {
    const runCalls: Row[] = [];
    const db: MinimalDb & { runCalls: Row[] } = {
      runCalls,
      prepare(sql: string) {
        return {
          get(..._args: unknown[]): unknown {
            if (sql.includes('cached_staff')) return ACTIVE_STAFF;
            return undefined;
          },
          run(params: Row) { runCalls.push({ _sql: sql, ...params }); },
        };
      },
    };
    const result = recordStaffAttendance(db, CTX_SECURITY, 'STAFF-XYZ789', '2026-07-31', 'DEPARTURE', outboxFn);
    expect(result.ok).toBe(true);
    const op = outboxCalls[0] as Record<string, unknown>;
    expect((op.payload as Record<string, unknown>).type).toBe('DEPARTURE');

    const insertCall = runCalls.find((c) => String(c._sql).includes('cached_staff_attendance'));
    expect(insertCall?.type).toBe('DEPARTURE');
  });
});
