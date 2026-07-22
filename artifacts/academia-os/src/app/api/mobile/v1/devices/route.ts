import { and, desc, eq, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { mobileDevices, mobileSessions } from '@/db/schema';
import { audit } from '@/lib/auth';
import { authenticateMobileRequest, mobileError, mobileJson } from '@/lib/mobile-api';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  deviceName: z.string().trim().max(120).optional(),
  appVersion: z.string().trim().max(40).optional(),
  pushToken: z.string().trim().min(10).max(512).nullable().optional(),
  notificationsEnabled: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request, { allowPasswordChange: true });
  if ('response' in auth) return auth.response;
  const rows = await db.select({
    id: mobileDevices.id,
    deviceIdentifier: mobileDevices.deviceIdentifier,
    deviceName: mobileDevices.deviceName,
    platform: mobileDevices.platform,
    appVersion: mobileDevices.appVersion,
    notificationsEnabled: mobileDevices.notificationsEnabled,
    lastSeenAt: mobileDevices.lastSeenAt,
    createdAt: mobileDevices.createdAt
  }).from(mobileDevices).where(and(eq(mobileDevices.userId, auth.context.user.id), isNull(mobileDevices.revokedAt)))
    .orderBy(desc(mobileDevices.lastSeenAt));
  return mobileJson({ data: { devices: rows, currentDeviceId: auth.context.deviceId } });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileRequest(request, { allowPasswordChange: true });
  if ('response' in auth) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return mobileError(400, 'INVALID_JSON', 'Send a valid JSON request body.'); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return mobileError(400, 'INVALID_DEVICE', 'The device information is invalid.');
  const [device] = await db.update(mobileDevices).set({
    deviceName: parsed.data.deviceName ? cleanText(parsed.data.deviceName, 120) : undefined,
    appVersion: parsed.data.appVersion ? cleanText(parsed.data.appVersion, 40) : undefined,
    pushToken: parsed.data.pushToken === null ? null : parsed.data.pushToken ? cleanText(parsed.data.pushToken, 512) : undefined,
    notificationsEnabled: parsed.data.notificationsEnabled,
    lastSeenAt: new Date(),
    updatedAt: new Date()
  }).where(and(eq(mobileDevices.id, auth.context.deviceId), eq(mobileDevices.userId, auth.context.user.id))).returning();
  if (!device) return mobileError(404, 'DEVICE_NOT_FOUND', 'The device was not found.');
  await audit({ schoolId: auth.context.user.schoolId, userId: auth.context.user.id, action: 'MOBILE_DEVICE_UPDATED', entityType: 'MobileDevice', entityId: device.id });
  return mobileJson({ data: { device: {
    id: device.id,
    deviceIdentifier: device.deviceIdentifier,
    deviceName: device.deviceName,
    platform: device.platform,
    appVersion: device.appVersion,
    notificationsEnabled: device.notificationsEnabled,
    lastSeenAt: device.lastSeenAt
  } } });
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateMobileRequest(request, { allowPasswordChange: true });
  if ('response' in auth) return auth.response;
  const requestedId = cleanText(request.nextUrl.searchParams.get('deviceId'), 64) || auth.context.deviceId;
  const device = (await db.select({ id: mobileDevices.id }).from(mobileDevices)
    .where(and(eq(mobileDevices.id, requestedId), eq(mobileDevices.userId, auth.context.user.id), isNull(mobileDevices.revokedAt))).limit(1))[0];
  if (!device) return mobileError(404, 'DEVICE_NOT_FOUND', 'The device was not found.');
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(mobileDevices).set({ revokedAt: now, pushToken: null, updatedAt: now }).where(eq(mobileDevices.id, device.id));
    await tx.update(mobileSessions).set({ revokedAt: now, updatedAt: now }).where(eq(mobileSessions.deviceId, device.id));
  });
  await audit({ schoolId: auth.context.user.schoolId, userId: auth.context.user.id, action: 'MOBILE_DEVICE_REVOKED', entityType: 'MobileDevice', entityId: device.id });
  return mobileJson({ data: { revoked: true, deviceId: device.id } });
}
