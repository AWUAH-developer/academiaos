import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { feeCategories, feeCharges, financialAdjustments, learners, payments } from '@/db/schema';
import { accessibleLearnerIds, authenticateMobileRequest, mayAccessLearner, mobileError, mobileJson, pagination, resolveMobileSchoolId } from '@/lib/mobile-api';
import { calculateFinancialBalance, financialAdjustmentTotals } from '@/lib/financial-balance';
import { canAccess } from '@/lib/permissions';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  if (!canAccess(auth.context.user.role, 'fees')) return mobileError(403, 'PERMISSION_DENIED', 'This account cannot view fees.');
  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) return mobileError(400, 'SCHOOL_REQUIRED', 'This account must select an active school.');
  const learnerId = cleanText(request.nextUrl.searchParams.get('learnerId'), 64);
  if (learnerId && !(await mayAccessLearner(auth.context, schoolId, learnerId))) return mobileError(404, 'LEARNER_NOT_FOUND', 'The learner was not found.');
  const permitted = await accessibleLearnerIds(auth.context, schoolId);
  if (permitted !== null && permitted.length === 0) return mobileJson({ data: { summary: [], charges: [], pagination: { limit: 0, offset: 0 } } });
  const { limit, offset } = pagination(request, 200);
  const conditions = [eq(feeCharges.schoolId, schoolId)];
  if (learnerId) conditions.push(eq(feeCharges.learnerId, learnerId));
  if (permitted !== null) conditions.push(inArray(feeCharges.learnerId, permitted));
  const rows = await db.select({
    id: feeCharges.id,
    learnerId: feeCharges.learnerId,
    learnerFirstName: learners.firstName,
    learnerLastName: learners.lastName,
    category: feeCategories.name,
    description: feeCharges.description,
    amount: feeCharges.amount,
    paidAmount: feeCharges.paidAmount,
    status: feeCharges.status,
    dueDate: feeCharges.dueDate,
    createdAt: feeCharges.createdAt
  }).from(feeCharges)
    .innerJoin(learners, eq(feeCharges.learnerId, learners.id))
    .leftJoin(feeCategories, eq(feeCharges.categoryId, feeCategories.id))
    .where(and(...conditions))
    .orderBy(desc(feeCharges.createdAt))
    .limit(limit)
    .offset(offset);
  const aggregateRows = await db
    .select({
      learnerId: feeCharges.learnerId,
      totalCharged: sql<number>`coalesce(sum(${feeCharges.amount}), 0)::numeric`,
    })
    .from(feeCharges)
    .where(and(...conditions))
    .groupBy(feeCharges.learnerId);

  const summaryLearnerIds = aggregateRows.map(
    (row) => row.learnerId,
  );

  const paymentRows = summaryLearnerIds.length
    ? await db
        .select({
          learnerId: payments.learnerId,
          amount: payments.amount,
        })
        .from(payments)
        .where(
          and(
            eq(payments.schoolId, schoolId),
            inArray(payments.learnerId, summaryLearnerIds),
          ),
        )
    : [];

  const adjustmentRows = summaryLearnerIds.length
    ? await db
        .select({
          learnerId: financialAdjustments.learnerId,
          type: financialAdjustments.type,
          amount: financialAdjustments.amount,
        })
        .from(financialAdjustments)
        .where(
          and(
            eq(financialAdjustments.schoolId, schoolId),
            inArray(
              financialAdjustments.learnerId,
              summaryLearnerIds,
            ),
            isNotNull(financialAdjustments.approvedAt),
          ),
        )
    : [];

  const summary = aggregateRows.map((row) => {
    const totalCharged = Number(row.totalCharged || 0);

    const totalPayments = paymentRows
      .filter(
        (payment) => payment.learnerId === row.learnerId,
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0,
      );

    const adjustments = adjustmentRows
      .filter(
        (adjustment) =>
          adjustment.learnerId === row.learnerId,
      )
      .map((adjustment) => ({
        type: adjustment.type,
        amount: Number(adjustment.amount || 0),
      }));

    const adjustmentTotals =
      financialAdjustmentTotals(adjustments);

    const trueBalance = calculateFinancialBalance({
      totalCharges: totalCharged,
      totalPayments,
      adjustments,
    });

    return {
      learnerId: row.learnerId,
      totalCharged,
      totalPaid: Math.max(
        0,
        totalPayments -
          adjustmentTotals.paymentReversals,
      ),
      balance: trueBalance,
      outstanding: Math.max(0, trueBalance),
      creditCarryForward: Math.max(0, -trueBalance),
    };
  });

  return mobileJson({ data: { summary, charges: rows, pagination: { limit, offset } } });
}
