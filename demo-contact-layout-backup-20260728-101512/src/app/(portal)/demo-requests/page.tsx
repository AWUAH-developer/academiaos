import Link from 'next/link';
import { asc, desc, eq } from 'drizzle-orm';
import { Building2, CheckCircle2, Clock, Mail, Phone, School, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DeleteDemoRequestButton } from '@/components/DeleteDemoRequestButton';
import { db } from '@/db';
import { demoRequests } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { updateDemoRequestAction } from '@/app/actions/demo-requests';

export const dynamic = 'force-dynamic';

const statusStyle: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-rose-100 text-rose-800',
};

const statusIcon: Record<string, typeof Clock> = {
  PENDING:  Clock,
  APPROVED: CheckCircle2,
  DECLINED: XCircle,
};

export default async function DemoRequestsPage() {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') {
    return <div className="paper-card p-8 text-center text-slate-500">Access denied.</div>;
  }

  const requests = await db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));
  const pending  = requests.filter(r => r.status === 'PENDING').length;

  return (
    <>
      <PageHeader
        eyebrow="School onboarding"
        title="Demo requests"
        description="Schools that filled in the request form on academiaos.cc. Review each one, then create the school directly or send credentials manually."
        action={
          pending > 0
            ? <span className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">{pending} pending</span>
            : <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">All reviewed</span>
        }
      />

      {requests.length === 0 ? (
        <div className="paper-card p-12 text-center">
          <Building2 className="mx-auto text-slate-300" size={40} />
          <h3 className="mt-4 font-black text-slate-700">No demo requests yet</h3>
          <p className="mt-2 text-sm text-slate-500">When a school fills out the request form on the website, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const Icon = statusIcon[req.status] ?? Clock;
            return (
              <div key={req.id} className="paper-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* School info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-chalk-50 text-chalk-700">
                        <School size={20} />
                      </div>
                      <div>
                        <h2 className="font-black text-slate-900">{req.schoolName}</h2>
                        <p className="text-xs text-slate-500">
                          Submitted {req.createdAt.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Contact</p>
                        <p className="mt-0.5 font-bold text-slate-800">{req.contactName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Email</p>
                        <a href={`mailto:${req.email}`} className="mt-0.5 flex items-center gap-1.5 font-bold text-chalk-700 hover:underline">
                          <Mail size={13} /> {req.email}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone</p>
                        <a href={`tel:${req.phone}`} className="mt-0.5 flex items-center gap-1.5 font-bold text-chalk-700 hover:underline">
                          <Phone size={13} /> {req.phone}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Size</p>
                        <p className="mt-0.5 font-bold text-slate-800">
                          {req.learnerCount ? `${req.learnerCount} learners` : '—'}
                          {req.staffCount ? `, ${req.staffCount} staff` : ''}
                        </p>
                      </div>
                    </div>

                    {req.message && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        <span className="font-bold text-slate-400">Message: </span>{req.message}
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${statusStyle[req.status]}`}>
                    <Icon size={13} /> {req.status}
                  </span>
                </div>

                {/* Actions row */}
                <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
                  {/* Notes + status update */}
                  <form action={updateDemoRequestAction} className="flex flex-1 flex-wrap gap-2">
                    <input type="hidden" name="id" value={req.id} />
                    <input
                      name="notes"
                      defaultValue={req.notes ?? ''}
                      placeholder="Internal notes…"
                      className="input min-w-48 flex-1 py-2 text-sm"
                    />
                    <select name="status" defaultValue={req.status} className="input w-36 py-2 text-sm">
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="DECLINED">Declined</option>
                    </select>
                    <button className="btn-secondary py-2 text-sm">Save notes</button>
                  </form>

                  {/* Create school shortcut */}
                  <Link
                    href={`/schools?prefill=${encodeURIComponent(JSON.stringify({ name: req.schoolName, email: req.email, adminName: req.contactName, adminPhone: req.phone, adminEmail: req.email }))}`}
                    className="btn-primary py-2 text-sm whitespace-nowrap"
                  >
                    <School size={15} /> Create school
                  </Link>

                  {/* Delete */}
                  <DeleteDemoRequestButton id={req.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        <p className="font-black text-slate-700">To create a school directly (in-person meeting)</p>
        <p className="mt-1">Go to <Link href="/schools" className="font-bold text-chalk-700 hover:underline">Schools</Link> → Register a school. Fill in the school and first administrator details. The system generates a temporary password you forward to them.</p>
      </div>
    </>
  );
}
