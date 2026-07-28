import Link from 'next/link';
import { asc, desc, eq, like } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DemoAccessWizard } from '@/components/DemoAccessWizard';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { demoRequests, packages, schoolSubscriptions, schools, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { emailDeliveryConfigured } from '@/lib/email';

export const dynamic = 'force-dynamic';

export default async function CreateDemoAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') {
    return <div className="paper-card p-8 text-center text-slate-500">Access denied.</div>;
  }

  const { id } = await params;
  const request = (
    await db.select().from(demoRequests).where(eq(demoRequests.id, id)).limit(1)
  )[0];

  if (!request) notFound();

  const activePackages = await db
    .select({
      id: packages.id,
      name: packages.name,
      description: packages.description,
    })
    .from(packages)
    .where(eq(packages.isActive, true))
    .orderBy(asc(packages.sortOrder));

  const marker = `[DEMO_REQUEST:${id}]`;
  const existingSubscription = (
    await db
      .select()
      .from(schoolSubscriptions)
      .where(like(schoolSubscriptions.notes, `%${marker}%`))
      .orderBy(desc(schoolSubscriptions.createdAt))
      .limit(1)
  )[0];

  let existing: {
    schoolId: string;
    schoolName: string;
    username: string | null;
    expiresAt: string;
    status: string;
    schoolActive: boolean;
  } | null = null;

  if (existingSubscription) {
    const [school, admin] = await Promise.all([
      db.select().from(schools).where(eq(schools.id, existingSubscription.schoolId)).limit(1),
      db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.schoolId, existingSubscription.schoolId))
        .orderBy(asc(users.createdAt))
        .limit(1),
    ]);

    if (school[0]) {
      existing = {
        schoolId: school[0].id,
        schoolName: school[0].name,
        username: admin[0]?.username ?? null,
        expiresAt: existingSubscription.endDate.toISOString(),
        status: existingSubscription.status,
        schoolActive: school[0].isActive,
      };
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Demo management"
        title="Create 7-day demo access"
        description="Create temporary web access only. This does not enrol a paid production school."
        action={
          <Link href="/demo-requests" className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> Back to demo requests
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl">
        <DemoAccessWizard
          request={{
            id: request.id,
            schoolName: request.schoolName,
            contactName: request.contactName,
            email: request.email,
            phone: request.phone,
            learnerCount: request.learnerCount,
            staffCount: request.staffCount,
          }}
          packages={activePackages}
          existing={existing}
          emailConfigured={emailDeliveryConfigured()}
        />
      </div>
    </>
  );
}
