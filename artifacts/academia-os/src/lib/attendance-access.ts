import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { classes } from '@/db/schema';
import type { UserRole } from '@/lib/types';

/**
 * These roles may mark the official attendance register for any class.
 *
 * HEADTEACHER:
 *   Can cover another class when its Class Teacher is sick or unavailable.
 *
 * PROPRIETOR:
 *   Can step in when necessary to keep school operations running.
 *
 * SUPER_ADMIN:
 *   Ultimate platform authority.
 */
export function canMarkAnyClassAttendance(role: UserRole) {
  return ['SUPER_ADMIN', 'HEADTEACHER', 'PROPRIETOR'].includes(role);
}

/**
 * Official learner attendance may be marked only by:
 *
 * 1. The teacher recorded as classes.classTeacherId for that class.
 * 2. Any HEADTEACHER.
 * 3. The PROPRIETOR.
 * 4. SUPER_ADMIN.
 *
 * A subject assignment by itself does NOT grant attendance authority.
 */
export async function canMarkClassAttendance(input: {
  role: UserRole;
  userId: string;
  schoolId: string;
  classId: string;
}) {
  const classRecord = (
    await db
      .select({
        id: classes.id,
        classTeacherId: classes.classTeacherId,
      })
      .from(classes)
      .where(
        and(
          eq(classes.id, input.classId),
          eq(classes.schoolId, input.schoolId),
          eq(classes.isActive, true),
        ),
      )
      .limit(1)
  )[0];

  if (!classRecord) return false;

  if (canMarkAnyClassAttendance(input.role)) return true;

  return classRecord.classTeacherId === input.userId;
}
