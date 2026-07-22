import { NextRequest } from 'next/server';
import { mobileError, mobileJson, mobileRefreshSchema, publicUser, rotateMobileSession } from '@/lib/mobile-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return mobileError(400, 'INVALID_JSON', 'Send a valid JSON request body.'); }
  const parsed = mobileRefreshSchema.safeParse(body);
  if (!parsed.success) return mobileError(400, 'INVALID_REFRESH_REQUEST', 'A refresh token is required.');
  const result = await rotateMobileSession(parsed.data.refreshToken, request);
  if ('response' in result) return result.response;
  return mobileJson({
    data: {
      user: publicUser(result.context),
      tokens: {
        ...result.tokens,
        accessExpiresAt: result.tokens.accessExpiresAt.toISOString(),
        refreshExpiresAt: result.tokens.refreshExpiresAt.toISOString()
      }
    }
  });
}
