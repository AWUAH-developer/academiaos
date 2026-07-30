'use client';

import { useActionState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { submitDemoRequestAction, type DemoRequestState } from '@/app/actions/demo-requests';
import type { PublicPlanKey } from '@/lib/public-plans';

type EnquiryType = 'PRICING' | 'DEMO';

export function PricingRequestForm({
  initialPackage,
  initialType,
}: {
  initialPackage: PublicPlanKey;
  initialType: EnquiryType;
}) {
  const [state, action, pending] = useActionState<DemoRequestState, FormData>(
    submitDemoRequestAction,
    { status: 'idle' },
  );

  if (state.status === 'success') {
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="text-emerald-600" size={48} />
        <h3 className="mt-5 text-2xl font-black text-emerald-950">Request received</h3>
        <p className="mt-3 max-w-md text-sm leading-7 text-emerald-700">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {state.status === 'error' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {state.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">School name *</label>
          <input name="schoolName" required className="input" placeholder="e.g. Paul Lawrence Academy" />
        </div>
        <div>
          <label className="label">Contact name *</label>
          <input name="contactName" required className="input" placeholder="Your full name" />
        </div>
        <div>
          <label className="label">Your role *</label>
          <select name="contactRole" required className="input" defaultValue="">
            <option value="" disabled>Select your role</option>
            <option>Proprietor</option>
            <option>Headteacher</option>
            <option>School administrator</option>
            <option>Academic administrator</option>
            <option>Accounts officer</option>
            <option>ICT administrator</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="label">Email address *</label>
          <input name="email" type="email" required className="input" placeholder="school@email.com" />
        </div>
        <div>
          <label className="label">Telephone *</label>
          <input name="phone" type="tel" required className="input" placeholder="+233…" />
        </div>
        <div>
          <label className="label">WhatsApp number</label>
          <input name="whatsapp" type="tel" className="input" placeholder="+233…" />
        </div>
        <div>
          <label className="label">Country *</label>
          <input name="country" required className="input" defaultValue="Ghana" />
        </div>
        <div>
          <label className="label">City or region *</label>
          <input name="region" required className="input" placeholder="e.g. Accra, Kumasi, Tamale" />
        </div>
        <div>
          <label className="label">Approx. learners</label>
          <input name="learnerCount" type="number" min={1} className="input" placeholder="e.g. 300" />
        </div>
        <div>
          <label className="label">Approx. staff</label>
          <input name="staffCount" type="number" min={1} className="input" placeholder="e.g. 25" />
        </div>
        <div>
          <label className="label">Selected package *</label>
          <select name="packageInterest" required className="input" defaultValue={initialPackage.toUpperCase()}>
            <option value="STARTER">Starter</option>
            <option value="STANDARD">Standard</option>
            <option value="PREMIUM">Premium</option>
          </select>
        </div>
        <div>
          <label className="label">Request type *</label>
          <select name="enquiryType" required className="input" defaultValue={initialType}>
            <option value="PRICING">Request pricing</option>
            <option value="DEMO">Request a demo</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="label">Optional add-ons</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-amber-300 hover:bg-amber-50/50">
            <input type="checkbox" name="addons" value="SMART_ID" className="mt-1 h-4 w-4 accent-[#1f5b45]" />
            <span><span className="block text-sm font-black text-slate-800">Smart ID add-on</span><span className="mt-1 block text-xs leading-5 text-slate-500">ID card printing, QR scanning and identity verification.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-amber-300 hover:bg-amber-50/50">
            <input type="checkbox" name="addons" value="SECURITY" className="mt-1 h-4 w-4 accent-[#1f5b45]" />
            <span><span className="block text-sm font-black text-slate-800">Security add-on</span><span className="mt-1 block text-xs leading-5 text-slate-500">Gate control, visitors, authorised pickup and incident records.</span></span>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Preferred contact method</label>
          <select name="preferredContact" className="input" defaultValue="PHONE">
            <option value="PHONE">Phone call</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
          </select>
        </div>
        <div>
          <label className="label">Preferred demo date</label>
          <input name="preferredDemoDate" type="date" className="input" />
        </div>
      </div>

      <div>
        <label className="label">Message or requirements</label>
        <textarea name="message" rows={4} className="input resize-none" placeholder="Tell us what your school needs, current challenges, or questions about the packages." />
      </div>

      <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[#1f5b45]" />
        <span>I agree that AcademiaOS may contact me about this package, pricing request or demonstration.</span>
      </label>

      <button type="submit" disabled={pending} className="btn-primary w-full gap-2 py-4 text-base">
        {pending ? <><Loader2 size={18} className="animate-spin" /> Sending request…</> : <><Send size={18} /> Submit request</>}
      </button>
      <p className="text-center text-xs text-slate-400">No package price is charged through this form. The AcademiaOS team will contact your school.</p>
    </form>
  );
}
