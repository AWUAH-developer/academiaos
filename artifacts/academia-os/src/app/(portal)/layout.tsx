import { eq } from 'drizzle-orm';
import { AppShell } from '@/components/AppShell';
import { db } from '@/db';
import { schools } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === 'SUPER_ADMIN') {
    const schoolId = await getActiveSchoolId(user);
    const school = (await db.select({ name: schools.name, logoUrl: schools.logoUrl }).from(schools).where(eq(schools.id, schoolId)).limit(1))[0];
    return <AppShell user={{ ...user, school: school ? { name: school.name, logoUrl: school.logoUrl } : null }}>{children}</AppShell>;
  }
  return <AppShell user={user}>{children}</AppShell>;
}
