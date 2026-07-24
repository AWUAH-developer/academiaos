import { and, eq, isNull, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { mobileDevices, mobileSessions } from '@/db/schema';
import { authenticateDesktopRequest, desktopJson, resolveDesktopSchoolId } from '@/lib/desktop-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request);
  if ('response' in auth) return auth.response;
  const ctx = auth.context;
  const schoolId = await resolveDesktopSchoolId(ctx, request);

  const [activeSessions] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(mobileSessions)
    .innerJoin(mobileDevices, eq(mobileSessions.deviceId, mobileDevices.id))
    .where(and(
      eq(mobileSessions.userId, ctx.user.id),
      isNull(mobileSessions.revokedAt),
      sql`${mobileDevices.platform} IN ('windows','mac','linux')`,
    ));

  return desktopJson({
    data: {
      serverTime:        new Date().toISOString(),
      userId:            ctx.user.id,
      schoolId,
      deviceId:          ctx.deviceId,
      activeDesktopSessions: Number(activeSessions?.n || 0),
    },
  });
}
