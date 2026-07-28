import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { guardians, learnerGuardians, learners, notifications } from '@/db/schema';

export async function guardianUserIdsForLearner(learnerId: string) {
  const rows = await db.select({ userId: guardians.userId })
    .from(learnerGuardians)
    .innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
    .where(eq(learnerGuardians.learnerId, learnerId));
  return rows.map((row) => row.userId).filter((id): id is string => Boolean(id));
}

export async function notifyLearnerGuardians(input: { schoolId: string; learnerId: string; type: string; title: string; body: string; link?: string }) {
  const userIds = await guardianUserIdsForLearner(input.learnerId);
  for (const userId of userIds) {
    await db.insert(notifications).values({ schoolId: input.schoolId, userId, type: input.type, title: input.title, body: input.body, link: input.link });
  }
}

export async function notifyClassGuardians(input: { schoolId: string; classId: string; type: string; title: string; body: string; link?: string }) {
  const learnerRows = await db.select({ id: learners.id }).from(learners).where(and(eq(learners.schoolId, input.schoolId), eq(learners.classId, input.classId), eq(learners.status, 'ACTIVE')));
  if (!learnerRows.length) return;
  const rows = await db.select({ userId: guardians.userId })
    .from(learnerGuardians)
    .innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
    .where(inArray(learnerGuardians.learnerId, learnerRows.map((learner) => learner.id)));
  const userIds = Array.from(new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id))));
  for (const userId of userIds) {
    await db.insert(notifications).values({ schoolId: input.schoolId, userId, type: input.type, title: input.title, body: input.body, link: input.link });
  }
}
