import bcrypt from 'bcryptjs';
import { and, eq, gt, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { loginAttempts, schools, users } from '@/db/schema';
import { audit } from '@/lib/auth';
import {
  clientIp,
  createMobileSession,
  mobileError,
  mobileJson,
  mobileLoginSchema
} from '@/lib/mobile-api';
import { canUseMobile } from '@/lib/platform-access';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DUMMY_PASSWORD_HASH = bcrypt.hashSync('academiaos-mobile-invalid-password', 12);
const RATE_WINDOW_MS = 15 * 60_000;
const MAX_USERNAME_FAILURES = 5;
const MAX_IP_FAILURES = 20;

async function failedAttemptCount(column: 'username' | 'ipAddress', value: string, since: Date) {
  const condition = column === 'username' ? eq(loginAttempts.username, value) : eq(loginAttempts.ipAddress, value);
  const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(loginAttempts)
    .where(and(condition, eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  return Number(row?.total || 0);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, 'INVALID_JSON', 'Send a valid JSON request body.');
  }
  const parsed = mobileLoginSchema.safeParse(body);
  if (!parsed.success) return mobileError(400, 'INVALID_LOGIN_REQUEST', 'Username, password, device identifier, and platform are required.');

  const username = cleanText(parsed.data.username, 100).toLowerCase();
  const ipAddress = clientIp(request);
  const userAgent = cleanText(request.headers.get('user-agent'), 512);
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS);
  const [usernameFailures, ipFailures] = await Promise.all([
    failedAttemptCount('username', username, windowStart),
    failedAttemptCount('ipAddress', ipAddress, windowStart)
  ]);

  if (usernameFailures >= MAX_USERNAME_FAILURES || ipFailures >= MAX_IP_FAILURES) {
    await db.insert(loginAttempts).values({ username, success: false, ipAddress, userAgent });
    return mobileError(429, 'LOGIN_RATE_LIMITED', 'Too many sign-in attempts. Try again in 15 minutes.');
  }

  const user = (await db.select().from(users).where(eq(users.username, username)).limit(1))[0];
  const school = user?.schoolId
    ? (await db.select().from(schools).where(eq(schools.id, user.schoolId)).limit(1))[0]
    : null;
  const now = new Date();
  const passwordValid = await bcrypt.compare(parsed.data.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  const locked = Boolean(user?.lockedUntil && user.lockedUntil > now);
  const temporaryPasswordExpired = Boolean(
    user && passwordValid && user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt <= now
  );
  const credentialsAccepted = Boolean(
    user && passwordValid && !locked && !temporaryPasswordExpired &&
    user.status === 'ACTIVE' && (!user.schoolId || school?.isActive)
  );

  const platformAllowed = Boolean(user && canUseMobile(user.role));
  const selectedAccountType = parsed.data.accountType;

  const accountTypeMatches = Boolean(
    !selectedAccountType ||
    (selectedAccountType === 'PARENT'
      ? user?.role === 'PARENT'
      : Boolean(
          user &&
          user.role !== 'PARENT' &&
          user.role !== 'LEARNER'
        ))
  );

  const success =
    credentialsAccepted &&
    platformAllowed &&
    accountTypeMatches;

  await db.insert(loginAttempts).values({
    schoolId: user?.schoolId,
    username,
    userId: user?.id,
    success,
    ipAddress,
    userAgent
  });

  if (!success) {
    if (user && credentialsAccepted && !platformAllowed) {
      await audit({
        schoolId: user.schoolId,
        userId: user.id,
        action: 'MOBILE_LOGIN_BLOCKED_PLATFORM_POLICY',
        entityType: 'User',
        entityId: user.id,
        newValue: { role: user.role }
      });

      return mobileError(
        403,
        'MOBILE_ACCESS_NOT_ALLOWED',
        'Learners do not use AcademiaOS login accounts. A linked parent or guardian accesses learner information.'
      );
    }

    if (
      user &&
      credentialsAccepted &&
      platformAllowed &&
      !accountTypeMatches
    ) {
      await audit({
        schoolId: user.schoolId,
        userId: user.id,
        action: 'MOBILE_LOGIN_ACCOUNT_TYPE_MISMATCH',
        entityType: 'User',
        entityId: user.id,
        newValue: {
          selectedAccountType,
          actualRole: user.role
        }
      });

      return mobileError(
        403,
        'MOBILE_ACCOUNT_TYPE_MISMATCH',
        selectedAccountType === 'PARENT'
          ? 'This is a school staff account. Select School Staff and sign in again.'
          : 'This is a parent or guardian account. Select Parent / Guardian and sign in again.'
      );
    }

    if (user) {
      const failed = user.failedLoginCount + 1;
      await db.update(users).set({
        failedLoginCount: failed >= MAX_USERNAME_FAILURES ? 0 : failed,
        lockedUntil: failed >= MAX_USERNAME_FAILURES ? new Date(Date.now() + RATE_WINDOW_MS) : user.lockedUntil,
        updatedAt: now
      }).where(eq(users.id, user.id));
      await audit({
        schoolId: user.schoolId,
        userId: user.id,
        action: temporaryPasswordExpired ? 'MOBILE_LOGIN_BLOCKED_TEMP_PASSWORD_EXPIRED' : locked ? 'MOBILE_LOGIN_BLOCKED_LOCKOUT' : 'MOBILE_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id
      });
    }
    return mobileError(401, temporaryPasswordExpired ? 'TEMPORARY_PASSWORD_EXPIRED' : 'INVALID_CREDENTIALS',
      temporaryPasswordExpired ? 'The temporary password has expired. Ask an administrator to reset it.' : 'Invalid login details or account temporarily locked.');
  }

  await db.update(users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: now, updatedAt: now }).where(eq(users.id, user.id));
  const tokens = await createMobileSession({
    userId: user.id,
    schoolId: user.schoolId,
    deviceIdentifier: parsed.data.deviceIdentifier,
    deviceName: parsed.data.deviceName,
    platform: parsed.data.platform,
    appVersion: parsed.data.appVersion,
    ipAddress,
    userAgent
  });
  await audit({ schoolId: user.schoolId, userId: user.id, action: 'MOBILE_LOGIN_SUCCESS', entityType: 'MobileSession' });

  return mobileJson({
    data: {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        photoUrl: user.photoUrl,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        school: school ? {
          id: school.id,
          name: school.name,
          code: school.code,
          logoUrl: school.logoUrl,
          currency: school.currency,
          timezone: school.timezone
        } : null
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        accessExpiresAt: tokens.accessExpiresAt.toISOString(),
        refreshExpiresAt: tokens.refreshExpiresAt.toISOString()
      }
    }
  });
}
