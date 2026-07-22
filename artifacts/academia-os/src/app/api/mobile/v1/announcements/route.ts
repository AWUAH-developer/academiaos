import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { authenticateMobileRequest, mobileError, mobileJson, pagination, resolveMobileSchoolId } from '@/lib/mobile-api';
import { canAccess } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  if (!canAccess(auth.context.user.role, 'messages')) return mobileError(403, 'PERMISSION_DENIED', 'This account cannot view school announcements.');
  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) return mobileError(400, 'SCHOOL_REQUIRED', 'This account must select an active school.');
  const { limit, offset } = pagination(request, 100);
  const rows = await db.select({
    id: messages.id,
    subject: messages.subject,
    body: messages.body,
    audience: messages.audience,
    createdAt: messages.createdAt,
    sentAt: messages.sentAt
  }).from(messages).where(and(
    eq(messages.schoolId, schoolId),
    inArray(messages.channel, ['APP', 'IN_APP']),
    inArray(messages.status, ['SENT', 'DELIVERED']),
    or(eq(messages.audience, 'ALL'), eq(messages.audience, auth.context.user.role), eq(messages.recipient, auth.context.user.id))
  )).orderBy(desc(messages.createdAt)).limit(limit).offset(offset);
  return mobileJson({ data: { announcements: rows, pagination: { limit, offset } } });
}
