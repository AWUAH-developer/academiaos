import { NextRequest } from 'next/server';
import { authenticateDesktopRequest, desktopJson } from '@/lib/desktop-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request, { allowPasswordChange: true });
  if ('response' in auth) return auth.response;
  const ctx = auth.context;

  return desktopJson({
    data: {
      user: {
        id: ctx.user.id, name: ctx.user.name, username: ctx.user.username,
        email: ctx.user.email, phone: ctx.user.phone, photoUrl: ctx.user.photoUrl,
        role: ctx.user.role, mustChangePassword: ctx.user.mustChangePassword, school: ctx.user.school,
      },
      session: {
        sessionId: ctx.sessionId, deviceId: ctx.deviceId,
        deviceIdentifier: ctx.deviceIdentifier, platform: ctx.platform, appVersion: ctx.appVersion,
      },
    },
  });
}
