'use client';
import { useActionState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { submitDemoRequestAction, type DemoRequestState } from '@/app/actions/demo-requests';
import { SchoolInitialsInput } from '@/components/SchoolInitialsInput';

export function DemoRequestForm() {
  const [state, action, pending] = useActionState<DemoRequestState, FormData>(
    submitDemoRequestAction,
    { status: 'idle' }
  );

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="text-emerald-600" size={40} />
        <h3 className="text-xl font-black text-emerald-900">Request sent!</h3>
        <p className="max-w-sm text-sm leading-7 text-emerald-700">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.status === 'error' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {state.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <SchoolInitialsInput
          className="sm:col-span-2"
          nameInputName="schoolName"
          nameLabel="School name *"
          namePlaceholder="e.g. Paul Lawrence Academy"
        />
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Your name *</label>
          <input name="contactName" required placeholder="Contact person" className="input w-full" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Email address *</label>
          <input name="email" type="email" required placeholder="school@email.com" className="input w-full" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Phone number *</label>
          <input name="phone" type="tel" required placeholder="+233…" className="input w-full" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Approx. number of learners</label>
          <input name="learnerCount" type="number" min={1} placeholder="e.g. 300" className="input w-full" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Approx. number of staff</label>
          <input name="staffCount" type="number" min={1} placeholder="e.g. 25" className="input w-full" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-slate-600">Message or questions (optional)</label>
        <textarea name="message" rows={3} placeholder="Tell us about your school, any specific requirements…" className="input w-full resize-none" />
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full gap-2">
        {pending ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : <><Send size={17} /> Send demo request</>}
      </button>
      <p className="text-center text-xs text-slate-400">We respond within 24 hours. No commitment required.</p>
    </form>
  );
}
