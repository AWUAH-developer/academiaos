import { and, eq, gt } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { classes, feeCategories, learners, subjects, users } from '@/db/schema';
import {
  authenticateDesktopRequest, desktopError, desktopJson, resolveDesktopSchoolId,
} from '@/lib/desktop-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ syncCursor: z.string().datetime() });

export async function POST(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request);
  if ('response' in auth) return auth.response;
  const ctx = auth.context;

  let body: unknown;
  try { body = await request.json(); } catch {
    return desktopError(400, 'INVALID_JSON', 'Send a valid JSON body.');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return desktopError(400, 'INVALID_CURSOR', 'syncCursor (ISO datetime) is required.');

  const schoolId = await resolveDesktopSchoolId(ctx, request);
  if (!schoolId) return desktopError(400, 'NO_SCHOOL', 'schoolId is required.');

  const since = new Date(parsed.data.syncCursor);

  const [learnerRows, classRows, staffRows, subjectRows, feeCategoryRows] = await Promise.all([
    db.select().from(learners).where(and(eq(learners.schoolId, schoolId), gt(learners.updatedAt, since))),
    db.select().from(classes).where(and(eq(classes.schoolId, schoolId), gt(classes.updatedAt, since))),
    db.select({
      id: users.id, name: users.name, username: users.username,
      role: users.role, status: users.status, photoUrl: users.photoUrl, updatedAt: users.updatedAt,
    }).from(users).where(and(eq(users.schoolId, schoolId), gt(users.updatedAt, since))),
    db.select().from(subjects).where(and(eq(subjects.schoolId, schoolId), gt(subjects.updatedAt, since))),
    db.select().from(feeCategories).where(and(eq(feeCategories.schoolId, schoolId), gt(feeCategories.updatedAt, since))),
  ]);

  return desktopJson({
    data: {
      syncCursor: new Date().toISOString(),
      changes: {
        learners:      learnerRows,
        classes:       classRows,
        staff:         staffRows,
        subjects:      subjectRows,
        feeCategories: feeCategoryRows,
      },
    },
  });
}
