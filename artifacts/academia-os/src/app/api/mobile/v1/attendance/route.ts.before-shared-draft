import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { attendanceRecords, learners } from '@/db/schema';
import { audit } from '@/lib/auth';
import { accessibleLearnerIds, authenticateMobileRequest, mayAccessLearner, mobileError, mobileJson, pagination, resolveMobileSchoolId } from '@/lib/mobile-api';
import { canAccess, canRecordAttendance } from '@/lib/permissions';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK', 'PARTIAL', 'HALF_DAY_MORNING', 'HALF_DAY_AFTERNOON', 'SCHOOL_ACTIVITY', 'SUSPENDED', 'HOLIDAY']);
const writeSchema = z.object({
  learnerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: attendanceStatus,
  reason: z.string().trim().max(500).optional()
});

function safeDate(value: string | null, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  if (!canAccess(auth.context.user.role, 'attendance')) return mobileError(403, 'PERMISSION_DENIED', 'This account cannot view attendance.');
  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) return mobileError(400, 'SCHOOL_REQUIRED', 'This account must select an active school.');
  const learnerId = cleanText(request.nextUrl.searchParams.get('learnerId'), 64);
  if (learnerId && !(await mayAccessLearner(auth.context, schoolId, learnerId))) return mobileError(404, 'LEARNER_NOT_FOUND', 'The learner was not found.');
  const permitted = await accessibleLearnerIds(auth.context, schoolId);
  if (permitted !== null && permitted.length === 0) return mobileJson({ data: { attendance: [], pagination: { limit: 0, offset: 0 } } });
  const now = new Date();
  const from = safeDate(request.nextUrl.searchParams.get('from'), new Date(now.getTime() - 90 * 86_400_000));
  const to = safeDate(request.nextUrl.searchParams.get('to'), now);
  const { limit, offset } = pagination(request, 200);
  const conditions = [eq(attendanceRecords.schoolId, schoolId), gte(attendanceRecords.date, from), lte(attendanceRecords.date, new Date(to.getTime() + 86_399_999))];
  if (learnerId) conditions.push(eq(attendanceRecords.learnerId, learnerId));
  if (permitted !== null) conditions.push(inArray(attendanceRecords.learnerId, permitted));
  const rows = await db.select({
    id: attendanceRecords.id,
    learnerId: attendanceRecords.learnerId,
    learnerFirstName: learners.firstName,
    learnerLastName: learners.lastName,
    date: attendanceRecords.date,
    status: attendanceRecords.status,
    checkInTime: attendanceRecords.checkInTime,
    checkOutTime: attendanceRecords.checkOutTime,
    reason: attendanceRecords.reason
  }).from(attendanceRecords)
    .innerJoin(learners, eq(attendanceRecords.learnerId, learners.id))
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.date))
    .limit(limit)
    .offset(offset);
  return mobileJson({ data: { attendance: rows, pagination: { limit, offset } } });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  if (!canRecordAttendance(auth.context.user.role)) return mobileError(403, 'PERMISSION_DENIED', 'This account cannot record attendance.');
  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) return mobileError(400, 'SCHOOL_REQUIRED', 'This account must select an active school.');
  let body: unknown;
  try { body = await request.json(); } catch { return mobileError(400, 'INVALID_JSON', 'Send a valid JSON request body.'); }
  const parsed = writeSchema.safeParse(body);
  if (!parsed.success) return mobileError(400, 'INVALID_ATTENDANCE', 'Learner, date, and a valid attendance status are required.');
  if (!(await mayAccessLearner(auth.context, schoolId, parsed.data.learnerId))) return mobileError(404, 'LEARNER_NOT_FOUND', 'The learner was not found.');
  const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, parsed.data.learnerId), eq(learners.schoolId, schoolId))).limit(1))[0];
  if (!learner) return mobileError(404, 'LEARNER_NOT_FOUND', 'The learner was not found.');
  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
  if (date.getTime() > Date.now() + 86_400_000) return mobileError(400, 'FUTURE_ATTENDANCE', 'Attendance cannot be recorded more than one day in advance.');
  const [record] = await db.insert(attendanceRecords).values({
    schoolId,
    learnerId: learner.id,
    date,
    status: parsed.data.status,
    reason: parsed.data.reason ? cleanText(parsed.data.reason, 500) : null,
    recordedById: auth.context.user.id
  }).onConflictDoUpdate({
    target: [attendanceRecords.learnerId, attendanceRecords.date],
    set: {
      status: parsed.data.status,
      reason: parsed.data.reason ? cleanText(parsed.data.reason, 500) : null,
      recordedById: auth.context.user.id,
      updatedAt: new Date()
    }
  }).returning();
  await audit({ schoolId, userId: auth.context.user.id, action: 'MOBILE_ATTENDANCE_RECORDED', entityType: 'AttendanceRecord', entityId: record.id, newValue: { learnerId: learner.id, date: parsed.data.date, status: parsed.data.status } });
  return mobileJson({ data: { attendance: record } }, 201);
}
