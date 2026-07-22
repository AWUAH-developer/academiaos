import { and, desc, eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { academicYears, learners, terminalReports, terms } from '@/db/schema';
import { accessibleLearnerIds, authenticateMobileRequest, mayAccessLearner, mobileError, mobileJson, pagination, resolveMobileSchoolId } from '@/lib/mobile-api';
import { cleanText } from '@/lib/validation';
import type { UserRole } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESULT_ROLES = new Set<UserRole>(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PROPRIETOR', 'HEADTEACHER', 'ACADEMIC_ADMIN', 'TEACHER', 'PARENT', 'LEARNER']);

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  if (!RESULT_ROLES.has(auth.context.user.role)) return mobileError(403, 'PERMISSION_DENIED', 'This account cannot view terminal reports.');
  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) return mobileError(400, 'SCHOOL_REQUIRED', 'This account must select an active school.');
  const learnerId = cleanText(request.nextUrl.searchParams.get('learnerId'), 64);
  if (learnerId && !(await mayAccessLearner(auth.context, schoolId, learnerId))) return mobileError(404, 'LEARNER_NOT_FOUND', 'The learner was not found.');
  const permitted = await accessibleLearnerIds(auth.context, schoolId);
  if (permitted !== null && permitted.length === 0) return mobileJson({ data: { reports: [], pagination: { limit: 0, offset: 0 } } });
  const { limit, offset } = pagination(request, 100);
  const conditions = [eq(terminalReports.schoolId, schoolId), eq(terminalReports.status, 'PUBLISHED')];
  if (learnerId) conditions.push(eq(terminalReports.learnerId, learnerId));
  if (permitted !== null) conditions.push(inArray(terminalReports.learnerId, permitted));
  const rows = await db.select({
    id: terminalReports.id,
    learnerId: terminalReports.learnerId,
    learnerFirstName: learners.firstName,
    learnerLastName: learners.lastName,
    academicYearId: terminalReports.academicYearId,
    academicYear: academicYears.name,
    termId: terminalReports.termId,
    term: terms.name,
    snapshot: terminalReports.snapshot,
    verificationCode: terminalReports.verificationCode,
    status: terminalReports.status,
    publishedAt: terminalReports.publishedAt
  }).from(terminalReports)
    .innerJoin(learners, eq(terminalReports.learnerId, learners.id))
    .innerJoin(academicYears, eq(terminalReports.academicYearId, academicYears.id))
    .innerJoin(terms, eq(terminalReports.termId, terms.id))
    .where(and(...conditions))
    .orderBy(desc(terminalReports.publishedAt))
    .limit(limit)
    .offset(offset);
  return mobileJson({ data: { reports: rows, pagination: { limit, offset } } });
}
