import { and, desc, eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { academicSubmissions, academicYears, learners, subjects, terms } from '@/db/schema';
import { accessibleLearnerIds, authenticateMobileRequest, mayAccessLearner, mobileError, mobileJson, pagination, resolveMobileSchoolId } from '@/lib/mobile-api';
import { cleanText } from '@/lib/validation';
import type { UserRole } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESULT_ROLES = new Set<UserRole>(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PROPRIETOR', 'HEADTEACHER', 'ACADEMIC_ADMIN', 'TEACHER', 'PARENT', 'LEARNER']);

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  if (!RESULT_ROLES.has(auth.context.user.role)) return mobileError(403, 'PERMISSION_DENIED', 'This account cannot view academic results.');
  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) return mobileError(400, 'SCHOOL_REQUIRED', 'This account must select an active school.');
  const learnerId = cleanText(request.nextUrl.searchParams.get('learnerId'), 64);
  const termId = cleanText(request.nextUrl.searchParams.get('termId'), 64);
  if (learnerId && !(await mayAccessLearner(auth.context, schoolId, learnerId))) return mobileError(404, 'LEARNER_NOT_FOUND', 'The learner was not found.');
  const permitted = await accessibleLearnerIds(auth.context, schoolId);
  if (permitted !== null && permitted.length === 0) return mobileJson({ data: { results: [], pagination: { limit: 0, offset: 0 } } });
  const { limit, offset } = pagination(request, 200);
  const conditions = [eq(academicSubmissions.schoolId, schoolId), inArray(academicSubmissions.status, ['APPROVED', 'LOCKED'])];
  if (learnerId) conditions.push(eq(academicSubmissions.learnerId, learnerId));
  if (termId) conditions.push(eq(academicSubmissions.termId, termId));
  if (permitted !== null) conditions.push(inArray(academicSubmissions.learnerId, permitted));
  const rows = await db.select({
    id: academicSubmissions.id,
    learnerId: academicSubmissions.learnerId,
    learnerFirstName: learners.firstName,
    learnerLastName: learners.lastName,
    academicYearId: academicSubmissions.academicYearId,
    academicYear: academicYears.name,
    termId: academicSubmissions.termId,
    term: terms.name,
    subjectId: academicSubmissions.subjectId,
    subject: subjects.name,
    classworkScore: academicSubmissions.classworkScore,
    homeworkScore: academicSubmissions.homeworkScore,
    testScore: academicSubmissions.testScore,
    examScore: academicSubmissions.examScore,
    totalScore: academicSubmissions.totalScore,
    grade: academicSubmissions.grade,
    position: academicSubmissions.position,
    teacherRemark: academicSubmissions.teacherRemark,
    conductRemark: academicSubmissions.conductRemark,
    classTeacherRemark: academicSubmissions.classTeacherRemark,
    status: academicSubmissions.status,
    approvedAt: academicSubmissions.approvedAt,
    lockedAt: academicSubmissions.lockedAt
  }).from(academicSubmissions)
    .innerJoin(learners, eq(academicSubmissions.learnerId, learners.id))
    .innerJoin(academicYears, eq(academicSubmissions.academicYearId, academicYears.id))
    .innerJoin(terms, eq(academicSubmissions.termId, terms.id))
    .innerJoin(subjects, eq(academicSubmissions.subjectId, subjects.id))
    .where(and(...conditions))
    .orderBy(desc(academicSubmissions.approvedAt), subjects.name)
    .limit(limit)
    .offset(offset);
  return mobileJson({ data: { results: rows, pagination: { limit, offset } } });
}
