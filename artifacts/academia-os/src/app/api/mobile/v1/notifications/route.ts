import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { authenticateMobileRequest, mobileError, mobileJson, pagination } from '@/lib/mobile-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const markSchema = z.object({
  notificationIds: z.array(z.string().uuid()).max(100).optional(),
  markAll: z.boolean().optional()
}).refine((value) => value.markAll || (value.notificationIds && value.notificationIds.length > 0));

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  const { limit, offset } = pagination(request, 100);
  const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';
  const conditions = [eq(notifications.userId, auth.context.user.id)];
  if (unreadOnly) conditions.push(isNull(notifications.readAt));
  const rows = await db.select().from(notifications).where(and(...conditions))
    .orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
  return mobileJson({ data: { notifications: rows, pagination: { limit, offset } } });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ('response' in auth) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return mobileError(400, 'INVALID_JSON', 'Send a valid JSON request body.'); }
  const parsed = markSchema.safeParse(body);
  if (!parsed.success) return mobileError(400, 'INVALID_NOTIFICATION_UPDATE', 'Choose notifications to mark as read.');
  const now = new Date();
  const condition = parsed.data.markAll
    ? and(eq(notifications.userId, auth.context.user.id), isNull(notifications.readAt))
    : and(eq(notifications.userId, auth.context.user.id), inArray(notifications.id, parsed.data.notificationIds!));
  const updated = await db.update(notifications).set({ readAt: now }).where(condition).returning({ id: notifications.id });
  return mobileJson({ data: { updated: updated.map((row) => row.id), readAt: now.toISOString() } });
}
