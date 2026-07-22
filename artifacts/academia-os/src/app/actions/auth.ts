'use server';

import bcrypt from 'bcryptjs';
import { and, eq, gt, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db';
import { loginAttempts, mobileSessions, schools, sessions, users } from '@/db/schema';
import { audit, createSession, destroySession, requireUser } from '@/lib/auth';
import { cleanText } from '@/lib/validation';

const loginSchema = z.object({
  username: z.string().min(2).max(100),
  password: z.string().min(6).max(200)
});

const DUMMY_PASSWORD_HASH = bcrypt.hashSync('academiaos-invalid-password', 12);
const RATE_WINDOW_MS = 15 * 60_000;
const MAX_USERNAME_FAILURES = 5;
const MAX_IP_FAILURES = 20;

function clientIp(headerStore: Awaited<ReturnType<typeof headers>>) {
  return cleanText(headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown', 64);
}

async function failedAttemptCount(column: 'username' | 'ipAddress', value: string, since: Date) {
  const condition = column === 'username'
    ? eq(loginAttempts.username, value)
    : eq(loginAttempts.ipAddress, value);
  const [row] = await db.select({ total: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(condition, eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  return Number(row?.total || 0);
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password')
  });
  if (!parsed.success) redirect('/?error=Enter+a+valid+username+and+password');

  const username = cleanText(parsed.data.username, 100).toLowerCase();
  const headerStore = await headers();
  const ipAddress = clientIp(headerStore);
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS);
  const [usernameFailures, ipFailures] = await Promise.all([
    failedAttemptCount('username', username, windowStart),
    failedAttemptCount('ipAddress', ipAddress, windowStart)
  ]);

  if (usernameFailures >= MAX_USERNAME_FAILURES || ipFailures >= MAX_IP_FAILURES) {
    await db.insert(loginAttempts).values({
      username,
      success: false,
      ipAddress,
      userAgent: cleanText(headerStore.get('user-agent'), 512)
    });
    redirect('/?error=Too+many+login+attempts.+Try+again+in+15+minutes');
  }

  const user = (await db.select().from(users).where(eq(users.username, username)).limit(1))[0];
  const now = new Date();
  const locked = Boolean(user?.lockedUntil && user.lockedUntil > now);
  const schoolActive = !user?.schoolId || Boolean((await db.select({ id: schools.id })
    .from(schools)
    .where(and(eq(schools.id, user.schoolId), eq(schools.isActive, true)))
    .limit(1))[0]);

  const passwordValid = await bcrypt.compare(parsed.data.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  const temporaryPasswordExpired = Boolean(
    user && passwordValid && user.mustChangePassword &&
    user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt <= now
  );
  const success = Boolean(
    user && passwordValid && !locked && !temporaryPasswordExpired &&
    user.status === 'ACTIVE' && schoolActive
  );

  await db.insert(loginAttempts).values({
    schoolId: user?.schoolId,
    username,
    userId: user?.id,
    success,
    ipAddress,
    userAgent: cleanText(headerStore.get('user-agent'), 512)
  });

  if (!success) {
    if (user) {
      const failed = user.failedLoginCount + 1;
      await db.update(users).set({
        failedLoginCount: failed >= MAX_USERNAME_FAILURES ? 0 : failed,
        lockedUntil: failed >= MAX_USERNAME_FAILURES ? new Date(Date.now() + RATE_WINDOW_MS) : user.lockedUntil,
        updatedAt: new Date()
      }).where(eq(users.id, user.id));
      await audit({
        schoolId: user.schoolId,
        userId: user.id,
        action: temporaryPasswordExpired ? 'LOGIN_BLOCKED_TEMP_PASSWORD_EXPIRED' : locked ? 'LOGIN_BLOCKED_LOCKOUT' : 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id
      });
    }
    if (temporaryPasswordExpired) {
      redirect('/?error=Temporary+password+expired.+Ask+an+administrator+to+reset+it');
    }
    redirect('/?error=Invalid+login+details+or+account+temporarily+locked');
  }

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.update(users).set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    }).where(eq(users.id, user.id));
  });
  await createSession(user.id);
  await audit({ schoolId: user.schoolId, userId: user.id, action: 'LOGIN_SUCCESS', entityType: 'User', entityId: user.id });
  redirect(user.mustChangePassword ? '/account/change-password' : '/dashboard');
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser({ allowPasswordChange: true });
  const currentPassword = String(formData.get('currentPassword') || '');
  const newPassword = String(formData.get('newPassword') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (newPassword.length < 12 || newPassword.length > 128 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    redirect('/account/change-password?error=Use+12+to+128+characters+with+upper+case,+lower+case+and+a+number');
  }
  if (newPassword !== confirmPassword) redirect('/account/change-password?error=New+password+confirmation+does+not+match');

  const record = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
  if (!record || !(await bcrypt.compare(currentPassword, record.passwordHash))) {
    redirect('/account/change-password?error=Current+password+is+incorrect');
  }
  if (await bcrypt.compare(newPassword, record.passwordHash)) {
    redirect('/account/change-password?error=Choose+a+different+password');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.transaction(async (tx) => {
    await tx.update(users).set({
      passwordHash,
      mustChangePassword: false,
      temporaryPasswordExpiresAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: new Date()
    }).where(eq(users.id, user.id));
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.update(mobileSessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(eq(mobileSessions.userId, user.id));
  });
  await audit({ schoolId: user.schoolId, userId: user.id, action: 'PASSWORD_CHANGED', entityType: 'User', entityId: user.id });
  await createSession(user.id);
  redirect('/dashboard?success=Password+changed+successfully');
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}
