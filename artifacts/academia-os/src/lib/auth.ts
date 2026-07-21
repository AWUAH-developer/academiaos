import crypto from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { auditLogs, schools, sessions, users } from '@/db/schema';
import type { UserRole, UserStatus } from '@/lib/types';

const DEFAULT_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-academiaos_session' : 'academiaos_session';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
const SESSION_DAYS = 7;
const IDLE_MINUTES = 45;
const MAX_AUDIT_JSON_LENGTH = 16_000;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeHeader(value: string | null, maxLength: number) {
  return value?.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, maxLength) || null;
}

function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 100).map(redactAuditValue);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
      output[key] = /password|secret|token|authorization|cookie|database.?url/i.test(key) ? '[REDACTED]' : redactAuditValue(item);
    }
    return output;
  }
  if (typeof value === 'string') return value.slice(0, 4_000);
  return value;
}

function boundedAuditValue(value: unknown) {
  if (value === undefined) return null;
  const redacted = redactAuditValue(value);
  try {
    const serialized = JSON.stringify(redacted);
    if (serialized.length <= MAX_AUDIT_JSON_LENGTH) return redacted;
    return { truncated: true, preview: serialized.slice(0, MAX_AUDIT_JSON_LENGTH) };
  } catch {
    return { unavailable: true };
  }
}

export type AuthUser = {
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
    currency: string;
    logoUrl: string | null;
    proprietorApprovalRequired: boolean;
  } | null;
};

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
    priority: 'high'
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  cookieStore.delete(COOKIE_NAME);
}

export async function currentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const rows = await db.select({
    sessionId: sessions.id,
    expiresAt: sessions.expiresAt,
    lastSeenAt: sessions.lastSeenAt,
    id: users.id,
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
    currency: schools.currency,
    schoolLogoUrl: schools.logoUrl,
    proprietorApprovalRequired: schools.proprietorApprovalRequired,
    schoolIsActive: schools.isActive
  }).from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(schools, eq(users.schoolId, schools.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || row.status !== 'ACTIVE' || (row.schoolId && row.schoolIsActive === false)) {
    if (row) await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    // Cookie writes are only allowed in Server Actions/Route Handlers, not Server Components.
    // The session row is already deleted; the cookie will expire naturally if deletion fails here.
    try { cookieStore.delete(COOKIE_NAME); } catch { /* expected in Server Component context */ }
    return null;
  }

  if (Date.now() - row.lastSeenAt.getTime() > IDLE_MINUTES * 60_000) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    try { cookieStore.delete(COOKIE_NAME); } catch { /* expected in Server Component context */ }
    return null;
  }

  if (Date.now() - row.lastSeenAt.getTime() > 5 * 60_000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.sessionId));
  }

  return {
    id: row.id,
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
      currency: row.currency!,
      logoUrl: row.schoolLogoUrl,
      proprietorApprovalRequired: row.proprietorApprovalRequired!
    } : null
  };
}

export async function requireUser(options: { allowPasswordChange?: boolean } = {}) {
  const user = await currentUser();
  if (!user) redirect('/');
  if (user.mustChangePassword && !options.allowPasswordChange) redirect('/account/change-password');
  return user;
}

export async function audit(input: {
  userId?: string | null;
  schoolId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const headerStore = await headers();
  await db.insert(auditLogs).values({
    userId: input.userId ?? null,
    schoolId: input.schoolId ?? null,
    action: input.action.slice(0, 120),
    entityType: input.entityType.slice(0, 120),
    entityId: input.entityId?.slice(0, 200),
    oldValue: boundedAuditValue(input.oldValue),
    newValue: boundedAuditValue(input.newValue),
    ipAddress: safeHeader(headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || null, 64),
    userAgent: safeHeader(headerStore.get('user-agent'), 512)
  });
}
