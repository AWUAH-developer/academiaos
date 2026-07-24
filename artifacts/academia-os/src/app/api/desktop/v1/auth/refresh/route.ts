import { NextRequest } from 'next/server';
import { desktopError, desktopJson, desktopRefreshSchema, rotateDesktopSession } from '@/lib/desktop-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return desktopError(400, 'INVALID_JSON', 'Send a valid JSON body.');
  }
  const parsed = desktopRefreshSchema.safeParse(body);
  if (!parsed.success) return desktopError(400, 'INVALID_REFRESH_REQUEST', 'refreshToken is required.');

  const result = await rotateDesktopSession(parsed.data.refreshToken, request);
  if ('response' in result) return result.response;

  return desktopJson({
    data: {
      tokens: {
        accessToken:      result.tokens.accessToken,
        refreshToken:     result.tokens.refreshToken,
        expiresIn:        result.tokens.expiresIn,
        accessExpiresAt:  result.tokens.accessExpiresAt.toISOString(),
        refreshExpiresAt: result.tokens.refreshExpiresAt.toISOString(),
      },
    },
  });
}
