import { and, eq, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import {
  academicYears, classes, feeCategories, learners, schools, subjects, terms, users,
} from '@/db/schema';
import {
  authenticateDesktopRequest, desktopError, desktopJson,
  desktopAccessibleLearnerIds, resolveDesktopSchoolId,
} from '@/lib/desktop-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request);
  if ('response' in auth) return auth.response;
  const ctx = auth.context;

  const schoolId = await resolveDesktopSchoolId(ctx, request);
  if (!schoolId) return desktopError(400, 'NO_SCHOOL', 'schoolId is required.');

  const [
    school,
    learnerIds,
    classRows,
    subjectRows,
    staffRows,
    feeCategoryRows,
    academicYearRows,
    termRows,
  ] = await Promise.all([
    db.select().from(schools).where(eq(schools.id, schoolId)).limit(1).then((r) => r[0]),
    desktopAccessibleLearnerIds(ctx, schoolId),
    db.select().from(classes).where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true))),
    db.select().from(subjects).where(and(eq(subjects.schoolId, schoolId), eq(subjects.isActive, true))),
    db.select({
      id: users.id, name: users.name, username: users.username,
      role: users.role, status: users.status, photoUrl: users.photoUrl,
    }).from(users).where(and(eq(users.schoolId, schoolId), eq(users.status, 'ACTIVE'))),
    db.select().from(feeCategories).where(and(eq(feeCategories.schoolId, schoolId), eq(feeCategories.isActive, true))),
    db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)),
    db.select().from(terms).where(eq(terms.schoolId, schoolId)),
  ]);

  // Fetch learner records scoped by role
  const learnerRows = await (async () => {
    if (learnerIds === null) {
      return db.select().from(learners).where(and(eq(learners.schoolId, schoolId), eq(learners.status, 'ACTIVE')));
    }
    if (learnerIds.length === 0) return [];
    const { inArray } = await import('drizzle-orm');
    return db.select().from(learners).where(and(
      eq(learners.schoolId, schoolId),
      inArray(learners.id, learnerIds),
    ));
  })();

  return desktopJson({
    data: {
      syncCursor:   new Date().toISOString(),
      school,
      classes:      classRows,
      subjects:     subjectRows,
      staff:        staffRows,
      feeCategories: feeCategoryRows,
      academicYears: academicYearRows,
      terms:        termRows,
      learners:     learnerRows,
      counts: {
        classes:       classRows.length,
        subjects:      subjectRows.length,
        staff:         staffRows.length,
        feeCategories: feeCategoryRows.length,
        academicYears: academicYearRows.length,
        terms:         termRows.length,
        learners:      learnerRows.length,
      },
    },
  });
}
