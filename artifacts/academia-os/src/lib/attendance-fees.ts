import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { feeCategories, feeCharges, feeStructures, learners } from '@/db/schema';

export async function createDailyAttendanceCharges(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  schoolId: string,
  learner: typeof learners.$inferSelect,
  date: Date,
  status: string,
) {
  if (learner.paymentPlan !== 'DAILY' || !learner.classId) return;

  const structures = await tx
    .select({ structure: feeStructures, category: feeCategories })
    .from(feeStructures)
    .innerJoin(feeCategories, eq(feeStructures.categoryId, feeCategories.id))
    .where(
      and(
        eq(feeStructures.schoolId, schoolId),
        eq(feeStructures.paymentPlan, 'DAILY'),
        eq(feeStructures.isActive, true),
        or(
          eq(feeStructures.classId, learner.classId),
          isNull(feeStructures.classId),
        ),
      ),
    );

  for (const row of structures) {
    const shouldCharge = status !== 'ABSENT' || row.structure.chargeOnAbsent;

    const existing = (
      await tx
        .select()
        .from(feeCharges)
        .where(
          and(
            eq(feeCharges.learnerId, learner.id),
            eq(feeCharges.categoryId, row.category.id),
            eq(feeCharges.attendanceDate, date),
          ),
        )
        .limit(1)
    )[0];

    const description = `${row.category.name} for ${date.toISOString().slice(0, 10)}`;

    if (shouldCharge && !existing) {
      await tx.insert(feeCharges).values({
        schoolId,
        learnerId: learner.id,
        categoryId: row.category.id,
        description,
        amount: row.structure.amount,
        attendanceDate: date,
        isAutomatic: true,
      });
      continue;
    }

    if (
      shouldCharge &&
      existing &&
      existing.status === 'VOID' &&
      existing.paidAmount === 0
    ) {
      await tx
        .update(feeCharges)
        .set({
          description,
          amount: row.structure.amount,
          status: 'OPEN',
          updatedAt: new Date(),
        })
        .where(eq(feeCharges.id, existing.id));
      continue;
    }

    if (
      !shouldCharge &&
      existing &&
      existing.isAutomatic &&
      existing.paidAmount === 0 &&
      existing.status !== 'VOID'
    ) {
      await tx
        .update(feeCharges)
        .set({ amount: 0, status: 'VOID', updatedAt: new Date() })
        .where(eq(feeCharges.id, existing.id));
    }
  }
}
