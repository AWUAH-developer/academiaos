import bcrypt from 'bcryptjs';
import { and, eq, gt, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { loginAttempts, schools, users } from '@/db/schema';
import { audit } from '@/lib/auth';
import {
  clientIp, createDesktopSession, desktopError, desktopJson, desktopLoginSchema,
} from '@/lib/desktop-api';
import { canUseDesktop } from '@/lib/platform-access';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DUMMY_HASH      = bcrypt.hashSync('academiaos-desktop-invalid-pw', 12);
const RATE_WINDOW_MS  = 15 * 60_000;
const MAX_USER_FAIL   = 5;
const MAX_IP_FAIL     = 20;

async function failCount(col: 'username' | 'ipAddress', value: string, since: Date) {
  const cond = col === 'username' ? eq(loginAttempts.username, value) : eq(loginAttempts.ipAddress, value);
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(loginAttempts)
    .where(and(cond, eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  return Number(row?.n || 0);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return desktopError(400, 'INVALID_JSON', 'Send a valid JSON body.');
  }
  const parsed = desktopLoginSchema.safeParse(body);
  if (!parsed.success) {
    return desktopError(400, 'INVALID_LOGIN_REQUEST', 'username, password, deviceIdentifier and platform are required.');
  }

  const username  = cleanText(parsed.data.username, 100)!.toLowerCase();
  const ip        = clientIp(request);
  const ua        = cleanText(request.headers.get('user-agent'), 512);
  const since     = new Date(Date.now() - RATE_WINDOW_MS);
  const [uf, ipf] = await Promise.all([failCount('username', username, since), failCount('ipAddress', ip, since)]);

  if (uf >= MAX_USER_FAIL || ipf >= MAX_IP_FAIL) {
    await db.insert(loginAttempts).values({ username, success: false, ipAddress: ip, userAgent: ua });
    return desktopError(429, 'LOGIN_RATE_LIMITED', 'Too many sign-in attempts. Try again in 15 minutes.');
  }

  const user   = (await db.select().from(users).where(eq(users.username, username)).limit(1))[0];
  const school = user?.schoolId
    ? (await db.select().from(schools).where(eq(schools.id, user.schoolId)).limit(1))[0]
    : null;

  const now                   = new Date();
  const passwordValid         = await bcrypt.compare(parsed.data.password, user?.passwordHash || DUMMY_HASH);
  const locked                = Boolean(user?.lockedUntil && user.lockedUntil > now);
  const tempExpired           = Boolean(user && passwordValid && user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt <= now);
  const schoolOk              = !user?.schoolId || school?.isActive;
  const credentialsAccepted   = Boolean(
    user && passwordValid && !locked && !tempExpired &&
    user.status === 'ACTIVE' && schoolOk
  );
  const platformAllowed        = Boolean(user && canUseDesktop(user.role));
  const success                = credentialsAccepted && platformAllowed;

  // Non-SUPER_ADMIN must belong to a school
  const noSchool = success && user.role !== 'SUPER_ADMIN' && !user.schoolId;

  // New and reset accounts must complete their one permitted password
  // change before using the Windows or Mac desktop application.
  const passwordChangeRequired = Boolean(
    success && !noSchool && user.mustChangePassword
  );

  await db.insert(loginAttempts).values({
    schoolId: user?.schoolId,
    username,
    userId: user?.id,
    success: success && !noSchool && !passwordChangeRequired,
    ipAddress: ip,
    userAgent: ua
  });

  if (!success) {
    if (user && credentialsAccepted && !platformAllowed) {
      await audit({
        schoolId: user.schoolId,
        userId: user.id,
        action: 'DESKTOP_LOGIN_BLOCKED_PLATFORM_POLICY',
        entityType: 'User',
        entityId: user.id,
        newValue: { role: user.role }
      });

      if (user.role === 'LEARNER') {
        return desktopError(
          403,
          'DESKTOP_ACCESS_NOT_ALLOWED',
          'Learners do not use AcademiaOS login accounts.'
        );
      }

      return desktopError(
        403,
        'DESKTOP_ACCESS_NOT_ALLOWED',
        'This account uses AcademiaOS Mobile. Desktop access is limited to Super Admin, School Administrator, Proprietor and Academic Administrator.'
      );
    }

    if (user) {
      const failed = user.failedLoginCount + 1;
      await db.update(users).set({
        failedLoginCount: failed >= MAX_USER_FAIL ? 0 : failed,
        lockedUntil: failed >= MAX_USER_FAIL ? new Date(Date.now() + RATE_WINDOW_MS) : user.lockedUntil,
        updatedAt: now,
      }).where(eq(users.id, user.id));
      await audit({ schoolId: user.schoolId, userId: user.id, action: 'DESKTOP_LOGIN_FAILED', entityType: 'User', entityId: user.id });
    }
    return desktopError(401, tempExpired ? 'TEMPORARY_PASSWORD_EXPIRED' : 'INVALID_CREDENTIALS',
      tempExpired ? 'Temporary password expired. Ask an administrator to reset it.' : 'Invalid credentials or account locked.');
  }

  if (noSchool) {
    return desktopError(
      403,
      'NO_SCHOOL_MEMBERSHIP',
      'This account has no active school membership.'
    );
  }

  if (passwordChangeRequired) {
    await audit({
      schoolId: user.schoolId,
      userId: user.id,
      action: 'DESKTOP_LOGIN_BLOCKED_PASSWORD_CHANGE_REQUIRED',
      entityType: 'User',
      entityId: user.id
    });

    return desktopError(
      403,
      'PASSWORD_CHANGE_REQUIRED',
      'Complete your first password setup at academiaos.cc using the system-generated temporary password. Then sign in to the desktop app with your new private password.'
    );
  }

  await db.update(users).set({
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: now,
    updatedAt: now
  }).where(eq(users.id, user.id));

  const tokens = await createDesktopSession({
    userId: user.id, schoolId: user.schoolId,
    deviceIdentifier: parsed.data.deviceIdentifier,
    deviceName: parsed.data.deviceName,
    platform: parsed.data.platform,
    appVersion: parsed.data.appVersion,
    ipAddress: ip, userAgent: ua,
  });

  await audit({ schoolId: user.schoolId, userId: user.id, action: 'DESKTOP_LOGIN_SUCCESS', entityType: 'DesktopSession' });

  return desktopJson({
    data: {
      user: {
        id: user.id, name: user.name, username: user.username,
        email: user.email, phone: user.phone, photoUrl: user.photoUrl,
        role: user.role, mustChangePassword: user.mustChangePassword,
        school: school ? { id: school.id, name: school.name, code: school.code, logoUrl: school.logoUrl, currency: school.currency, timezone: school.timezone } : null,
      },
      tokens: {
        accessToken: tokens.accessToken, refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        accessExpiresAt:  tokens.accessExpiresAt.toISOString(),
        refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
      },
      deviceId: tokens.deviceId,
    },
  });
}
