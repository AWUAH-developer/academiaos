import { and, asc, eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { classes, learners } from '@/db/schema';
import { accessibleLearnerIds, authenticateMobileRequest, mayAccessLearner, mobileError, mobileJson, pagination, resolveMobileSchoolId } from '@/lib/mobile-api';
import { canAccess } from '@/lib/permissions';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  if (!canAccess(auth.context.user.role, 'learners') && auth.context.user.role !== 'LEARNER') return mobileError(403, 'PERMISSION_DENIED', 'This account cannot view learner profiles.');
  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) return mobileError(400, 'SCHOOL_REQUIRED', 'This account must select an active school.');
  const learnerId = cleanText(request.nextUrl.searchParams.get('learnerId'), 64);
  if (learnerId && !(await mayAccessLearner(auth.context, schoolId, learnerId))) {
    return mobileError(404, 'LEARNER_NOT_FOUND', 'The learner was not found.');
  }
  const permitted = await accessibleLearnerIds(auth.context, schoolId);
  if (permitted !== null && permitted.length === 0) return mobileJson({ data: { learners: [], pagination: { limit: 0, offset: 0 } } });
  const { limit, offset } = pagination(request);
  const conditions = [eq(learners.schoolId, schoolId)];
  if (learnerId) conditions.push(eq(learners.id, learnerId));
  if (permitted !== null) conditions.push(inArray(learners.id, permitted));
  const rows = await db.select({
    id: learners.id,
    admissionNo: learners.admissionNo,
    firstName: learners.firstName,
    lastName: learners.lastName,
    photoUrl: learners.photoUrl,
    gender: learners.gender,
    classId: learners.classId,
    className: classes.name,
    classStream: classes.stream,
    paymentPlan: learners.paymentPlan,
    status: learners.status
  }).from(learners)
    .leftJoin(classes, eq(learners.classId, classes.id))
    .where(and(...conditions))
    .orderBy(asc(learners.firstName), asc(learners.lastName))
    .limit(limit)
    .offset(offset);
  return mobileJson({ data: { learners: rows, pagination: { limit, offset } } });
}
