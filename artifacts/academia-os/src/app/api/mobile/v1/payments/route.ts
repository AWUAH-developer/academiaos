import { and, desc, eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { learners, payments } from '@/db/schema';
import { accessibleLearnerIds, authenticateMobileRequest, mayAccessLearner, mobileError, mobileJson, pagination, resolveMobileSchoolId } from '@/lib/mobile-api';
import { canAccess } from '@/lib/permissions';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  if (!canAccess(auth.context.user.role, 'fees')) return mobileError(403, 'PERMISSION_DENIED', 'This account cannot view payments.');
  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) return mobileError(400, 'SCHOOL_REQUIRED', 'This account must select an active school.');
  const learnerId = cleanText(request.nextUrl.searchParams.get('learnerId'), 64);
  if (learnerId && !(await mayAccessLearner(auth.context, schoolId, learnerId))) return mobileError(404, 'LEARNER_NOT_FOUND', 'The learner was not found.');
  const permitted = await accessibleLearnerIds(auth.context, schoolId);
  if (permitted !== null && permitted.length === 0) return mobileJson({ data: { payments: [], pagination: { limit: 0, offset: 0 } } });
  const { limit, offset } = pagination(request, 200);
  const conditions = [eq(payments.schoolId, schoolId)];
  if (learnerId) conditions.push(eq(payments.learnerId, learnerId));
  if (permitted !== null) conditions.push(inArray(payments.learnerId, permitted));
  const rows = await db.select({
    id: payments.id,
    learnerId: payments.learnerId,
    learnerFirstName: learners.firstName,
    learnerLastName: learners.lastName,
    amount: payments.amount,
    method: payments.method,
    reference: payments.reference,
    receiptNo: payments.receiptNo,
    notes: payments.notes,
    createdAt: payments.createdAt
  }).from(payments)
    .innerJoin(learners, eq(payments.learnerId, learners.id))
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);
  return mobileJson({ data: { payments: rows, pagination: { limit, offset } } });
}
