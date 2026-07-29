import { and, asc, eq, gt, isNotNull, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { academicYears, feeCategories, feeCharges, feeStructures, financialAdjustments, learners, terms } from '@/db/schema';

function attendanceTermNumber(name: string) {
  const normalized = name.trim().toLowerCase().replaceAll('_', ' ');
  const match = normalized.match(/term\s*([123])/);
  return match ? Number(match[1]) : null;
}

function inclusiveEndOfDay(value: Date) {
  const result = new Date(value);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

export async function attendanceCorrectionDeadline(input: {
  schoolId: string;
  academicYearId: string;
  termId: string;
}) {
  const period = (
    await db
      .select({
        termName: terms.name,
        termEndsOn: terms.endsOn,
        yearStartsOn: academicYears.startsOn,
        yearEndsOn: academicYears.endsOn,
      })
      .from(terms)
      .innerJoin(
        academicYears,
        eq(terms.academicYearId, academicYears.id),
      )
      .where(
        and(
          eq(terms.id, input.termId),
          eq(terms.academicYearId, input.academicYearId),
          eq(terms.schoolId, input.schoolId),
          eq(academicYears.schoolId, input.schoolId),
        ),
      )
      .limit(1)
  )[0];

  if (!period) return null;

  const termNo = attendanceTermNumber(period.termName);

  /*
   * Term 1 and Term 2 correction requests close at the end
   * of their own configured term.
   */
  if (termNo === 1 || termNo === 2) {
    return inclusiveEndOfDay(period.termEndsOn);
  }

  /*
   * Term 3 remains correctable through Term 3 of the following
   * academic year.
   */
  if (termNo === 3) {
    const nextYear = (
      await db
        .select({
          id: academicYears.id,
          endsOn: academicYears.endsOn,
        })
        .from(academicYears)
        .where(
          and(
            eq(academicYears.schoolId, input.schoolId),
            gt(academicYears.startsOn, period.yearStartsOn),
          ),
        )
        .orderBy(asc(academicYears.startsOn))
        .limit(1)
    )[0];

    /*
     * The following academic year may not yet have been configured.
     * In that case, do not prematurely close Term 3 corrections.
     */
    if (!nextYear) return null;

    const nextTerms = await db
      .select({
        name: terms.name,
        endsOn: terms.endsOn,
      })
      .from(terms)
      .where(
        and(
          eq(terms.schoolId, input.schoolId),
          eq(terms.academicYearId, nextYear.id),
        ),
      );

    const nextTerm3 = nextTerms.find(
      (row) => attendanceTermNumber(row.name) === 3,
    );

    return inclusiveEndOfDay(nextTerm3?.endsOn || nextYear.endsOn);
  }

  /*
   * Non-standard term names are not silently guessed.
   */
  return null;
}

export async function reconcileAttendanceCorrectionFees(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    schoolId: string;
    learner: typeof learners.$inferSelect;
    date: Date;
    newStatus: string;
    requestId: string;
    actorId: string;
    reason: string;
  },
) {
  if (
    input.learner.paymentPlan !== 'DAILY_FEE' ||
    !input.learner.classId
  ) {
    return;
  }

  const structures = await tx
    .select({
      structure: feeStructures,
      category: feeCategories,
    })
    .from(feeStructures)
    .innerJoin(
      feeCategories,
      eq(feeStructures.categoryId, feeCategories.id),
    )
    .where(
      and(
        eq(feeStructures.schoolId, input.schoolId),
        eq(feeStructures.paymentPlan, 'DAILY_FEE'),
        eq(feeStructures.isActive, true),
        or(
          eq(feeStructures.classId, input.learner.classId),
          isNull(feeStructures.classId),
        ),
      ),
    );

  for (const row of structures) {
    const shouldCharge =
      input.newStatus !== 'ABSENT' ||
      row.structure.chargeOnAbsent;

    const existing = (
      await tx
        .select()
        .from(feeCharges)
        .where(
          and(
            eq(feeCharges.learnerId, input.learner.id),
            eq(feeCharges.categoryId, row.category.id),
            eq(feeCharges.attendanceDate, input.date),
          ),
        )
        .limit(1)
    )[0];

    const description =
      `${row.category.name} for ${input.date.toISOString().slice(0,10)}`;

    if (shouldCharge && !existing) {
      await tx.insert(feeCharges).values({
        schoolId: input.schoolId,
        learnerId: input.learner.id,
        categoryId: row.category.id,
        description,
        amount: row.structure.amount,
        attendanceDate: input.date,
        isAutomatic: true,
      });

      continue;
    }

    if (!existing || !existing.isAutomatic) {
      continue;
    }

    const adjustments = await tx
      .select()
      .from(financialAdjustments)
      .where(
        and(
          eq(financialAdjustments.schoolId, input.schoolId),
          eq(financialAdjustments.chargeId, existing.id),
          isNotNull(financialAdjustments.approvedAt),
        ),
      );

    const credits = adjustments
      .filter((item) => item.type === 'ATTENDANCE_FEE_CREDIT')
      .reduce((sum, item) => sum + item.amount, 0);

    const reversals = adjustments
      .filter(
        (item) =>
          item.type === 'ATTENDANCE_FEE_CREDIT_REVERSAL',
      )
      .reduce((sum, item) => sum + item.amount, 0);

    const netCredit = Math.max(0, credits - reversals);

    if (shouldCharge) {
      /*
       * Attendance is chargeable again.
       * Restore the normal fee amount and reverse any old credit.
       */
      if (netCredit > 0) {
        await tx.insert(financialAdjustments).values({
          schoolId: input.schoolId,
          learnerId: input.learner.id,
          chargeId: existing.id,
          type: 'ATTENDANCE_FEE_CREDIT_REVERSAL',
          amount: netCredit,
          reason:
            `Attendance correction ${input.requestId}: daily fee restored. ${input.reason}`,
          requestedById: input.actorId,
          approvedById: input.actorId,
          approvedAt: new Date(),
        });
      }

      const paid = existing.paidAmount;

      const nextStatus =
        paid <= 0
          ? 'OPEN'
          : paid >= row.structure.amount
            ? 'PAID'
            : 'PARTIALLY_PAID';

      await tx
        .update(feeCharges)
        .set({
          description,
          amount: row.structure.amount,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(feeCharges.id, existing.id));

      continue;
    }

    /*
     * Attendance is no longer chargeable.
     */
    if (existing.paidAmount <= 0) {
      await tx
        .update(feeCharges)
        .set({
          amount: 0,
          status: 'VOID',
          updatedAt: new Date(),
        })
        .where(eq(feeCharges.id, existing.id));

      continue;
    }

    /*
     * Money has already been received against this attendance fee.
     * Never erase or rewrite that payment.
     *
     * Preserve the paid portion on the historical charge and create
     * a learner credit that can later carry forward.
     */
    const desiredCredit = existing.paidAmount;
    const additionalCredit = Math.max(
      0,
      desiredCredit - netCredit,
    );

    if (additionalCredit > 0) {
      await tx.insert(financialAdjustments).values({
        schoolId: input.schoolId,
        learnerId: input.learner.id,
        chargeId: existing.id,
        type: 'ATTENDANCE_FEE_CREDIT',
        amount: additionalCredit,
        reason:
          `Attendance correction ${input.requestId}: fee credit after attendance change. ${input.reason}`,
        requestedById: input.actorId,
        approvedById: input.actorId,
        approvedAt: new Date(),
      });
    }

    await tx
      .update(feeCharges)
      .set({
        amount: existing.paidAmount,
        status: 'PAID',
        updatedAt: new Date(),
      })
      .where(eq(feeCharges.id, existing.id));
  }
}
