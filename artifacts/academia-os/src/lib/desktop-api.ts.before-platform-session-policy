/**
 * AcademiaOS Desktop API — server-side auth helpers
 *
 * Reuses mobileDevices + mobileSessions tables.
 * Desktop tokens use the ados_access / ados_refresh prefix so they cannot
 * be presented to /api/mobile/v1 endpoints and vice versa.
 */
import crypto from 'crypto';
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  classes,
  guardians,
  learnerGuardians,
  learners,
  mobileDevices,
  mobileSessions,
  packages,
  schoolSubscriptions,
  schools,
  teacherAssignments,
  users,
} from '@/db/schema';
import type { UserRole, UserStatus } from '@/lib/types';
import { cleanText } from '@/lib/validation';

// ── Token prefix ─────────────────────────────────────────────────────────────
export const DESKTOP_ACCESS_PREFIX  = 'ados_access';
export const DESKTOP_REFRESH_PREFIX = 'ados_refresh';

// ── Token config ─────────────────────────────────────────────────────────────
const ACCESS_MINUTES = bounded(process.env.DESKTOP_ACCESS_TOKEN_MINUTES,  15, 5, 120);
const REFRESH_DAYS   = bounded(process.env.DESKTOP_REFRESH_TOKEN_DAYS,    30, 1, 90);
const MAX_SESSIONS   = bounded(process.env.DESKTOP_MAX_SESSIONS_PER_USER, 5,  1, 20);

function bounded(v: string | undefined, fallback: number, min: number, max: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), min), max) : fallback;
}

// ── Input schemas ─────────────────────────────────────────────────────────────
export const desktopLoginSchema = z.object({
  username:         z.string().trim().min(2).max(100),
  password:         z.string().min(6).max(200),
  deviceIdentifier: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  deviceName:       z.string().trim().max(120).optional(),
  platform:         z.enum(['windows', 'mac', 'linux']),
  appVersion:       z.string().trim().max(40).optional(),
});

export const desktopRefreshSchema = z.object({
  refreshToken: z.string().min(60).max(300),
});

// ── Token helpers ─────────────────────────────────────────────────────────────
function hashToken(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function tokenFor(prefix: string, sessionId: string) {
  return `${prefix}.${sessionId}.${crypto.randomBytes(32).toString('base64url')}`;
}

export function parseDesktopToken(raw: string, kind: 'access' | 'refresh') {
  const [prefix, sessionId, secret, extra] = raw.split('.');
  const expected = kind === 'access' ? DESKTOP_ACCESS_PREFIX : DESKTOP_REFRESH_PREFIX;
  if (extra || prefix !== expected || !/^[0-9a-f-]{36}$/i.test(sessionId || '') || !/^[A-Za-z0-9_-]{40,64}$/.test(secret || '')) return null;
  return { sessionId, raw };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
export function desktopJson(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export function desktopError(status: number, code: string, message: string) {
  return desktopJson({ error: { code, message } }, status);
}

export function clientIp(request: NextRequest) {
  return cleanText(
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown',
    64,
  );
}

export function bearerToken(request: NextRequest) {
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer\s+([^\s]+)$/i.exec(h);
  return m?.[1] || null;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type DesktopAuthUser = {
  id: string; schoolId: string | null; name: string; username: string;
  email: string | null; phone: string | null; photoUrl: string | null;
  role: UserRole; status: UserStatus; mustChangePassword: boolean;
  school: { id: string; name: string; code: string; logoUrl: string | null; currency: string; timezone: string } | null;
};

export type DesktopAuthContext = {
  user: DesktopAuthUser; sessionId: string; deviceId: string;
  deviceIdentifier: string; platform: string; appVersion: string | null;
};

// ── Session creation ──────────────────────────────────────────────────────────
export async function createDesktopSession(input: {
  userId: string; schoolId: string | null; deviceIdentifier: string;
  deviceName?: string | null; platform: 'windows' | 'mac' | 'linux';
  appVersion?: string | null; ipAddress?: string | null; userAgent?: string | null;
}) {
  const now        = new Date();
  const sessionId  = crypto.randomUUID();
  const accessToken   = tokenFor(DESKTOP_ACCESS_PREFIX,  sessionId);
  const refreshToken  = tokenFor(DESKTOP_REFRESH_PREFIX, sessionId);
  const accessExpiresAt  = new Date(now.getTime() + ACCESS_MINUTES * 60_000);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_DAYS   * 86_400_000);

  const device = await db.transaction(async (tx) => {
    let dev = (await tx.select().from(mobileDevices).where(and(
      eq(mobileDevices.userId, input.userId),
      eq(mobileDevices.deviceIdentifier, input.deviceIdentifier),
    )).limit(1))[0];

    if (dev) {
      [dev] = await tx.update(mobileDevices).set({
        schoolId: input.schoolId, deviceName: input.deviceName || dev.deviceName,
        platform: input.platform, appVersion: input.appVersion || dev.appVersion,
        revokedAt: null, lastSeenAt: now, updatedAt: now,
      }).where(eq(mobileDevices.id, dev.id)).returning();
    } else {
      [dev] = await tx.insert(mobileDevices).values({
        userId: input.userId, schoolId: input.schoolId,
        deviceIdentifier: input.deviceIdentifier, deviceName: input.deviceName || null,
        platform: input.platform, appVersion: input.appVersion || null,
      }).returning();
    }

    await tx.insert(mobileSessions).values({
      id: sessionId, userId: input.userId, deviceId: dev.id,
      accessTokenHash: hashToken(accessToken), refreshTokenHash: hashToken(refreshToken),
      accessExpiresAt, refreshExpiresAt,
      ipAddress: input.ipAddress || null, userAgent: input.userAgent || null,
    });

    // Prune oldest desktop sessions for this user beyond MAX_SESSIONS
    const active = await tx.select({ id: mobileSessions.id }).from(mobileSessions)
      .where(and(
        eq(mobileSessions.userId, input.userId),
        isNull(mobileSessions.revokedAt),
        gt(mobileSessions.refreshExpiresAt, now),
        // only count desktop platforms
        sql`${mobileDevices.platform} IN ('windows','mac','linux')`,
      ))
      .innerJoin(mobileDevices, eq(mobileSessions.deviceId, mobileDevices.id))
      .orderBy(desc(mobileSessions.createdAt));

    const excess = active.slice(MAX_SESSIONS);
    if (excess.length) {
      await tx.update(mobileSessions).set({ revokedAt: now, updatedAt: now })
        .where(inArray(mobileSessions.id, excess.map((r) => r.id)));
    }

    return dev;
  });

  return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, expiresIn: ACCESS_MINUTES * 60, deviceId: device.id };
}

// ── Session lookup ────────────────────────────────────────────────────────────
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
    userId: users.id, schoolId: users.schoolId,
    name: users.name, username: users.username,
    email: users.email, phone: users.phone, photoUrl: users.photoUrl,
    role: users.role, status: users.status, mustChangePassword: users.mustChangePassword,
    schoolRecordId: schools.id, schoolName: schools.name,
    schoolCode: schools.code, schoolLogoUrl: schools.logoUrl,
    schoolCurrency: schools.currency, schoolTimezone: schools.timezone,
    schoolActive: schools.isActive,
  }).from(mobileSessions)
    .innerJoin(mobileDevices, eq(mobileSessions.deviceId, mobileDevices.id))
    .innerJoin(users, eq(mobileSessions.userId, users.id))
    .leftJoin(schools, eq(users.schoolId, schools.id))
    .where(eq(mobileSessions.id, sessionId))
    .limit(1);
  return rows[0] || null;
}

function contextFromRecord(row: NonNullable<Awaited<ReturnType<typeof sessionRecord>>>): DesktopAuthContext {
  return {
    user: {
      id: row.userId, schoolId: row.schoolId, name: row.name,
      username: row.username, email: row.email, phone: row.phone,
      photoUrl: row.photoUrl, role: row.role as UserRole, status: row.status as UserStatus,
      mustChangePassword: row.mustChangePassword,
      school: row.schoolRecordId ? {
        id: row.schoolRecordId, name: row.schoolName!, code: row.schoolCode!,
        logoUrl: row.schoolLogoUrl, currency: row.schoolCurrency!, timezone: row.schoolTimezone!,
      } : null,
    },
    sessionId: row.sessionId, deviceId: row.deviceId,
    deviceIdentifier: row.deviceIdentifier, platform: row.platform, appVersion: row.appVersion,
  };
}

// ── Request authentication ────────────────────────────────────────────────────
export async function authenticateDesktopRequest(
  request: NextRequest,
  options: { allowPasswordChange?: boolean } = {},
) {
  const raw = bearerToken(request);
  if (!raw) return { response: desktopError(401, 'AUTH_REQUIRED', 'A valid access token is required.') } as const;
  const parsed = parseDesktopToken(raw, 'access');
  if (!parsed) return { response: desktopError(401, 'INVALID_TOKEN', 'The access token is invalid.') } as const;

  const row = await sessionRecord(parsed.sessionId);
  const now = new Date();

  if (!row || row.sessionRevokedAt || row.deviceRevokedAt || !safeEqual(row.accessTokenHash, hashToken(raw))) {
    return { response: desktopError(401, 'INVALID_TOKEN', 'The access token is invalid.') } as const;
  }
  if (row.accessExpiresAt <= now) {
    return { response: desktopError(401, 'TOKEN_EXPIRED', 'The access token has expired.') } as const;
  }
  if (row.status !== 'ACTIVE' || (row.schoolId && row.schoolActive === false)) {
    await db.update(mobileSessions).set({ revokedAt: now, updatedAt: now }).where(eq(mobileSessions.id, row.sessionId));
    return { response: desktopError(403, 'ACCOUNT_UNAVAILABLE', 'The account or school is not active.') } as const;
  }
  // Non-SUPER_ADMIN must have an active school
  if (row.role !== 'SUPER_ADMIN' && !row.schoolId) {
    return { response: desktopError(403, 'NO_SCHOOL_MEMBERSHIP', 'No active school membership found.') } as const;
  }
  if (row.mustChangePassword && !options.allowPasswordChange) {
    return { response: desktopError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change the temporary password before using the app.') } as const;
  }

  await Promise.all([
    db.update(mobileSessions).set({ lastSeenAt: now, updatedAt: now }).where(eq(mobileSessions.id, row.sessionId)),
    db.update(mobileDevices).set({ lastSeenAt: now, updatedAt: now }).where(eq(mobileDevices.id, row.deviceId)),
  ]);
  return { context: contextFromRecord(row) } as const;
}

// ── Token rotation ────────────────────────────────────────────────────────────
export async function rotateDesktopSession(refreshToken: string, request: NextRequest) {
  const parsed = parseDesktopToken(refreshToken, 'refresh');
  if (!parsed) return { response: desktopError(401, 'INVALID_REFRESH_TOKEN', 'The refresh token is invalid.') } as const;

  const row = await sessionRecord(parsed.sessionId);
  const now = new Date();

  if (!row || row.sessionRevokedAt || row.deviceRevokedAt) {
    return { response: desktopError(401, 'INVALID_REFRESH_TOKEN', 'The refresh token is invalid.') } as const;
  }
  if (!safeEqual(row.refreshTokenHash, hashToken(refreshToken))) {
    await db.update(mobileSessions).set({ revokedAt: now, updatedAt: now }).where(eq(mobileSessions.id, row.sessionId));
    return { response: desktopError(401, 'REFRESH_TOKEN_REUSED', 'This session has been revoked. Sign in again.') } as const;
  }
  if (row.refreshExpiresAt <= now || row.status !== 'ACTIVE' || (row.schoolId && row.schoolActive === false)) {
    await db.update(mobileSessions).set({ revokedAt: now, updatedAt: now }).where(eq(mobileSessions.id, row.sessionId));
    return { response: desktopError(401, 'REFRESH_TOKEN_EXPIRED', 'The session has expired. Sign in again.') } as const;
  }

  const accessToken      = tokenFor(DESKTOP_ACCESS_PREFIX,  row.sessionId);
  const nextRefreshToken = tokenFor(DESKTOP_REFRESH_PREFIX, row.sessionId);
  const accessExpiresAt  = new Date(now.getTime() + ACCESS_MINUTES * 60_000);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_DAYS   * 86_400_000);

  await db.transaction(async (tx) => {
    await tx.update(mobileSessions).set({
      accessTokenHash: hashToken(accessToken), refreshTokenHash: hashToken(nextRefreshToken),
      accessExpiresAt, refreshExpiresAt, lastSeenAt: now, lastRotatedAt: now,
      ipAddress: clientIp(request),
      userAgent: cleanText(request.headers.get('user-agent'), 512),
      updatedAt: now,
    }).where(eq(mobileSessions.id, row.sessionId));
    await tx.update(mobileDevices).set({ lastSeenAt: now, updatedAt: now }).where(eq(mobileDevices.id, row.deviceId));
  });

  return {
    context: contextFromRecord(row),
    tokens: { accessToken, refreshToken: nextRefreshToken, accessExpiresAt, refreshExpiresAt, expiresIn: ACCESS_MINUTES * 60 },
  } as const;
}

// ── School entitlements ───────────────────────────────────────────────────────
export async function resolveDesktopSchoolId(ctx: DesktopAuthContext, request: NextRequest): Promise<string | null> {
  if (ctx.user.schoolId) return ctx.user.schoolId;
  if (ctx.user.role !== 'SUPER_ADMIN') return null;
  const requested = cleanText(request.headers.get('x-academiaos-school-id'), 64);
  if (!requested) return null;
  const row = (await db.select({ id: schools.id }).from(schools)
    .where(and(eq(schools.id, requested), eq(schools.isActive, true))).limit(1))[0];
  return row?.id || null;
}

export async function desktopEntitlements(ctx: DesktopAuthContext, schoolId: string) {
  const [sub] = await db.select({
    status: schoolSubscriptions.status, term: schoolSubscriptions.term,
    academicYear: schoolSubscriptions.academicYear, endDate: schoolSubscriptions.endDate,
    packageName: packages.name, packageFeatures: packages.features,
    pricePerLearner: packages.pricePerLearner, learnerCount: schoolSubscriptions.learnerCount,
  }).from(schoolSubscriptions)
    .innerJoin(packages, eq(schoolSubscriptions.packageId, packages.id))
    .where(and(eq(schoolSubscriptions.schoolId, schoolId), eq(schoolSubscriptions.status, 'ACTIVE')))
    .orderBy(desc(schoolSubscriptions.createdAt))
    .limit(1);

  const tier = (sub?.packageName || '').toLowerCase();
  const isStarter  = tier === 'starter';
  const isStandard = tier === 'standard';
  const isPremium  = tier === 'premium';

  const features = {
    attendance:    true,
    learners:      true,
    staff:         true,
    dailyFees:     !isStarter,
    academics:     !isStarter,
    finance:       !isStarter,
    reports:       true,
    transport:     isPremium,
    smartId:       isPremium,
    security:      isPremium,
    messages:      !isStarter,
    notifications: true,
    sync:          true,
    settings:      true,
  };

  return {
    subscription: sub ? {
      status: sub.status, term: sub.term, academicYear: sub.academicYear,
      expiresAt: sub.endDate?.toISOString(),
      packageName: sub.packageName,
    } : null,
    features,
    role: ctx.user.role,
    school: ctx.user.school,
  };
}

// ── Accessible learners for desktop ──────────────────────────────────────────
const BROAD_ROLES = new Set<UserRole>([
  'SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR','HEADTEACHER','ACADEMIC_ADMIN',
  'ACCOUNTS','TRANSPORT','SECURITY','RECEPTIONIST','LIBRARIAN','CANTEEN',
]);

export async function desktopAccessibleLearnerIds(ctx: DesktopAuthContext, schoolId: string) {
  if (BROAD_ROLES.has(ctx.user.role)) return null; // null = all
  if (ctx.user.role === 'PARENT') {
    const rows = await db.select({ id: learnerGuardians.learnerId })
      .from(learnerGuardians)
      .innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
      .innerJoin(learners, eq(learnerGuardians.learnerId, learners.id))
      .where(and(eq(guardians.userId, ctx.user.id), eq(learners.schoolId, schoolId)));
    return rows.map((r) => r.id);
  }
  if (ctx.user.role === 'LEARNER') {
    const row = (await db.select({ id: learners.id }).from(learners)
      .where(and(eq(learners.userId, ctx.user.id), eq(learners.schoolId, schoolId))).limit(1))[0];
    return row ? [row.id] : [];
  }
  if (ctx.user.role === 'TEACHER') {
    const assigned = await db.select({ classId: teacherAssignments.classId }).from(teacherAssignments)
      .where(and(eq(teacherAssignments.teacherId, ctx.user.id), eq(teacherAssignments.schoolId, schoolId)));
    const own = await db.select({ classId: classes.id }).from(classes)
      .where(and(eq(classes.classTeacherId, ctx.user.id), eq(classes.schoolId, schoolId)));
    const classIds = [...new Set([...assigned, ...own].map((r) => r.classId))];
    if (!classIds.length) return [];
    const rows = await db.select({ id: learners.id }).from(learners)
      .where(and(eq(learners.schoolId, schoolId), inArray(learners.classId, classIds)));
    return rows.map((r) => r.id);
  }
  return [];
}
