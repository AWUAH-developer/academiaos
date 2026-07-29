import crypto from 'crypto';
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  classes,
  guardians,
  learnerGuardians,
  learners,
  mobileDevices,
  mobileSessions,
  schools,
  teacherAssignments,
  users
} from '@/db/schema';
import type { UserRole, UserStatus } from '@/lib/types';
import { canUseMobile } from '@/lib/platform-access';
import { cleanText } from '@/lib/validation';
import { MOBILE_ACCESS_PREFIX, MOBILE_REFRESH_PREFIX, parseMobileToken } from '@/lib/mobile-auth-shared';
export { mobileLoginSchema, mobileRefreshSchema, parseMobileToken } from '@/lib/mobile-auth-shared';

const ACCESS_MINUTES = boundedNumber(process.env.MOBILE_ACCESS_TOKEN_MINUTES, 15, 5, 60);
const REFRESH_DAYS = boundedNumber(process.env.MOBILE_REFRESH_TOKEN_DAYS, 30, 1, 90);
const MAX_SESSIONS = boundedNumber(process.env.MOBILE_MAX_SESSIONS_PER_USER, 10, 1, 25);

function boundedNumber(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), minimum), maximum) : fallback;
}

function hashToken(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function tokenFor(prefix: string, sessionId: string) {
  return `${prefix}.${sessionId}.${crypto.randomBytes(32).toString('base64url')}`;
}

export type MobileAuthUser = {
  id: string;
  schoolId: string | null;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  school: {
    id: string;
    name: string;
    code: string;
    logoUrl: string | null;
    currency: string;
    timezone: string;
  } | null;
};

export type MobileAuthContext = {
  user: MobileAuthUser;
  sessionId: string;
  deviceId: string;
  deviceIdentifier: string;
  platform: string;
  appVersion: string | null;
};

export function mobileJson(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

export function mobileError(status: number, code: string, message: string) {
  return mobileJson({ error: { code, message } }, status);
}

export function clientIp(request: NextRequest) {
  return cleanText(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown', 64);
}

export function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(header);
  return match?.[1] || null;
}

export async function createMobileSession(input: {
  userId: string;
  schoolId: string | null;
  deviceIdentifier: string;
  deviceName?: string | null;
  platform: 'android' | 'ios';
  appVersion?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const now = new Date();
  const sessionId = crypto.randomUUID();
  const accessToken = tokenFor(MOBILE_ACCESS_PREFIX, sessionId);
  const refreshToken = tokenFor(MOBILE_REFRESH_PREFIX, sessionId);
  const accessExpiresAt = new Date(now.getTime() + ACCESS_MINUTES * 60_000);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_DAYS * 86_400_000);

  const result = await db.transaction(async (tx) => {
    let device = (await tx.select().from(mobileDevices).where(and(
      eq(mobileDevices.userId, input.userId),
      eq(mobileDevices.deviceIdentifier, input.deviceIdentifier)
    )).limit(1))[0];

    if (device) {
      [device] = await tx.update(mobileDevices).set({
        schoolId: input.schoolId,
        deviceName: input.deviceName || device.deviceName,
        platform: input.platform,
        appVersion: input.appVersion || device.appVersion,
        revokedAt: null,
        lastSeenAt: now,
        updatedAt: now
      }).where(eq(mobileDevices.id, device.id)).returning();
    } else {
      [device] = await tx.insert(mobileDevices).values({
        userId: input.userId,
        schoolId: input.schoolId,
        deviceIdentifier: input.deviceIdentifier,
        deviceName: input.deviceName || null,
        platform: input.platform,
        appVersion: input.appVersion || null
      }).returning();
    }

    await tx.insert(mobileSessions).values({
      id: sessionId,
      userId: input.userId,
      deviceId: device.id,
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null
    });

    const active = await tx.select({ id: mobileSessions.id }).from(mobileSessions)
      .where(and(eq(mobileSessions.userId, input.userId), isNull(mobileSessions.revokedAt), gt(mobileSessions.refreshExpiresAt, now)))
      .orderBy(desc(mobileSessions.createdAt));
    const excess = active.slice(MAX_SESSIONS);
    if (excess.length) {
      await tx.update(mobileSessions).set({ revokedAt: now, updatedAt: now })
        .where(inArray(mobileSessions.id, excess.map((row) => row.id)));
    }

    return device;
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
    expiresIn: ACCESS_MINUTES * 60,
    deviceId: result.id
  };
}

async function sessionRecord(sessionId: string) {
  const rows = await db.select({
    sessionId: mobileSessions.id,
    accessTokenHash: mobileSessions.accessTokenHash,
    refreshTokenHash: mobileSessions.refreshTokenHash,
    accessExpiresAt: mobileSessions.accessExpiresAt,
    refreshExpiresAt: mobileSessions.refreshExpiresAt,
    sessionRevokedAt: mobileSessions.revokedAt,
    deviceId: mobileDevices.id,
    deviceIdentifier: mobileDevices.deviceIdentifier,
    deviceRevokedAt: mobileDevices.revokedAt,
    platform: mobileDevices.platform,
    appVersion: mobileDevices.appVersion,
    userId: users.id,
    schoolId: users.schoolId,
    name: users.name,
    username: users.username,
    email: users.email,
    phone: users.phone,
    photoUrl: users.photoUrl,
    role: users.role,
    status: users.status,
    mustChangePassword: users.mustChangePassword,
    schoolRecordId: schools.id,
    schoolName: schools.name,
    schoolCode: schools.code,
    schoolLogoUrl: schools.logoUrl,
    schoolCurrency: schools.currency,
    schoolTimezone: schools.timezone,
    schoolActive: schools.isActive
  }).from(mobileSessions)
    .innerJoin(mobileDevices, eq(mobileSessions.deviceId, mobileDevices.id))
    .innerJoin(users, eq(mobileSessions.userId, users.id))
    .leftJoin(schools, eq(users.schoolId, schools.id))
    .where(eq(mobileSessions.id, sessionId))
    .limit(1);
  return rows[0] || null;
}

function contextFromRecord(row: NonNullable<Awaited<ReturnType<typeof sessionRecord>>>) {
  return {
    user: {
      id: row.userId,
      schoolId: row.schoolId,
      name: row.name,
      username: row.username,
      email: row.email,
      phone: row.phone,
      photoUrl: row.photoUrl,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      mustChangePassword: row.mustChangePassword,
      school: row.schoolRecordId ? {
        id: row.schoolRecordId,
        name: row.schoolName!,
        code: row.schoolCode!,
        logoUrl: row.schoolLogoUrl,
        currency: row.schoolCurrency!,
        timezone: row.schoolTimezone!
      } : null
    },
    sessionId: row.sessionId,
    deviceId: row.deviceId,
    deviceIdentifier: row.deviceIdentifier,
    platform: row.platform,
    appVersion: row.appVersion
  } satisfies MobileAuthContext;
}

export async function authenticateMobileRequest(request: NextRequest, options: { allowPasswordChange?: boolean } = {}) {
  const raw = bearerToken(request);
  if (!raw) return { response: mobileError(401, 'AUTH_REQUIRED', 'A valid access token is required.') } as const;
  const parsed = parseMobileToken(raw, 'access');
  if (!parsed) return { response: mobileError(401, 'INVALID_TOKEN', 'The access token is invalid.') } as const;
  const row = await sessionRecord(parsed.sessionId);
  const now = new Date();
  if (!row || row.sessionRevokedAt || row.deviceRevokedAt || !safeEqual(row.accessTokenHash, hashToken(raw))) {
    return { response: mobileError(401, 'INVALID_TOKEN', 'The access token is invalid.') } as const;
  }
  if (row.accessExpiresAt <= now) return { response: mobileError(401, 'TOKEN_EXPIRED', 'The access token has expired.') } as const;
  if (!canUseMobile(row.role as UserRole)) {
    await db
      .update(mobileSessions)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(mobileSessions.id, row.sessionId));

    return {
      response: mobileError(
        403,
        'MOBILE_ACCESS_NOT_ALLOWED',
        'Learners do not use AcademiaOS login accounts. A linked parent or guardian accesses learner information.'
      )
    } as const;
  }

  if (row.status !== 'ACTIVE' || (row.schoolId && row.schoolActive === false)) {
    await db.update(mobileSessions).set({ revokedAt: now, updatedAt: now }).where(eq(mobileSessions.id, row.sessionId));
    return { response: mobileError(403, 'ACCOUNT_UNAVAILABLE', 'The account or school is not active.') } as const;
  }
  if (row.mustChangePassword && !options.allowPasswordChange) {
    return { response: mobileError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change the temporary password before using the app.') } as const;
  }
  await Promise.all([
    db.update(mobileSessions).set({ lastSeenAt: now, updatedAt: now }).where(eq(mobileSessions.id, row.sessionId)),
    db.update(mobileDevices).set({ lastSeenAt: now, updatedAt: now }).where(eq(mobileDevices.id, row.deviceId))
  ]);
  return { context: contextFromRecord(row) } as const;
}

export async function rotateMobileSession(refreshToken: string, request: NextRequest) {
  const parsed = parseMobileToken(refreshToken, 'refresh');
  if (!parsed) return { response: mobileError(401, 'INVALID_REFRESH_TOKEN', 'The refresh token is invalid.') } as const;
  const row = await sessionRecord(parsed.sessionId);
  const now = new Date();
  if (!row || row.sessionRevokedAt || row.deviceRevokedAt) {
    return { response: mobileError(401, 'INVALID_REFRESH_TOKEN', 'The refresh token is invalid.') } as const;
  }
  if (!safeEqual(row.refreshTokenHash, hashToken(refreshToken))) {
    await db.update(mobileSessions).set({ revokedAt: now, updatedAt: now }).where(eq(mobileSessions.id, row.sessionId));
    return { response: mobileError(401, 'REFRESH_TOKEN_REUSED', 'This session has been revoked. Sign in again.') } as const;
  }
  if (!canUseMobile(row.role as UserRole)) {
    await db
      .update(mobileSessions)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(mobileSessions.id, row.sessionId));

    return {
      response: mobileError(
        403,
        'MOBILE_ACCESS_NOT_ALLOWED',
        'This account is not permitted to use AcademiaOS Mobile.'
      )
    } as const;
  }

  if (row.refreshExpiresAt <= now || row.status !== 'ACTIVE' || (row.schoolId && row.schoolActive === false)) {
    await db.update(mobileSessions).set({ revokedAt: now, updatedAt: now }).where(eq(mobileSessions.id, row.sessionId));
    return { response: mobileError(401, 'REFRESH_TOKEN_EXPIRED', 'The session has expired. Sign in again.') } as const;
  }
  const accessToken = tokenFor(MOBILE_ACCESS_PREFIX, row.sessionId);
  const nextRefreshToken = tokenFor(MOBILE_REFRESH_PREFIX, row.sessionId);
  const accessExpiresAt = new Date(now.getTime() + ACCESS_MINUTES * 60_000);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_DAYS * 86_400_000);
  await db.transaction(async (tx) => {
    await tx.update(mobileSessions).set({
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(nextRefreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      lastSeenAt: now,
      lastRotatedAt: now,
      ipAddress: clientIp(request),
      userAgent: cleanText(request.headers.get('user-agent'), 512),
      updatedAt: now
    }).where(eq(mobileSessions.id, row.sessionId));
    await tx.update(mobileDevices).set({ lastSeenAt: now, updatedAt: now }).where(eq(mobileDevices.id, row.deviceId));
  });
  return {
    context: contextFromRecord(row),
    tokens: { accessToken, refreshToken: nextRefreshToken, accessExpiresAt, refreshExpiresAt, expiresIn: ACCESS_MINUTES * 60 }
  } as const;
}

export async function resolveMobileSchoolId(context: MobileAuthContext, request: NextRequest) {
  if (context.user.schoolId) return context.user.schoolId;
  if (context.user.role !== 'SUPER_ADMIN') return null;
  const requested = cleanText(request.headers.get('x-academiaos-school-id'), 64);
  if (!requested) return null;
  const row = (await db.select({ id: schools.id }).from(schools).where(and(eq(schools.id, requested), eq(schools.isActive, true))).limit(1))[0];
  return row?.id || null;
}

// HEADTEACHER is deliberately not a broad-learner role: like a TEACHER, their
// access is scoped to their own official class/subject assignments.
const broadLearnerRoles = new Set<UserRole>([
  'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PROPRIETOR', 'ACADEMIC_ADMIN',
  'ACCOUNTS', 'TRANSPORT', 'SECURITY', 'RECEPTIONIST', 'LIBRARIAN', 'CANTEEN'
]);

export async function accessibleLearnerIds(context: MobileAuthContext, schoolId: string) {
  const user = context.user;
  if (broadLearnerRoles.has(user.role)) return null;
  if (user.role === 'PARENT') {
    const rows = await db.select({ learnerId: learnerGuardians.learnerId }).from(learnerGuardians)
      .innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
      .innerJoin(learners, eq(learnerGuardians.learnerId, learners.id))
      .where(and(eq(guardians.userId, user.id), eq(learners.schoolId, schoolId)));
    return rows.map((row) => row.learnerId);
  }
  if (user.role === 'LEARNER') {
    const row = (await db.select({ id: learners.id }).from(learners)
      .where(and(eq(learners.userId, user.id), eq(learners.schoolId, schoolId))).limit(1))[0];
    return row ? [row.id] : [];
  }
  if (user.role === 'TEACHER' || user.role === 'HEADTEACHER') {
    const assigned = await db.select({ classId: teacherAssignments.classId }).from(teacherAssignments)
      .where(and(eq(teacherAssignments.teacherId, user.id), eq(teacherAssignments.schoolId, schoolId)));
    const ownClasses = await db.select({ classId: classes.id }).from(classes)
      .where(and(eq(classes.classTeacherId, user.id), eq(classes.schoolId, schoolId)));
    const classIds = [...new Set([...assigned, ...ownClasses].map((row) => row.classId))];
    if (!classIds.length) return [];
    const rows = await db.select({ id: learners.id }).from(learners)
      .where(and(eq(learners.schoolId, schoolId), inArray(learners.classId, classIds)));
    return rows.map((row) => row.id);
  }
  return [];
}

export async function mayAccessLearner(context: MobileAuthContext, schoolId: string, learnerId: string) {
  const permitted = await accessibleLearnerIds(context, schoolId);
  return permitted === null || permitted.includes(learnerId);
}

export function pagination(request: NextRequest, maximum = 100) {
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 50) || 50, 1), maximum);
  const offset = Math.max(Number(request.nextUrl.searchParams.get('offset') || 0) || 0, 0);
  return { limit, offset };
}

export function publicUser(context: MobileAuthContext) {
  return {
    id: context.user.id,
    name: context.user.name,
    username: context.user.username,
    email: context.user.email,
    phone: context.user.phone,
    photoUrl: context.user.photoUrl,
    role: context.user.role,
    mustChangePassword: context.user.mustChangePassword,
    school: context.user.school
  };
}

export async function mobileApiStats() {
  const [deviceCount] = await db.select({ total: sql<number>`count(*)::int` }).from(mobileDevices).where(isNull(mobileDevices.revokedAt));
  return { activeDevices: Number(deviceCount?.total || 0) };
}
