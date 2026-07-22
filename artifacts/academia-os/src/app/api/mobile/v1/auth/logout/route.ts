import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { mobileSessions } from '@/db/schema';
import { audit } from '@/lib/auth';
import { authenticateMobileRequest, mobileJson } from '@/lib/mobile-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileRequest(request, { allowPasswordChange: true });
  if ('response' in auth) return auth.response;
  const now = new Date();
  await db.update(mobileSessions).set({ revokedAt: now, updatedAt: now }).where(eq(mobileSessions.id, auth.context.sessionId));
  await audit({ schoolId: auth.context.user.schoolId, userId: auth.context.user.id, action: 'MOBILE_LOGOUT', entityType: 'MobileSession', entityId: auth.context.sessionId });
  return mobileJson({ data: { signedOut: true } });
}
