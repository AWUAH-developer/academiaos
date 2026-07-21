import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { guardians, learnerGuardians, learners } from '@/db/schema';
import type { AuthUser } from '@/lib/auth';

export async function visibleLearnerIds(user: AuthUser) {
  if (user.role === 'PARENT') {
    const rows = await db.select({ learnerId: learnerGuardians.learnerId }).from(learnerGuardians).innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id)).where(eq(guardians.userId, user.id));
    return rows.map((r) => r.learnerId);
  }
  if (user.role === 'LEARNER') {
    const row = (await db.select({ id: learners.id }).from(learners).where(eq(learners.userId, user.id)).limit(1))[0];
    return row ? [row.id] : [];
  }
  return null;
}

export async function mayViewLearner(user: AuthUser, learnerId: string) {
  const ids = await visibleLearnerIds(user); return ids === null || ids.includes(learnerId);
}
