import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, loginAttempts } from '@/db/schema';

// One-time emergency unlock route — protected by SESSION_SECRET bearer token.
// Remove this file after use.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.SESSION_SECRET ?? '';

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = (await req.json().catch(() => ({}))).username ?? 'superadmin';

  const [updated] = await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null, status: 'ACTIVE' })
    .where(eq(users.username, username))
    .returning({ id: users.id, username: users.username, status: users.status });

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Clear recent login attempt records for the username so the rate limiter resets too.
  await db.delete(loginAttempts).where(eq(loginAttempts.username, username));

  return NextResponse.json({ ok: true, user: updated });
}
