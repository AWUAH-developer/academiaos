import { and, eq, inArray, or, type Column, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { classes, guardians, learnerGuardians, learners, teacherAssignments } from '@/db/schema';
import type { AuthUser } from '@/lib/auth';

/**
 * A user's official teaching scope: class+subject pairs from subject-teacher
 * assignments, plus classes where they are the official class teacher (a class
 * teacher covers every subject of that class, mirroring teacherMayEnter).
 * Used to scope HEADTEACHER academic views to their own assignments only —
 * no school-wide monitoring.
 */
export type TeachingScope = {
  pairs: Array<{ classId: string; subjectId: string }>;
  classTeacherClassIds: string[];
};

export async function teachingScope(userId: string, schoolId: string): Promise<TeachingScope> {
  const [assigned, own] = await Promise.all([
    db.select({ classId: teacherAssignments.classId, subjectId: teacherAssignments.subjectId }).from(teacherAssignments).where(and(eq(teacherAssignments.teacherId, userId), eq(teacherAssignments.schoolId, schoolId))),
    db.select({ classId: classes.id }).from(classes).where(and(eq(classes.classTeacherId, userId), eq(classes.schoolId, schoolId)))
  ]);
  return { pairs: assigned, classTeacherClassIds: own.map((row) => row.classId) };
}

/**
 * SQL condition limiting rows to the teaching scope (class+subject pairs, or
 * any subject in a class-teacher class). Returns null when the scope is empty,
 * meaning no rows may be shown at all.
 */
export function teachingScopeCondition(scope: TeachingScope, classColumn: Column, subjectColumn: Column): SQL | null {
  const parts: SQL[] = [];
  if (scope.classTeacherClassIds.length) parts.push(inArray(classColumn, scope.classTeacherClassIds));
  for (const pair of scope.pairs) {
    const part = and(eq(classColumn, pair.classId), eq(subjectColumn, pair.subjectId));
    if (part) parts.push(part);
  }
  if (!parts.length) return null;
  return or(...parts) ?? null;
}

/** Whether a class+subject (subject optional) falls within the teaching scope. */
export function inTeachingScope(scope: TeachingScope, classId: string, subjectId?: string) {
  if (scope.classTeacherClassIds.includes(classId)) return true;
  return scope.pairs.some((pair) => pair.classId === classId && (subjectId === undefined || pair.subjectId === subjectId));
}

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
