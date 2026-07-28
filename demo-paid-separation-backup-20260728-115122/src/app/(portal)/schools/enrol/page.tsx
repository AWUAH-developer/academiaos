import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  SchoolEnrolmentWizard,
  type SchoolEnrolmentPrefill,
} from '@/components/SchoolEnrolmentWizard';
import { db } from '@/db';
import { packageAddons, packages } from '@/db/schema';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type EnrolSearchParams = {
  name?: string;
  code?: string;
  phone?: string;
  email?: string;
  adminName?: string;
  adminPhone?: string;
  adminEmail?: string;
};

function clean(value: string | undefined, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export default async function EnrolSchoolPage({
  searchParams,
}: {
  searchParams: Promise<EnrolSearchParams>;
}) {
  const user = await requireUser();

  if (user.role !== 'SUPER_ADMIN') {
    return <div className="paper-card p-8 text-center text-slate-500">Access denied.</div>;
  }

  const params = await searchParams;

  const prefill: SchoolEnrolmentPrefill = {
    name: clean(params.name, 160),
    code: clean(params.code, 20),
    phone: clean(params.phone, 40),
    email: clean(params.email, 160),
    adminName: clean(params.adminName, 120),
    adminPhone: clean(params.adminPhone, 40),
    adminEmail: clean(params.adminEmail, 160),
  };

  const [pkgs, addons] = await Promise.all([
    db
      .select()
      .from(packages)
      .where(eq(packages.isActive, true))
      .orderBy(asc(packages.sortOrder)),
    db
      .select()
      .from(packageAddons)
      .where(eq(packageAddons.isActive, true))
      .orderBy(asc(packageAddons.sortOrder)),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Platform administration"
        title="Enroll a school"
        description="Create a paid production school, its first administrator, package, subscription and payment record."
        action={
          <Link href="/schools" className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> Back to schools
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl">
        <SchoolEnrolmentWizard
          pkgs={pkgs as any}
          addons={addons as any}
          prefill={prefill}
        />
      </div>
    </>
  );
}
