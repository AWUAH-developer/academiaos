import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { terms } from '@/db/schema';

export async function findAttendancePeriod(input: {
  schoolId: string;
  date: Date;
}) {
  return (
    await db
      .select({
        termId: terms.id,
        academicYearId: terms.academicYearId,
        termName: terms.name,
      })
      .from(terms)
      .where(
        and(
          eq(terms.schoolId, input.schoolId),
          lte(terms.startsOn, input.date),
          gte(terms.endsOn, input.date),
        ),
      )
      .limit(1)
  )[0] ?? null;
}
