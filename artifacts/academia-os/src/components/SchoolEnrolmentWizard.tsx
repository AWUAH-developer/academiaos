'use client';

import { useActionState, useState } from 'react';
import {
  BadgeCheck, Building2, CheckCircle2, ChevronDown, ChevronUp,
  CreditCard, Loader2, Plus, School, User
} from 'lucide-react';
import { enrolSchoolAction, type EnrolSchoolState } from '@/app/actions/subscriptions';

type Pkg  = { id: string; name: string; description: string | null; pricePerTerm: string; pricePerLearner: string | null; maxLearners: number | null; maxStaff: number | null; features: unknown };
type Addon = { id: string; name: string; description: string | null; pricePerTerm: string };

const TERMS  = [{ value: 'TERM_1', label: 'Term 1' }, { value: 'TERM_2', label: 'Term 2' }, { value: 'TERM_3', label: 'Term 3' }];
const METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE'];
const ROLES  = [{ value: 'SCHOOL_ADMIN', label: 'School Administrator' }, { value: 'PROPRIETOR', label: 'Proprietor' }, { value: 'HEADTEACHER', label: 'Headteacher' }];

function currentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

function fmt(n: string | number) { return `GHS ${parseFloat(String(n)).toLocaleString('en-GH', { minimumFractionDigits: 2 })}` }

export function SchoolEnrolmentWizard({ pkgs, addons }: { pkgs: Pkg[]; addons: Addon[] }) {
  const [state, action, pending] = useActionState<EnrolSchoolState, FormData>(enrolSchoolAction, { status: 'idle' });
  const [selectedPkg, setSelectedPkg]   = useState<string>(pkgs[0]?.id ?? '');
  const [selectedAddons, setAddons]     = useState<string[]>([]);
  const [paymentAmt, setPaymentAmt]     = useState('');
  const [open, setOpen]                 = useState(true);

  const [learnerCount, setLearnerCount] = useState('');

  const pkg            = pkgs.find(p => p.id === selectedPkg);
  const addonTotal     = addons.filter(a => selectedAddons.includes(a.id)).reduce((s, a) => s + parseFloat(a.pricePerTerm), 0);
  const perLearner     = pkg?.pricePerLearner ? parseFloat(pkg.pricePerLearner) : null;
  const basePrice      = perLearner !== null
    ? perLearner * (parseInt(learnerCount) || 0)
    : parseFloat(pkg?.pricePerTerm ?? '0');
  const total          = basePrice + addonTotal;
  const paid           = parseFloat(paymentAmt) || 0;
  const willActivate   = paid >= total && total > 0;

  function toggleAddon(id: string) {
    setAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  if (state.status === 'success') {
    return (
      <div className="paper-card p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600" size={32} />
          <div>
            <h3 className="text-lg font-black text-slate-900">{willActivate ? '✓ School enrolled & activated' : '✓ School created — pending payment'}</h3>
            <p className="text-sm text-slate-500">{state.message}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm">
          <p>Username: <strong>{state.username}</strong></p>
          <p>Temporary password: <strong>{state.temporaryPassword}</strong></p>
          <p className="mt-2 font-sans text-xs text-slate-500">Expires in 72 hours. Forward to the school administrator.</p>
        </div>
        <button
          className="btn-secondary mt-4 w-full"
          onClick={() => window.location.reload()}
        >
          Enrol another school
        </button>
      </div>
    );
  }

  return (
    <div className="paper-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center justify-between p-5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-chalk-50 text-chalk-700"><School size={20}/></div>
          <div>
            <h2 className="font-black">Enrol a school</h2>
            <p className="text-xs text-slate-500">School details → Package → Subscription & payment → Activate</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
      </button>

      {open && (
        <form action={action} className="border-t border-slate-100 p-5 space-y-7">
          {state.status === 'error' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{state.message}</div>
          )}

          {/* ── SECTION 1: School details ──────────────────────────── */}
          <section>
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <Building2 size={14}/> School details
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">School logo *</label>
                  <input className="input" name="logo" type="file" accept="image/jpeg,image/png,image/webp" required/>
                </div>
                <div className="col-span-2">
                  <label className="label">School name *</label>
                  <input className="input" name="name" placeholder="e.g. Blessed Academy" required/>
                </div>
                <div>
                  <label className="label">Short code * <span className="font-normal text-slate-400">(e.g. BLA)</span></label>
                  <input className="input uppercase" name="code" placeholder="BLA" maxLength={10} required/>
                </div>
                <div>
                  <label className="label">Currency</label>
                  <input className="input" name="currency" defaultValue="GHS" placeholder="GHS"/>
                </div>
                <div className="col-span-2">
                  <label className="label">Address</label>
                  <input className="input" name="address" placeholder="School address"/>
                </div>
                <div>
                  <label className="label">School phone</label>
                  <input className="input" name="phone" type="tel" placeholder="+233…"/>
                </div>
                <div>
                  <label className="label">School email</label>
                  <input className="input" name="email" type="email" placeholder="info@school.edu.gh"/>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 2: First administrator ────────────────────── */}
          <section>
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <User size={14}/> First administrator
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Administrator photo *</label>
                <input className="input" name="adminPhoto" type="file" accept="image/jpeg,image/png,image/webp" required/>
              </div>
              <input className="input" name="adminName" placeholder="Full name *" required/>
              <div className="grid grid-cols-2 gap-3">
                <input className="input" name="adminPhone" type="tel" placeholder="Phone *" required/>
                <input className="input" name="adminEmail" type="email" placeholder="Email *" required/>
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" name="adminRole">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* ── SECTION 3: Package ────────────────────────────────── */}
          <section>
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <CreditCard size={14}/> Package
            </div>
            <div className="space-y-2">
              {pkgs.map(p => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selectedPkg === p.id ? 'border-chalk-600 bg-chalk-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <input
                    type="radio" name="packageId" value={p.id}
                    checked={selectedPkg === p.id}
                    onChange={() => setSelectedPkg(p.id)}
                    className="mt-1 accent-[#1f5b45]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-slate-900">{p.name}</p>
                      {p.pricePerLearner
                        ? <p className="shrink-0 text-sm font-black text-chalk-700">GHS {parseFloat(p.pricePerLearner).toFixed(2)}<span className="font-normal text-slate-400"> / learner</span></p>
                        : <p className="shrink-0 text-sm font-black text-chalk-700">{fmt(p.pricePerTerm)}<span className="font-normal text-slate-400">/term</span></p>
                      }
                    </div>
                    {p.description && <p className="mt-0.5 text-xs text-slate-500">{p.description}</p>}
                    {p.maxLearners && <p className="mt-1 text-xs text-slate-400">Up to {p.maxLearners} learners · {p.maxStaff} staff</p>}
                  </div>
                </label>
              ))}
            </div>

            {/* Learner count — shown only for per-learner packages */}
            {perLearner !== null && (
              <div className="mt-4 rounded-xl border border-chalk-200 bg-chalk-50 p-4">
                <label className="label text-chalk-800">Number of learners *</label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    className="input max-w-[140px] font-mono"
                    name="learnerCount"
                    type="number"
                    min="1"
                    placeholder="e.g. 120"
                    value={learnerCount}
                    onChange={e => setLearnerCount(e.target.value)}
                    required
                  />
                  {learnerCount && parseInt(learnerCount) > 0 && (
                    <p className="text-sm text-slate-600">
                      {parseInt(learnerCount)} × GHS {perLearner.toFixed(2)} = <strong className="text-chalk-700">{fmt(basePrice)}</strong>
                    </p>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">Enter the current enrolled learner count to calculate the fee.</p>
              </div>
            )}

            {/* Add-ons */}
            {addons.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Add-ons (optional)</p>
                <div className="space-y-2">
                  {addons.map(a => (
                    <label key={a.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selectedAddons.includes(a.id) ? 'border-chalk-600 bg-chalk-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="checkbox" name="addonIds" value={a.id}
                        checked={selectedAddons.includes(a.id)}
                        onChange={() => toggleAddon(a.id)}
                        className="accent-[#1f5b45]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-900">{a.name}</p>
                        {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                      </div>
                      <p className="shrink-0 text-sm font-bold text-chalk-700">+{fmt(a.pricePerTerm)}</p>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── SECTION 4: Subscription period ────────────────────── */}
          <section>
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <BadgeCheck size={14}/> Subscription period
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Academic year *</label>
                <input className="input" name="academicYear" defaultValue={currentAcademicYear()} placeholder="2024/2025" required/>
              </div>
              <div>
                <label className="label">Term *</label>
                <select className="input" name="term" required>
                  {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Start date *</label>
                <input className="input" name="startDate" type="date" required/>
              </div>
              <div>
                <label className="label">End date *</label>
                <input className="input" name="endDate" type="date" required/>
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <input className="input" name="subNotes" placeholder="e.g. trial period, discount applied…"/>
              </div>
            </div>
          </section>

          {/* ── SECTION 5: Record payment ─────────────────────────── */}
          <section>
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <Plus size={14}/> Record payment
            </div>

            {/* Totals */}
            <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">
                  {pkg?.name}
                  {perLearner !== null && learnerCount && parseInt(learnerCount) > 0
                    ? ` (${parseInt(learnerCount)} learners × GHS ${perLearner.toFixed(2)})`
                    : ''}
                </span>
                <span className="font-bold">{fmt(basePrice)}</span>
              </div>
              {addonTotal > 0 && <div className="flex justify-between mt-1"><span className="text-slate-600">Add-ons</span><span className="font-bold">{fmt(addonTotal)}</span></div>}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2"><span className="font-black text-slate-900">Total due</span><span className="font-black text-chalk-700">{fmt(total)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount paid (GHS) *</label>
                <input
                  className="input font-mono"
                  name="paymentAmount"
                  type="number" min="0" step="0.01"
                  placeholder={String(total.toFixed(2))}
                  value={paymentAmt}
                  onChange={e => setPaymentAmt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Method</label>
                <select className="input" name="paymentMethod">
                  {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Reference / receipt number</label>
                <input className="input" name="paymentReference" placeholder="e.g. TXN-20240915-001"/>
              </div>
            </div>

            {paymentAmt && (
              <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-bold ${willActivate ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                {willActivate
                  ? `✓ Full payment — school will be activated immediately.`
                  : `Partial payment (${fmt(paid)} of ${fmt(total)}) — school will stay inactive until fully paid.`}
              </div>
            )}
          </section>

          <button className="btn-primary w-full gap-2 py-3" disabled={pending}>
            {pending
              ? <><Loader2 size={17} className="animate-spin"/> Creating school…</>
              : <><School size={17}/> {willActivate ? 'Enrol & activate school' : 'Enrol school (pending payment)'}</>}
          </button>
        </form>
      )}
    </div>
  );
}
