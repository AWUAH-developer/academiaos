import { and, asc, desc, eq, isNotNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { Download, Printer } from 'lucide-react';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import {
  classes, feeCharges, feeFollowUps, financialAdjustments, guardians, learnerGuardians, learners, payments,
} from '@/db/schema';
import { recordFeeFollowUpAction, sendFeeReminderAction } from '@/app/actions/fees';
import { requireUser } from '@/lib/auth';
import { calculateFinancialBalance } from '@/lib/financial-balance';
import { computePaymentStatus } from '@/lib/fees';
import { canViewFeeArrears, canRecordFeeFollowUp, canSendFeeReminder, canRecordPayments } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Fee Arrears' };
export const dynamic = 'force-dynamic';

const PLAN_LABEL: Record<string, string> = { FULL_FEE: 'Full Fee', HALF_FEE: 'Half Fee', DAILY_FEE: 'Daily Fee', INSTALLMENT: 'Installment' };
const STATUS_COLOUR: Record<string, string> = { UNPAID: 'bg-rose-100 text-rose-800', PARTIALLY_PAID: 'bg-amber-100 text-amber-800', FULLY_PAID: 'bg-emerald-100 text-emerald-800', CREDIT_BALANCE: 'bg-sky-100 text-sky-800' };
const OUTCOME_LABEL: Record<string, string> = { CONTACTED: 'Contacted', PROMISED_PAYMENT: 'Promised payment', PARTIALLY_RESOLVED: 'Partially resolved', UNREACHABLE: 'Unreachable', DISPUTED: 'Disputed', REFERRED_TO_MANAGEMENT: 'Referred to management' };
const METHOD_LABEL: Record<string, string> = { PHONE: 'Phone', SMS: 'SMS', WHATSAPP: 'WhatsApp', EMAIL: 'Email', IN_PERSON: 'In person' };

function daysOverdue(charges: { dueDate: Date | null; status: string }[]): number | null {
  const open = charges.filter((c) => c.status !== 'PAID' && c.dueDate);
  if (!open.length) return null;
  const earliest = open.reduce((min, c) => c.dueDate! < min ? c.dueDate! : min, open[0].dueDate!);
  return Math.max(0, Math.floor((Date.now() - earliest.getTime()) / 86400000));
}

function agingBucket(days: number | null): string {
  if (days === null) return 'No due date';
  if (days <= 0) return 'Current';
  if (days <= 30) return '1–30 days';
  if (days <= 60) return '31–60 days';
  if (days <= 90) return '61–90 days';
  return 'Over 90 days';
}

export default async function FeeArrearsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; classId?: string; feePlan?: string; status?: string;
    minAmount?: string; maxAmount?: string; followUpStatus?: string;
    followUpFor?: string; success?: string; error?: string;
  }>;
}) {
  const user = await requireUser();
  if (!canViewFeeArrears(user.role)) redirect('/dashboard');
  const schoolId = await getActiveSchoolId(user);
  const params = await searchParams;
  const currency = user.school?.currency ?? 'GHS';

  // ── Load all data in bulk ─────────────────────────────────────────────────
  const [learnerRows, chargeRows, paymentRows, adjustmentRows, guardianLinks, followUpRows, classRows] = await Promise.all([
    db.select({ learner: learners, className: classes.name, stream: classes.stream })
      .from(learners)
      .leftJoin(classes, eq(learners.classId, classes.id))
      .where(and(eq(learners.schoolId, schoolId), eq(learners.status, 'ACTIVE')))
      .orderBy(asc(classes.name), asc(learners.firstName)),
    db.select({ learnerId: feeCharges.learnerId, amount: feeCharges.amount, paidAmount: feeCharges.paidAmount, status: feeCharges.status, dueDate: feeCharges.dueDate, createdAt: feeCharges.createdAt })
      .from(feeCharges).where(eq(feeCharges.schoolId, schoolId)),
    db.select({ learnerId: payments.learnerId, amount: payments.amount, createdAt: payments.createdAt })
      .from(payments).where(eq(payments.schoolId, schoolId)).orderBy(desc(payments.createdAt)),
    db.select({ learnerId: financialAdjustments.learnerId, type: financialAdjustments.type, amount: financialAdjustments.amount })
      .from(financialAdjustments).where(and(eq(financialAdjustments.schoolId, schoolId), isNotNull(financialAdjustments.approvedAt))),
    db.select({ learnerId: learnerGuardians.learnerId, guardianName: guardians.name, guardianPhone: guardians.phone, isPrimary: learnerGuardians.isPrimary })
      .from(learnerGuardians).innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
      .where(eq(guardians.schoolId, schoolId)),
    db.select().from(feeFollowUps).where(eq(feeFollowUps.schoolId, schoolId)).orderBy(desc(feeFollowUps.createdAt)),
    db.select({ id: classes.id, name: classes.name, stream: classes.stream }).from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true))).orderBy(asc(classes.name)),
  ]);

  // ── Index by learner ──────────────────────────────────────────────────────
  const chargesMap = new Map<string, typeof chargeRows>();
  for (const c of chargeRows) { const list = chargesMap.get(c.learnerId) ?? []; list.push(c); chargesMap.set(c.learnerId, list); }
  const paymentsMap = new Map<string, typeof paymentRows>();
  for (const p of paymentRows) { const list = paymentsMap.get(p.learnerId) ?? []; list.push(p); paymentsMap.set(p.learnerId, list); }
  const adjustmentsMap = new Map<string, typeof adjustmentRows>();
  for (const a of adjustmentRows) { const list = adjustmentsMap.get(a.learnerId) ?? []; list.push(a); adjustmentsMap.set(a.learnerId, list); }
  const guardiansMap = new Map<string, typeof guardianLinks>();
  for (const g of guardianLinks) { const list = guardiansMap.get(g.learnerId) ?? []; list.push(g); guardiansMap.set(g.learnerId, list); }
  const followUpsMap = new Map<string, typeof followUpRows>();
  for (const f of followUpRows) { const list = followUpsMap.get(f.learnerId) ?? []; list.push(f); followUpsMap.set(f.learnerId, list); }

  // ── Compute financial summary per learner ────────────────────────────────
  const rows = learnerRows.map(({ learner, className, stream }) => {
    const charges = chargesMap.get(learner.id) ?? [];
    const pays = paymentsMap.get(learner.id) ?? [];
    const adjs = adjustmentsMap.get(learner.id) ?? [];
    const totalCharges = charges.reduce((s, c) => s + Number(c.amount), 0);
    const totalPayments = pays.reduce((s, p) => s + Number(p.amount), 0);
    const trueBalance = calculateFinancialBalance({ totalCharges, totalPayments, adjustments: adjs.map((a) => ({ type: a.type, amount: a.amount })) });
    const outstanding = Math.max(0, trueBalance);
    const carryForward = Math.max(0, -trueBalance);
    const status = computePaymentStatus({ trueBalance, totalCharges, totalPayments });
    const lastPayment = pays[0]?.createdAt ?? null;
    const overdue = daysOverdue(charges);
    const primaryGuardian = (guardiansMap.get(learner.id) ?? []).find((g) => g.isPrimary) ?? (guardiansMap.get(learner.id) ?? [])[0] ?? null;
    const latestFollowUp = (followUpsMap.get(learner.id) ?? [])[0] ?? null;
    return { learner, className: `${className ?? ''}${stream ? ` ${stream}` : ''}`, totalCharges, totalPayments, outstanding, carryForward, status, lastPayment, overdue, primaryGuardian, latestFollowUp };
  });

  // ── Apply filters ─────────────────────────────────────────────────────────
  const q = params.q?.toLowerCase().trim() ?? '';
  const filtered = rows.filter((r) => {
    if (r.status === 'FULLY_PAID' && r.carryForward === 0) return false; // only show learners with amounts outstanding or credit
    if (r.outstanding === 0 && r.carryForward === 0 && r.totalCharges === 0) return false; // no fee activity
    if (q && !`${r.learner.firstName} ${r.learner.lastName} ${r.learner.admissionNo}`.toLowerCase().includes(q) &&
        !`${r.primaryGuardian?.guardianName ?? ''} ${r.primaryGuardian?.guardianPhone ?? ''}`.toLowerCase().includes(q)) return false;
    if (params.classId && r.learner.classId !== params.classId) return false;
    if (params.feePlan && r.learner.paymentPlan !== params.feePlan) return false;
    if (params.status && r.status !== params.status) return false;
    if (params.minAmount && r.outstanding < Number(params.minAmount)) return false;
    if (params.maxAmount && r.outstanding > Number(params.maxAmount)) return false;
    if (params.followUpStatus && r.latestFollowUp?.outcome !== params.followUpStatus) return false;
    return true;
  });

  // ── Ageing summary ────────────────────────────────────────────────────────
  const ageing: Record<string, { count: number; total: number }> = {};
  for (const r of filtered.filter((r) => r.outstanding > 0)) {
    const bucket = agingBucket(r.overdue);
    ageing[bucket] = ageing[bucket] ?? { count: 0, total: 0 };
    ageing[bucket].count++;
    ageing[bucket].total += r.outstanding;
  }
  const totalOutstanding = filtered.reduce((s, r) => s + r.outstanding, 0);
  const mayDecide = canRecordFeeFollowUp(user.role);
  const mayRemind = canSendFeeReminder(user.role);
  const followUpFor = params.followUpFor ?? '';

  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  return <>
    <PageHeader eyebrow="Finance" title="Fee Arrears" description={`Outstanding fees across all active learners. ${filtered.length} learner${filtered.length !== 1 ? 's' : ''} with fee activity.`} action={
      <div className="flex gap-2 flex-wrap">
        <a className="btn-secondary whitespace-nowrap text-sm" href="/api/export/fee-arrears"><Download size={15}/> Export CSV</a>
        <button className="btn-secondary whitespace-nowrap text-sm" onClick={() => {}} type="button"><Printer size={15}/> Print</button>
      </div>
    }/>
    <FlashMessage success={params.success} error={params.error}/>

    {/* Filters */}
    <section className="paper-card p-4 mb-5">
      <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <input className="input" name="q" placeholder="Learner name, admission no. or guardian" defaultValue={params.q ?? ''}/>
        <select className="input" name="classId" defaultValue={params.classId ?? ''}>
          <option value="">All classes</option>
          {classRows.map((c) => <option key={c.id} value={c.id}>{c.name}{c.stream ? ` ${c.stream}` : ''}</option>)}
        </select>
        <select className="input" name="feePlan" defaultValue={params.feePlan ?? ''}>
          <option value="">All fee plans</option>
          {Object.entries(PLAN_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input" name="status" defaultValue={params.status ?? ''}>
          <option value="">All statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially paid</option>
          <option value="CREDIT_BALANCE">Credit balance</option>
        </select>
        <input className="input" name="minAmount" type="number" step="0.01" placeholder="Min outstanding" defaultValue={params.minAmount ?? ''}/>
        <input className="input" name="maxAmount" type="number" step="0.01" placeholder="Max outstanding" defaultValue={params.maxAmount ?? ''}/>
        <select className="input" name="followUpStatus" defaultValue={params.followUpStatus ?? ''}>
          <option value="">Any follow-up status</option>
          {Object.entries(OUTCOME_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit">Apply filters</button>
          <a className="btn-secondary px-3" href="/fee-arrears">Reset</a>
        </div>
      </form>
    </section>

    {/* Ageing summary */}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-5">
      {[
        { label: 'Total outstanding', value: fmt(totalOutstanding), colour: 'text-rose-700' },
        { label: '1–30 days overdue', value: fmt(ageing['1–30 days']?.total ?? 0), colour: 'text-amber-700' },
        { label: '31–90 days overdue', value: fmt((ageing['31–60 days']?.total ?? 0) + (ageing['61–90 days']?.total ?? 0)), colour: 'text-orange-700' },
        { label: 'Over 90 days overdue', value: fmt(ageing['Over 90 days']?.total ?? 0), colour: 'text-rose-800' },
      ].map((c) => (
        <div key={c.label} className="paper-card p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{c.label}</p>
          <p className={`mt-1 text-xl font-black font-mono ${c.colour}`}>{c.value}</p>
        </div>
      ))}
    </div>

    {/* Main table */}
    <section className="paper-card overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-black">Fee arrears list</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Learner</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-right">Charged</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Overdue</th>
              <th className="px-4 py-3 text-left">Guardian</th>
              <th className="px-4 py-3 text-left">Last follow-up</th>
              {mayDecide && <th className="px-4 py-3 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const isFollowingUp = followUpFor === r.learner.id;
              return <>
                <tr key={r.learner.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3">
                    <p className="font-black">{r.learner.firstName} {r.learner.lastName}</p>
                    <p className="text-xs text-slate-500">{r.learner.admissionNo}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.className || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{PLAN_LABEL[r.learner.paymentPlan] ?? r.learner.paymentPlan}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(r.totalCharges)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(r.totalPayments)}</td>
                  <td className="px-4 py-3 text-right font-mono font-black">{fmt(r.outstanding)}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.carryForward > 0 ? fmt(r.carryForward) : '—'}</td>
                  <td className="px-4 py-3"><span className={`status-pill ${STATUS_COLOUR[r.status]}`}>{r.status.replaceAll('_',' ')}</span></td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.overdue !== null ? (
                      <span className={r.overdue > 90 ? 'text-rose-700 font-black' : r.overdue > 30 ? 'text-orange-700' : 'text-slate-600'}>{r.overdue === 0 ? 'Current' : `${r.overdue}d`}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.primaryGuardian ? (
                      <div><p className="font-medium">{r.primaryGuardian.guardianName}</p><p className="text-xs text-slate-500">{r.primaryGuardian.guardianPhone}</p></div>
                    ) : <span className="text-slate-400">None</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.latestFollowUp ? (
                      <div>
                        <span className="status-pill bg-slate-100 text-slate-700 text-xs">{OUTCOME_LABEL[r.latestFollowUp.outcome] ?? r.latestFollowUp.outcome}</span>
                        <p className="text-xs text-slate-400 mt-1">{METHOD_LABEL[r.latestFollowUp.contactMethod] ?? r.latestFollowUp.contactMethod} · {r.latestFollowUp.createdAt.toLocaleDateString('en-GB')}</p>
                        {r.latestFollowUp.nextFollowUpDate && <p className="text-xs text-amber-600 mt-1">Next: {r.latestFollowUp.nextFollowUpDate.toLocaleDateString('en-GB')}</p>}
                      </div>
                    ) : <span className="text-slate-400 text-xs">No follow-up</span>}
                  </td>
                  {mayDecide && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <a className="btn-secondary text-xs py-1 px-2" href={`/fee-arrears?followUpFor=${r.learner.id}`}>Follow up</a>
                        {mayRemind && r.outstanding > 0 && (
                          <form action={sendFeeReminderAction}>
                            <input type="hidden" name="learnerId" value={r.learner.id}/>
                            <input type="hidden" name="outstanding" value={r.outstanding.toFixed(2)}/>
                            <input type="hidden" name="learnerName" value={`${r.learner.firstName} ${r.learner.lastName}`}/>
                            <button className="btn-secondary text-xs py-1 px-2">Send reminder</button>
                          </form>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
                {isFollowingUp && mayDecide && (
                  <tr key={`${r.learner.id}-fu`} className="bg-amber-50">
                    <td colSpan={mayDecide ? 12 : 11} className="px-4 py-4">
                      <div className="max-w-2xl">
                        <p className="font-black mb-3">Record follow-up — {r.learner.firstName} {r.learner.lastName}</p>
                        <form action={recordFeeFollowUpAction} className="grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="learnerId" value={r.learner.id}/>
                          <div><label className="label">Contact method</label>
                            <select className="input" name="contactMethod" required>
                              {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </div>
                          <div><label className="label">Outcome</label>
                            <select className="input" name="outcome" required>
                              {Object.entries(OUTCOME_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </div>
                          <div className="sm:col-span-2"><label className="label">Note</label>
                            <textarea className="input min-h-16 w-full" name="note" placeholder="Optional details about the conversation or follow-up outcome"/>
                          </div>
                          <div><label className="label">Promised payment date</label><input className="input" name="promisedPaymentDate" type="date"/></div>
                          <div><label className="label">Next follow-up date</label><input className="input" name="nextFollowUpDate" type="date"/></div>
                          <div className="sm:col-span-2 flex gap-2">
                            <button className="btn-primary">Save follow-up</button>
                            <a className="btn-secondary" href="/fee-arrears">Cancel</a>
                          </div>
                        </form>
                      </div>
                    </td>
                  </tr>
                )}
              </>;
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={mayDecide ? 12 : 11} className="px-4 py-8 text-center text-slate-400">No learners with outstanding fee balances match the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  </>;
}
