import { and, eq, gt, inArray, or } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { attendanceRecords, attendanceRegisters, classes, feeCategories, learners, subjects, users } from '@/db/schema';
import {
  authenticateDesktopRequest, desktopError, desktopJson, desktopAccessibleLearnerIds, resolveDesktopSchoolId,
} from '@/lib/desktop-api';


const STAFF_ROLES = new Set([
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER',
  'ACADEMIC_ADMIN',
  'TEACHER',
  'ACCOUNTS',
  'TRANSPORT',
  'SECURITY',
  'RECEPTIONIST',
  'LIBRARIAN',
  'CANTEEN',
]);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ syncCursor: z.string().datetime() });

export async function POST(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request);
  if ('response' in auth) return auth.response;
  const ctx = auth.context;

  let body: unknown;
  try { body = await request.json(); } catch {
    return desktopError(400, 'INVALID_JSON', 'Send a valid JSON body.');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return desktopError(400, 'INVALID_CURSOR', 'syncCursor (ISO datetime) is required.');

  const schoolId = await resolveDesktopSchoolId(ctx, request);
  if (!schoolId) return desktopError(400, 'NO_SCHOOL', 'schoolId is required.');

  const since = new Date(parsed.data.syncCursor);
  const learnerIds = await desktopAccessibleLearnerIds(ctx, schoolId);

  const [learnerRows, classRows, staffRows, subjectRows, feeCategoryRows] = await Promise.all([
    learnerIds === null
      ? db.select().from(learners).where(and(eq(learners.schoolId, schoolId), gt(learners.updatedAt, since)))
      : learnerIds.length === 0
        ? Promise.resolve([])
        : db.select().from(learners).where(and(eq(learners.schoolId, schoolId), gt(learners.updatedAt, since), inArray(learners.id, learnerIds))),
    db.select().from(classes).where(and(eq(classes.schoolId, schoolId), gt(classes.updatedAt, since))),
    db.select({
      id: users.id, name: users.name, username: users.username,
      role: users.role, status: users.status, photoUrl: users.photoUrl, updatedAt: users.updatedAt,
    }).from(users).where(and(eq(users.schoolId, schoolId), gt(users.updatedAt, since))),
    db.select().from(subjects).where(and(eq(subjects.schoolId, schoolId), gt(subjects.updatedAt, since))),
    db.select().from(feeCategories).where(and(eq(feeCategories.schoolId, schoolId), gt(feeCategories.updatedAt, since))),
  ]);

  const attendanceRows =
    learnerIds !== null && learnerIds.length === 0
      ? []
      : await db
          .select({
            id: attendanceRecords.id,
            schoolId: attendanceRecords.schoolId,
            learnerId: attendanceRecords.learnerId,
            registerId: attendanceRecords.registerId,
            date: attendanceRecords.date,
            status: attendanceRecords.status,
            checkInTime: attendanceRecords.checkInTime,
            checkOutTime: attendanceRecords.checkOutTime,
            reason: attendanceRecords.reason,
            updatedAt: attendanceRecords.updatedAt,
            registerStatus: attendanceRegisters.status,
            registerMarkedById: attendanceRegisters.markedById,
            registerMarkedByRole: attendanceRegisters.markedByRole,
            registerSubmittedAt: attendanceRegisters.submittedAt,
            registerLockedAt: attendanceRegisters.lockedAt,
          })
          .from(attendanceRecords)
          .innerJoin(
            attendanceRegisters,
            and(
              eq(attendanceRecords.registerId, attendanceRegisters.id),
              eq(attendanceRegisters.schoolId, schoolId),
            ),
          )
          .where(
            and(
              eq(attendanceRecords.schoolId, schoolId),
              eq(attendanceRegisters.status, "LOCKED"),
              or(
                gt(attendanceRecords.updatedAt, since),
                gt(attendanceRegisters.updatedAt, since),
              ),
              learnerIds === null
                ? undefined
                : inArray(attendanceRecords.learnerId, learnerIds),
            ),
          );

  const activeStaffRows = staffRows.filter(
    (row) => row.status === 'ACTIVE' && STAFF_ROLES.has(row.role),
  );

  const removedStaffIds = staffRows
    .filter((row) => row.status !== 'ACTIVE' || !STAFF_ROLES.has(row.role))
    .map((row) => row.id);

  return desktopJson({
    data: {
      syncCursor: new Date().toISOString(),
      changes: {
        learners:      learnerRows,
        classes:       classRows,
        staff:          activeStaffRows,
        staffRemovedIds: removedStaffIds,
        subjects:      subjectRows,
        feeCategories: feeCategoryRows,
        attendance:     attendanceRows,
      },
    },
  });
}
