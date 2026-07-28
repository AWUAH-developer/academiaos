import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { Building2, CheckCircle2, Clock, KeyRound, Mail, Phone, School, Users, XCircle } from 'lucide-react';
import { CopyDemoRequestDetailsButton } from '@/components/CopyDemoRequestDetailsButton';
import { DeleteDemoRequestButton } from '@/components/DeleteDemoRequestButton';
import { PageHeader } from '@/components/PageHeader';
import { SchoolBadge } from '@/components/SchoolBadge';
import { db } from '@/db';
import { demoRequests } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { updateDemoRequestAction } from '@/app/actions/demo-requests';

export const dynamic = 'force-dynamic';

const statusStyle: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-rose-100 text-rose-800',
};

const statusIcon: Record<string, typeof Clock> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  DECLINED: XCircle,
};

function schoolEnrolmentHref(request: {
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
}) {
  const params = new URLSearchParams({
    name: request.schoolName,
    email: request.email,
    adminName: request.contactName,
    adminPhone: request.phone,
    adminEmail: request.email,
  });

  return `/schools/enrol?${params.toString()}`;
}

export default async function DemoRequestsPage() {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') {
    return <div className="paper-card p-8 text-center text-slate-500">Access denied.</div>;
  }

  const requests = await db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));
  const pending = requests.filter((request) => request.status === 'PENDING').length;

  return (
    <>
      <PageHeader
        eyebrow="School onboarding"
        title="Demo requests"
        description="Review each request, create a separate 7-day demo, or start paid production enrolment only when the school subscribes."
        action={
          pending > 0 ? (
            <span className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">
              {pending} pending
            </span>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
              All reviewed
            </span>
          )
        }
      />

      {requests.length === 0 ? (
        <div className="paper-card p-12 text-center">
          <Building2 className="mx-auto text-slate-300" size={40} />
          <h3 className="mt-4 font-black text-slate-700">No demo requests yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            When a school fills out the request form on the website, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const Icon = statusIcon[request.status] ?? Clock;
            return (
              <div key={request.id} className="paper-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-3">
                      <SchoolBadge name={request.schoolName} size={44} className="rounded-xl" />
                      <div className="min-w-0">
                        <h2 className="break-words font-black text-slate-900">{request.schoolName}</h2>
                        <p className="text-xs text-slate-500">
                          Submitted{' '}
                          {request.createdAt.toLocaleString('en-GH', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${statusStyle[request.status]}`}
                  >
                    <Icon size={13} /> {request.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Contact person</p>
                    <p className="mt-1 break-words font-bold text-slate-800">{request.contactName}</p>
                  </div>

                  <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Email address</p>
                    <a
                      href={`mailto:${request.email}`}
                      className="mt-1 flex min-w-0 items-start gap-2 font-bold text-chalk-700 hover:underline"
                    >
                      <Mail className="mt-0.5 shrink-0" size={15} />
                      <span className="min-w-0 break-all">{request.email}</span>
                    </a>
                  </div>

                  <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone number</p>
                    <a
                      href={`tel:${request.phone}`}
                      className="mt-1 flex min-w-0 items-start gap-2 font-bold text-chalk-700 hover:underline"
                    >
                      <Phone className="mt-0.5 shrink-0" size={15} />
                      <span className="min-w-0 break-all">{request.phone}</span>
                    </a>
                  </div>

                  <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">School size</p>
                    <p className="mt-1 flex items-center gap-2 font-bold text-slate-800">
                      <Users className="shrink-0 text-slate-400" size={15} />
                      <span>
                        {request.learnerCount ? `${request.learnerCount} learners` : 'Learners not provided'}
                        {' · '}
                        {request.staffCount ? `${request.staffCount} staff` : 'Staff not provided'}
                      </span>
                    </p>
                  </div>
                </div>

                {request.message && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    <span className="font-bold text-slate-400">Message: </span>
                    {request.message}
                  </div>
                )}

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                  <form
                    action={updateDemoRequestAction}
                    className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_10rem_auto]"
                  >
                    <input type="hidden" name="id" value={request.id} />
                    <input
                      name="notes"
                      defaultValue={request.notes ?? ''}
                      placeholder="Internal notes about this prospect…"
                      className="input min-w-0 py-2 text-sm"
                    />
                    <select name="status" defaultValue={request.status} className="input py-2 text-sm">
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="DECLINED">Declined</option>
                    </select>
                    <button className="btn-secondary py-2 text-sm whitespace-nowrap">Save notes</button>
                  </form>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-500">
                      Demo access and paid production enrolment are separate. Demo records never become production records automatically.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <CopyDemoRequestDetailsButton
                        schoolName={request.schoolName}
                        contactName={request.contactName}
                        email={request.email}
                        phone={request.phone}
                        learnerCount={request.learnerCount}
                        staffCount={request.staffCount}
                      />

                      <Link
                        href={`/demo-requests/${request.id}/create`}
                        className="btn-primary py-2 text-sm whitespace-nowrap"
                      >
                        <KeyRound size={15} /> Create 7-day demo
                      </Link>

                      <Link
                        href={schoolEnrolmentHref(request)}
                        className="btn-secondary py-2 text-sm whitespace-nowrap"
                      >
                        <School size={15} /> Convert to paid school
                      </Link>

                      <DeleteDemoRequestButton id={request.id} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        <p className="font-black text-slate-700">To create a school directly (in-person meeting)</p>
        <p className="mt-1">
          Go to{' '}
          <Link href="/schools/enrol" className="font-bold text-chalk-700 hover:underline">
            Schools → Enrol a school
          </Link>
          . This is the paid production workflow and is separate from demo access.
        </p>
      </div>
    </>
  );
}
