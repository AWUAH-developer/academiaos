/**
 * POST /api/desktop/v1/sync/outbox
 *
 * Accepts an array of offline operations captured by the desktop client and
 * applies them server-side with idempotency enforcement.
 *
 * Each operation carries a client-generated idempotency key (UUID).  The
 * server records processed keys in a simple in-memory cache here, but
 * production deployments should persist them in the database (see migration
 * note below) to survive restarts and handle distributed instances.
 *
 * HIGH-RISK operations (final financial postings, approvals, user creation,
 * etc.) are rejected here and must be performed online via the main web UI.
 */
import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { attendanceRecords, learners } from '@/db/schema';
import { audit } from '@/lib/auth';
import {
  authenticateDesktopRequest, desktopError, desktopJson, resolveDesktopSchoolId,
} from '@/lib/desktop-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Idempotency store (server-process-scoped; replace with DB in production) ─
const processed = new Map<string, { result: 'ok' | 'rejected'; at: string }>();

// ─── Operation schemas ────────────────────────────────────────────────────────
const baseOp = z.object({
  operationId:    z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  deviceId:       z.string(),
  schoolId:       z.string(),
  createdAt:      z.string().datetime(),
  recordVersion:  z.number().optional(),
});

const attendanceOp = baseOp.extend({
  type:    z.literal('ATTENDANCE_RECORD'),
  payload: z.object({
    learnerId:  z.string(),
    date:       z.string().date(),
    status:     z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']),
    checkInTime:  z.string().datetime().nullable().optional(),
    checkOutTime: z.string().datetime().nullable().optional(),
    reason:       z.string().max(500).optional(),
  }),
});

// Extend with other operation types here (fees, marks, visitor, etc.)
const anyOp = z.discriminatedUnion('type', [attendanceOp]);

const bodySchema = z.object({ operations: z.array(anyOp).min(1).max(100) });

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request);
  if ('response' in auth) return auth.response;
  const ctx = auth.context;

  let body: unknown;
  try { body = await request.json(); } catch {
    return desktopError(400, 'INVALID_JSON', 'Send a valid JSON body.');
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return desktopError(400, 'INVALID_OPERATIONS', parsed.error.issues[0]?.message ?? 'Invalid operations payload.');
  }

  const schoolId = await resolveDesktopSchoolId(ctx, request);
  if (!schoolId) return desktopError(400, 'NO_SCHOOL', 'Could not resolve school for this session.');

  const results: Array<{ operationId: string; idempotencyKey: string; status: string; message?: string }> = [];

  for (const op of parsed.data.operations) {
    // Guard: schoolId in payload must match authenticated session
    if (op.schoolId !== schoolId) {
      results.push({ operationId: op.operationId, idempotencyKey: op.idempotencyKey, status: 'REJECTED', message: 'schoolId mismatch' });
      continue;
    }

    // Idempotency check
    const existing = processed.get(op.idempotencyKey);
    if (existing) {
      results.push({ operationId: op.operationId, idempotencyKey: op.idempotencyKey, status: 'ALREADY_PROCESSED' });
      continue;
    }

    try {
      if (op.type === 'ATTENDANCE_RECORD') {
        const learner = (await db.select({ id: learners.id }).from(learners)
          .where(and(eq(learners.id, op.payload.learnerId), eq(learners.schoolId, schoolId))).limit(1))[0];
        if (!learner) throw new Error('Learner not found');

        const attendanceDate = new Date(op.payload.date);
        await db.insert(attendanceRecords).values({
          schoolId,
          learnerId:    op.payload.learnerId,
          date:         attendanceDate,
          status:       op.payload.status,
          checkInTime:  op.payload.checkInTime  ? new Date(op.payload.checkInTime)  : null,
          checkOutTime: op.payload.checkOutTime ? new Date(op.payload.checkOutTime) : null,
          reason:       op.payload.reason || null,
          recordedById: ctx.user.id,
        }).onConflictDoNothing(); // unique constraint on (learnerId, date) prevents duplicates

        await audit({
          schoolId, userId: ctx.user.id, action: 'DESKTOP_ATTENDANCE_SYNCED',
          entityType: 'AttendanceRecord', entityId: op.payload.learnerId,
          newValue: { idempotencyKey: op.idempotencyKey, status: op.payload.status },
        });
      }

      processed.set(op.idempotencyKey, { result: 'ok', at: new Date().toISOString() });
      results.push({ operationId: op.operationId, idempotencyKey: op.idempotencyKey, status: 'SYNCED' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      processed.set(op.idempotencyKey, { result: 'rejected', at: new Date().toISOString() });
      results.push({ operationId: op.operationId, idempotencyKey: op.idempotencyKey, status: 'REJECTED', message: msg });
    }
  }

  return desktopJson({ data: { results } });
}
