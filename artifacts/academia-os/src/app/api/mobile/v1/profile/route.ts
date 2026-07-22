import { NextRequest } from 'next/server';
import { authenticateMobileRequest, mobileJson, publicUser } from '@/lib/mobile-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request, { allowPasswordChange: true });
  if ('response' in auth) return auth.response;
  return mobileJson({ data: { user: publicUser(auth.context) } });
}
