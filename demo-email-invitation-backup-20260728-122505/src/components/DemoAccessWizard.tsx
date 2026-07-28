'use client';

import { useActionState } from 'react';
import { CalendarClock, CheckCircle2, KeyRound, ShieldX } from 'lucide-react';
import {
  createDemoAccessAction,
  extendDemoAccessAction,
  revokeDemoAccessAction,
  type CreateDemoAccessState,
} from '@/app/actions/demo-access';
import { SchoolInitialsInput } from '@/components/SchoolInitialsInput';

type DemoRequestData = {
  id: string;
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  learnerCount: number | null;
  staffCount: number | null;
};

type DemoPackage = {
  id: string;
  name: string;
  description: string | null;
};

type ExistingDemo = {
  schoolId: string;
  schoolName: string;
  username: string | null;
  expiresAt: string;
  status: string;
  schoolActive: boolean;
};

function ghanaDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function DemoAccessWizard({
  request,
  packages,
  existing,
}: {
  request: DemoRequestData;
  packages: DemoPackage[];
  existing?: ExistingDemo | null;
}) {
  const [state, action, pending] = useActionState<CreateDemoAccessState, FormData>(
    createDemoAccessAction,
    { status: 'idle' },
  );

  if (state.status === 'success') {
    return (
      <div className="paper-card p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={30} />
          <div>
            <h2 className="text-xl font-black text-slate-900">Seven-day demo created</h2>
            <p className="mt-1 text-sm text-slate-500">{state.message}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Send these credentials privately</p>
          <div className="mt-3 space-y-2 font-mono text-sm text-slate-800">
            <p>Username: <strong>{state.username}</strong></p>
            <p>Temporary password: <strong>{state.temporaryPassword}</strong></p>
            <p>Expires: <strong>{state.expiresAt ? ghanaDateTime(state.expiresAt) : ''}</strong></p>
          </div>
          <p className="mt-4 text-xs font-bold text-rose-700">
            Copy the password now. AcademiaOS stores only the secure password hash and cannot display this same password again.
          </p>
        </div>

        <a href="/demo-requests" className="btn-primary mt-5 inline-flex">Return to demo requests</a>
      </div>
    );
  }

  if (existing) {
    const expired = new Date(existing.expiresAt).getTime() <= Date.now();
    const active = existing.schoolActive && existing.status === 'ACTIVE' && !expired;

    return (
      <div className="paper-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Existing demo access</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{existing.schoolName}</h2>
            <p className="mt-1 text-sm text-slate-500">Administrator username: <strong>{existing.username || 'Not found'}</strong></p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {active ? 'ACTIVE DEMO' : expired ? 'EXPIRED' : 'REVOKED'}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Expiry</p>
            <p className="mt-1 font-black text-slate-800">{ghanaDateTime(existing.expiresAt)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Access type</p>
            <p className="mt-1 font-black text-slate-800">Seven-day web demo</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <form action={extendDemoAccessAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <button className="btn-primary flex items-center gap-2">
              <CalendarClock size={16} /> Extend by 7 days
            </button>
          </form>

          <form action={revokeDemoAccessAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <button className="btn-secondary flex items-center gap-2 border-rose-200 text-rose-700">
              <ShieldX size={16} /> Revoke demo
            </button>
          </form>
        </div>

        <p className="mt-5 text-xs text-slate-500">
          Demo data remains isolated. Converting this prospect to a paid school must use the separate production enrolment flow.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="paper-card space-y-6 p-6">
      <input type="hidden" name="requestId" value={request.id} />

      {state.status === 'error' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {state.message}
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-black">This creates demo access only</p>
        <p className="mt-1">The login is valid for 7 calendar days. No payment or production subscription is created.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-black text-slate-900">Demo school</h2>
        <div>
          <label className="label">School logo (optional)</label>
          <input className="input" name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
          <p className="mt-1 text-xs text-slate-500">Leave empty to use the school initials badge.</p>
        </div>
        <SchoolInitialsInput
          nameInputName="schoolName"
          defaultName={request.schoolName}
          nameLabel="School name *"
          namePlaceholder="School name"
          codeInputName="code"
          codeLabel="Demo school code"
          codePlaceholder="Automatic"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-black text-slate-900">Demo administrator</h2>
        <div>
          <label className="label">Administrator photo (optional)</label>
          <input className="input" name="adminPhoto" type="file" accept="image/jpeg,image/png,image/webp" />
          <p className="mt-1 text-xs text-slate-500">Leave empty to use the default AcademiaOS profile image.</p>
        </div>
        <input className="input" name="adminName" defaultValue={request.contactName} placeholder="Administrator name" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" name="adminPhone" type="tel" defaultValue={request.phone} placeholder="Phone" required />
          <input className="input" name="adminEmail" type="email" defaultValue={request.email} placeholder="Email" required />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-black text-slate-900">Package to demonstrate</h2>
        {packages.length ? (
          <select className="input" name="packageId" defaultValue={packages[0]?.id} required>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
            ))}
          </select>
        ) : (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            No active package is available. Activate a package before creating demo access.
          </div>
        )}
      </section>

      <button className="btn-primary flex w-full items-center justify-center gap-2" disabled={pending || packages.length === 0}>
        <KeyRound size={17} /> {pending ? 'Creating demo access…' : 'Create 7-day demo access'}
      </button>
    </form>
  );
}
