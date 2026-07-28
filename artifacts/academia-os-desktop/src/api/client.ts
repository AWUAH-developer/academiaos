/**
 * Renderer-side API client — wraps window.electronAPI.invoke() calls.
 * All actual HTTP happens in the main process via ipc-handlers.ts.
 * The renderer NEVER holds tokens or makes direct network requests.
 */

declare global {
  interface Window {
    electronAPI: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>;
      getVersion(): string;
      getPlatform(): string;
    };
  }
}

function invoke<T = unknown>(channel: string, args?: unknown): Promise<T> {
  return window.electronAPI.invoke(channel, args) as Promise<T>;
}

export type ApiResult<T> = { ok: true } & T | { ok: false; error?: { code: string; message?: string } };

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (username: string, password: string, deviceName?: string) =>
    invoke<ApiResult<{ user: User; tokens: Tokens; deviceId: string }>>('auth:login', { username, password, deviceName }),

  refresh: () =>
    invoke<ApiResult<{ tokens: Tokens }>>('auth:refresh'),

  logout: () =>
    invoke<ApiResult<object>>('auth:logout'),

  getSession: () =>
    invoke<ApiResult<{ loggedIn: boolean; user?: User; session?: Session }>>('auth:getSession'),
};

// ── Sync ──────────────────────────────────────────────────────────────────────
export const sync = {
  initial: () =>
    invoke<ApiResult<{ data: InitialSyncData }>>('sync:initial'),

  incremental: (syncCursor: string) =>
    invoke<ApiResult<{ data: IncrementalSyncData }>>('sync:incremental', { syncCursor }),

  uploadOutbox: () =>
    invoke<ApiResult<{ processed: number; results: OutboxResult[] }>>('sync:uploadOutbox'),

  status: () =>
    invoke<{ ok: boolean; cursors: SyncCursor[]; pendingOps: number; conflictCount: number }>('sync:status'),
};

// ── Local DB ──────────────────────────────────────────────────────────────────
export const db = {
  getLearners: (opts?: { classId?: string; search?: string }) =>
    invoke<ApiResult<{ learners: LocalLearner[] }>>('db:getLearners', opts),

  saveAttendance: (params: { learnerId: string; date: string; status: AttendanceStatus; schoolId: string; userId: string; deviceId: string }) =>
    invoke<ApiResult<{ operationId: string; idempotencyKey: string }>>('db:saveAttendance', params),

  getPendingOps: () =>
    invoke<ApiResult<{ operations: OutboxRow[] }>>('db:getPendingOps'),

  getConflicts: () =>
    invoke<ApiResult<{ conflicts: ConflictRow[] }>>('db:getConflicts'),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type User = {
  id: string; name: string; username: string;
  email: string | null; phone: string | null; photoUrl: string | null;
  role: string; mustChangePassword: boolean;
  school: { id: string; name: string; code: string; logoUrl: string | null; currency: string; timezone: string } | null;
};

export type Tokens = {
  accessToken: string; refreshToken: string; expiresIn: number;
  accessExpiresAt: string; refreshExpiresAt: string;
};

export type Session = { sessionId: string; deviceId: string; platform: string; appVersion: string | null };

export type LocalLearner = {
  id: string; school_id: string; admission_no: string;
  first_name: string; last_name: string; class_id: string | null;
  status: string; photo_url: string | null; badge_code: string | null;
  gender: string | null;
};

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'HALF_DAY';

export type InitialSyncData = {
  syncCursor: string; school: unknown; classes: unknown[]; subjects: unknown[];
  staff: unknown[]; feeCategories: unknown[]; academicYears: unknown[];
  terms: unknown[]; learners: LocalLearner[]; counts: Record<string, number>;
};

export type IncrementalSyncData = {
  syncCursor: string;
  changes: { learners: LocalLearner[]; classes: unknown[]; staff: unknown[]; subjects: unknown[]; feeCategories: unknown[] };
};

export type SyncCursor  = { entity_type: string; last_synced: string; record_count: number };
export type OutboxResult = { operationId: string; status: string; message?: string };
export type OutboxRow   = { id: string; operation_type: string; status: string; created_at: string; payload_json: string };
export type ConflictRow = { id: string; operation_type: string; reason: string; created_at: string };
