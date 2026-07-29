import {
  and,
  asc,
  eq,
  gte,
  inArray
} from 'drizzle-orm';
import {
  NextRequest
} from 'next/server';
import {
  db
} from '@/db';
import {
  schoolEvents
} from '@/db/schema';
import {
  authenticateMobileRequest,
  mobileError,
  mobileJson,
  pagination,
  resolveMobileSchoolId
} from '@/lib/mobile-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest
) {
  const auth =
    await authenticateMobileRequest(request);

  if ('response' in auth) {
    return auth.response;
  }

  if (auth.context.user.role === 'LEARNER') {
    return mobileError(
      403,
      'PERMISSION_DENIED',
      'Learners do not use AcademiaOS login accounts.'
    );
  }

  const schoolId =
    await resolveMobileSchoolId(
      auth.context,
      request
    );

  if (!schoolId) {
    return mobileError(
      400,
      'SCHOOL_REQUIRED',
      'This account must select an active school.'
    );
  }

  const audiences =
    auth.context.user.role === 'PARENT'
      ? ['ALL', 'PARENTS']
      : ['ALL', 'STAFF'];

  const { limit, offset } =
    pagination(request, 100);

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 86_400_000
  );

  const rows = await db
    .select({
      id: schoolEvents.id,
      title: schoolEvents.title,
      description: schoolEvents.description,
      eventType: schoolEvents.eventType,
      audience: schoolEvents.audience,
      venue: schoolEvents.venue,
      startsAt: schoolEvents.startsAt,
      endsAt: schoolEvents.endsAt,
      status: schoolEvents.status,
      publishedAt: schoolEvents.publishedAt
    })
    .from(schoolEvents)
    .where(and(
      eq(schoolEvents.schoolId, schoolId),
      eq(schoolEvents.status, 'PUBLISHED'),
      inArray(
        schoolEvents.audience,
        audiences
      ),
      gte(
        schoolEvents.startsAt,
        thirtyDaysAgo
      )
    ))
    .orderBy(asc(schoolEvents.startsAt))
    .limit(limit)
    .offset(offset);

  return mobileJson({
    data: {
      events: rows,
      pagination: {
        limit,
        offset
      }
    }
  });
}
