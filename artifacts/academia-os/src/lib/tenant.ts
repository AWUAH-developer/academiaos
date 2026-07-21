import { asc, and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { schools } from '@/db/schema';
import type { AuthUser } from '@/lib/auth';

const ACTIVE_SCHOOL_COOKIE = 'academiaos_active_school';

export async function getActiveSchoolId(user: Pick<AuthUser, 'schoolId' | 'role'>) {
  if (user.schoolId) return user.schoolId;
  if (user.role === 'SUPER_ADMIN') {
    const cookieStore = await cookies();
    const selectedId = cookieStore.get(ACTIVE_SCHOOL_COOKIE)?.value;
    if (selectedId) {
      const selected = (await db.select({ id: schools.id }).from(schools).where(and(eq(schools.id, selectedId), eq(schools.isActive, true))).limit(1))[0];
      if (selected) return selected.id;
    }
    const school = (await db.select({ id: schools.id }).from(schools).where(eq(schools.isActive, true)).orderBy(asc(schools.createdAt)).limit(1))[0];
    if (!school) throw new Error('No active school exists.');
    return school.id;
  }
  throw new Error('Your account is not assigned to a school.');
}

export async function setActiveSchoolCookie(schoolId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SCHOOL_COOKIE, schoolId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30, priority: 'high' });
}
