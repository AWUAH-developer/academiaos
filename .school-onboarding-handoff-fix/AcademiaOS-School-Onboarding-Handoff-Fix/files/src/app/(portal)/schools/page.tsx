import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asc, count, desc, eq } from 'drizzle-orm';
import { BadgeCheck, Building2, Clock, Package, XCircle } from 'lucide-react';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { SchoolEnrolmentWizard } from '@/components/SchoolEnrolmentWizard';
import { SchoolBadge } from '@/components/SchoolBadge';
import { db } from '@/db';
import {
  packageAddons, packages, schoolManagementControls, schoolSubscriptions, schools, users,
} from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';
import { selectSchoolAction, toggleSchoolAction, updateUserAdmissionManagementAction } from '@/app/actions/schools';
import { recordSubscriptionPaymentAction } from '@/app/actions/subscriptions';

export const dynamic = 'force-dynamic';

const statusStyle: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-800',
  PENDING:  'bg-amber-100 text-amber-800',
  GRACE:    'bg-orange-100 text-orange-800',
  SUSPENDED:'bg-rose-100 text-rose-800',
  EXPIRED:  'bg-slate-100 text-slate-500',
};
const statusIcon: Record<string, typeof Clock> = {
  ACTIVE: BadgeCheck, PENDING: Clock, SUSPENDED: XCircle, EXPIRED: XCircle, GRACE: Clock,
};

function fmt(n: string | number) {
  return `GHS ${parseFloat(String(n)).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function legacyPrefillDestination(value?: string) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const params = new URLSearchParams();

    const fields: Array<[string, string, number]> = [
      ['name', 'name', 160],
      ['code', 'code', 20],
      ['phone', 'phone', 40],
      ['email', 'email', 160],
      ['adminName', 'adminName', 120],
      ['adminPhone', 'adminPhone', 40],
      ['adminEmail', 'adminEmail', 160],
    ];

    for (const [queryName, sourceName, maxLength] of fields) {
      const raw = parsed[sourceName];
      if (typeof raw !== 'string') continue;
      const cleaned = raw.trim().slice(0, maxLength);
      if (cleaned) params.set(queryName, cleaned);
    }

    const query = params.toString();
    return query ? `/schools/enrol?${query}` : '/schools/enrol';
  } catch {
    return '/schools/enrol';
  }
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; expand?: string; prefill?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') {
    return <div className="paper-card p-8 text-center text-slate-500">Access denied.</div>;
  }

  const params = await searchParams;
  const legacyDestination = legacyPrefillDestination(params.prefill);
  if (legacyDestination) redirect(legacyDestination);

  const activeSchoolId = await getActiveSchoolId(user);
  const expandId      = params.expand ?? '';

  // All schools with user count
  const rows = await db
    .select({ school: schools, userCount: count(users.id) })
    .from(schools)
    .leftJoin(users, eq(schools.id, users.schoolId))
    .groupBy(schools.id)
    .orderBy(asc(schools.name));

  // Latest subscription per school
  const allSubs = await db
    .select({ sub: schoolSubscriptions, pkgName: packages.name })
    .from(schoolSubscriptions)
    .innerJoin(packages, eq(schoolSubscriptions.packageId, packages.id))
    .orderBy(desc(schoolSubscriptions.createdAt));

  const managementRows = await db.select().from(schoolManagementControls);
  const managementBySchool = new Map(
    managementRows.map((row) => [row.schoolId, row] as const)
  );

  const latestSubBySchool = new Map<string, (typeof allSubs)[0]>();
  for (const s of allSubs) {
    if (!latestSubBySchool.has(s.sub.schoolId)) latestSubBySchool.set(s.sub.schoolId, s);
  }

  // Packages + add-ons for the enrolment wizard
  const [pkgs, addons] = await Promise.all([
    db.select().from(packages).where(eq(packages.isActive, true)).orderBy(asc(packages.sortOrder)),
    db.select().from(packageAddons).where(eq(packageAddons.isActive, true)).orderBy(asc(packageAddons.sortOrder)),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Platform administration"
        title="Schools"
        description="Enroll new schools, manage subscriptions and switch between school workspaces."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/schools/enrol" className="btn-primary text-sm flex items-center gap-2">
              <Building2 size={16}/> Enroll school
            </Link>
            <Link href="/packages" className="btn-secondary text-sm flex items-center gap-2">
              <Package size={16}/> Packages & add-ons
            </Link>
          </div>
        }
      />
      <FlashMessage success={params.success} error={params.error} />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* ── Left: Enrolment wizard ─────────────────────────────────── */}
        <div>
          <SchoolEnrolmentWizard pkgs={pkgs as any} addons={addons as any} />
        </div>

        {/* ── Right: School list ─────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-black text-slate-800">{rows.length} school{rows.length !== 1 ? 's' : ''} on platform</h2>

          {rows.map(({ school, userCount }) => {
            const subEntry  = latestSubBySchool.get(school.id);
            const sub       = subEntry?.sub;
            const pkgName   = subEntry?.pkgName;
            const SubIcon   = sub ? (statusIcon[sub.status] ?? Clock) : Building2;
            const isExpanded = expandId === school.id;
        const management = managementBySchool.get(school.id);
        const premiumEligible =
          sub?.status === 'ACTIVE' &&
          String(pkgName || '').toLowerCase() === 'premium';
        const managementEnabled = Boolean(management?.userAdmissionEnabled);

            return (
              <div key={school.id} className="paper-card overflow-hidden">
                {/* School header */}
                <div className="flex flex-wrap items-center gap-4 p-5">
                  <SchoolBadge
                    name={school.name}
                    logoUrl={school.logoUrl}
                    size={56}
                    className="rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">{school.name}</p>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500">{school.code}</span>
                      <span className={`status-pill ${school.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {school.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{school.address || 'No address'} · {userCount} user{userCount !== 1 ? 's' : ''}</p>

                    {/* Subscription summary */}
                    {sub ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${statusStyle[sub.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          <SubIcon size={11}/> {sub.status}
                        </span>
                        <span className="text-xs text-slate-500">{pkgName} · {sub.term.replace('_', ' ')} {sub.academicYear}</span>
                        <span className="text-xs font-bold text-slate-600">{fmt(sub.paidAmount)} / {fmt(sub.totalAmount)}</span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-bold text-amber-600">⚠ No subscription recorded</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {school.isActive && (
                      <form action={selectSchoolAction}>
                        <input type="hidden" name="schoolId" value={school.id}/>
                        <button className="btn-primary min-h-9 px-3 py-1.5 text-xs">
                          {activeSchoolId === school.id ? 'Current workspace' : 'Open school'}
                        </button>
                      </form>
                    )}
                    <form action={toggleSchoolAction}>
                      <input type="hidden" name="schoolId" value={school.id}/>
                      <input type="hidden" name="active" value={String(!school.isActive)}/>
                      <button className="btn-secondary min-h-9 px-3 py-1.5 text-xs">
                        {school.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                    </form>
                    <Link
                      href={`/schools?expand=${isExpanded ? '' : school.id}`}
                      className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                    >
                      {isExpanded ? 'Hide' : 'Subscription'}
                    </Link>
                  </div>
                </div>

                {/* ── Expanded: subscription panel ──────────────────── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 p-5">
                    {/* ── SUPER_ADMIN School Administrator admission control ── */}
              <section className="mb-5 rounded-2xl border-2 border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      School access control
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      School Administrator admission permissions
                    </h3>
                    <p className="mt-1 max-w-2xl text-xs text-slate-500">
                      The Super Admin creates and activates the school. The School Administrator can add learners or staff only when you explicitly permit it here.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`status-pill ${
                      premiumEligible
                        ? 'bg-violet-100 text-violet-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {premiumEligible ? 'PREMIUM ELIGIBLE' : 'NOT ELIGIBLE'}
                    </span>

                    <span className={`status-pill ${
                      managementEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {managementEnabled ? 'ADMISSIONS ENABLED' : 'ADMISSIONS LOCKED'}
                    </span>
                  </div>
                </div>

                {!premiumEligible && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                    An ACTIVE Premium subscription is required before School Administrator admissions can be enabled.
                  </div>
                )}

                <form
                  action={updateUserAdmissionManagementAction}
                  className="mt-5 space-y-4"
                >
                  <input type="hidden" name="schoolId" value={school.id}/>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="font-black text-slate-800">School Administrator</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Viewing existing records remains available. These switches control creation of new records only.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold">
                        <input
                          type="checkbox"
                          name="allowSchoolAdminLearners"
                          defaultChecked={management?.allowSchoolAdminLearners ?? false}
                          disabled={!premiumEligible}
                        />
                        Add new learners
                      </label>

                      <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold">
                        <input
                          type="checkbox"
                          name="allowSchoolAdminStaff"
                          defaultChecked={management?.allowSchoolAdminStaff ?? false}
                          disabled={!premiumEligible}
                        />
                        Add new staff
                      </label>
                    </div>

                    <p className="mt-4 text-xs font-bold text-slate-500">
                      Proprietors remain oversight and approval users. They cannot create learners, staff, or schools.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {managementEnabled ? (
                      <>
                        <button
                          type="submit"
                          name="mode"
                          value="save"
                          className="btn-primary"
                          disabled={!premiumEligible}
                        >
                          Save School Admin permissions
                        </button>

                        <button
                          type="submit"
                          name="mode"
                          value="lock"
                          className="btn-secondary border-rose-200 text-rose-700"
                        >
                          Lock admissions
                        </button>
                      </>
                    ) : (
                      <button
                        type="submit"
                        name="mode"
                        value="unlock"
                        className="btn-primary"
                        disabled={!premiumEligible}
                      >
                        Enable selected permissions
                      </button>
                    )}
                  </div>

                  <p className="text-xs font-bold text-slate-500">
                    Locking admissions hides the Add learner and Add staff forms immediately. Existing records are never deleted.
                  </p>
                </form>
              </section>

              {sub ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-4 text-sm">
                          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Package</p><p className="mt-0.5 font-bold">{pkgName}</p></div>
                          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Term</p><p className="mt-0.5 font-bold">{sub.term.replace('_', ' ')} · {sub.academicYear}</p></div>
                          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Period</p><p className="mt-0.5 font-bold">{new Date(sub.startDate).toLocaleDateString('en-GH')} – {new Date(sub.endDate).toLocaleDateString('en-GH')}</p></div>
                          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Balance</p><p className={`mt-0.5 font-black ${parseFloat(String(sub.paidAmount)) >= parseFloat(String(sub.totalAmount)) ? 'text-emerald-700' : 'text-amber-700'}`}>{fmt(parseFloat(String(sub.totalAmount)) - parseFloat(String(sub.paidAmount)))} outstanding</p></div>
                        </div>
                        {sub.notes && <p className="text-xs text-slate-500">Notes: {sub.notes}</p>}

                        {/* Record additional payment */}
                        <form action={recordSubscriptionPaymentAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
                          <input type="hidden" name="subscriptionId" value={sub.id}/>
                          <div>
                            <label className="label">Record payment (GHS)</label>
                            <input className="input w-36 font-mono" name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required/>
                          </div>
                          <div>
                            <label className="label">Method</label>
                            <select className="input" name="method">
                              {['CASH','MOBILE_MONEY','BANK_TRANSFER','CHEQUE'].map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Reference</label>
                            <input className="input w-44" name="reference" placeholder="TXN-…"/>
                          </div>
                          <button className="btn-primary min-h-10 px-4 py-2 text-sm">Record payment</button>
                        </form>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No subscription yet — enroll this school using the wizard to assign a package.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="paper-card p-10 text-center">
              <Building2 className="mx-auto text-slate-300" size={40}/>
              <h3 className="mt-4 font-black text-slate-700">No schools yet</h3>
              <p className="mt-2 text-sm text-slate-500">Use the enrollment wizard to create the first school.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
