import { and, asc, desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { academicSubmissions, academicYears, classes, learnerPromotions, learners, promotionPolicies, subjects, users } from '@/db/schema';
import { batchApprovePromotionsAction, recordPromotionDecisionAction, savePromotionPolicyAction } from '@/app/actions/academics';
import { requireUser } from '@/lib/auth';
import { canViewPromotion, canDecidePromotion, canApprovePromotion, canConfigurePromotionPolicy } from '@/lib/permissions';
import { computePromotionRecommendation, DEFAULT_POLICY, DECISION_LABEL, RECOMMENDATION_LABEL, SUBJECT_PASS_MARK } from '@/lib/promotion';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Learner Promotion' };
export const dynamic = 'force-dynamic';

export default async function PromotionPage({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string; success?: string; error?: string }>;
}) {
  const user = await requireUser();
  if (!canViewPromotion(user.role)) redirect('/dashboard');
  const schoolId = await getActiveSchoolId(user);
  const params = await searchParams;
  const selectedYearId = params.yearId ?? '';

  const [yearRows, classRows, subjectRows, policyRow] = await Promise.all([
    db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)).orderBy(desc(academicYears.startsOn)),
    db.select().from(classes).where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true))).orderBy(asc(classes.name), asc(classes.stream)),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(and(eq(subjects.schoolId, schoolId), eq(subjects.isActive, true))).orderBy(asc(subjects.name)),
    db.select().from(promotionPolicies).where(eq(promotionPolicies.schoolId, schoolId)).limit(1).then((r) => r[0] ?? null),
  ]);

  const activePolicy = policyRow
    ? { minAnnualAverage: Number(policyRow.minAnnualAverage), minSubjectsPassed: policyRow.minSubjectsPassed, compulsorySubjectIds: (policyRow.compulsorySubjectIds as string[] | null) ?? [], minAttendancePct: policyRow.minAttendancePct !== null ? Number(policyRow.minAttendancePct) : null, incompleteResultsBlock: policyRow.incompleteResultsBlock }
    : DEFAULT_POLICY;

  const selectedYear = yearRows.find((y) => y.id === selectedYearId);

  // ── Policy config panel (Super Admin only) ──────────────────────────────────
  const policyPanel = canConfigurePromotionPolicy(user.role) ? (
    <section className="paper-card p-5 mb-6">
      <h2 className="font-black mb-1">Promotion policy</h2>
      <p className="text-xs text-slate-500 mb-4">These thresholds are used to calculate the system recommendation for every learner.</p>
      <form action={savePromotionPolicyAction} className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Minimum annual average (%)</label><input className="input" name="minAnnualAverage" type="number" min="0" max="100" step="0.01" defaultValue={activePolicy.minAnnualAverage} required/></div>
        <div><label className="label">Minimum subjects passed</label><input className="input" name="minSubjectsPassed" type="number" min="0" step="1" defaultValue={activePolicy.minSubjectsPassed} required/></div>
        <div><label className="label">Minimum attendance (%)</label><input className="input" name="minAttendancePct" type="number" min="0" max="100" step="0.01" defaultValue={activePolicy.minAttendancePct ?? ''} placeholder="Leave blank to skip"/></div>
        <div className="sm:col-span-3">
          <label className="label">Block promotion on incomplete results?</label>
          <select className="input" name="incompleteResultsBlock">
            <option value="true" selected={activePolicy.incompleteResultsBlock}>Yes — block if any result is not yet approved</option>
            <option value="false" selected={!activePolicy.incompleteResultsBlock}>No — allow recommendation even with pending results</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="label">Compulsory subjects (must individually pass)</label>
          <select className="input min-h-24 w-full" name="compulsorySubjectIds" multiple>
            {subjectRows.map((s) => <option key={s.id} value={s.id} selected={activePolicy.compulsorySubjectIds.includes(s.id)}>{s.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-400">Hold Ctrl / Cmd to select multiple.</p>
        </div>
        <div className="sm:col-span-3"><button className="btn-primary">Save promotion policy</button></div>
      </form>
    </section>
  ) : null;

  // ── Year selector ────────────────────────────────────────────────────────────
  if (!selectedYear) {
    return <>
      <PageHeader eyebrow="Academic management" title="Learner promotion" description="Review end-of-year results and manage promotion, repetition and graduation decisions." />
      <FlashMessage success={params.success} error={params.error} />
      {policyPanel}
      <section className="paper-card p-5">
        <h2 className="font-black mb-3">Select academic year</h2>
        <form className="flex gap-3 flex-wrap">
          <select className="input flex-1" name="yearId" defaultValue="">
            <option value="">Select academic year</option>
            {yearRows.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
          <button className="btn-primary" type="submit">Open promotion list</button>
        </form>
      </section>
    </>;
  }

  // ── Load learners, submissions and existing decisions ────────────────────────
  const [learnerRows, submissions, promotionRecords, deciderRows] = await Promise.all([
    db.select({ learner: learners, className: classes.name, stream: classes.stream })
      .from(learners)
      .leftJoin(classes, eq(learners.classId, classes.id))
      .where(and(eq(learners.schoolId, schoolId), eq(learners.status, 'ACTIVE')))
      .orderBy(asc(classes.name), asc(learners.firstName)),
    db.select({ learnerId: academicSubmissions.learnerId, subjectId: academicSubmissions.subjectId, totalScore: academicSubmissions.totalScore, status: academicSubmissions.status })
      .from(academicSubmissions)
      .where(and(eq(academicSubmissions.schoolId, schoolId), eq(academicSubmissions.academicYearId, selectedYearId))),
    db.select().from(learnerPromotions)
      .where(and(eq(learnerPromotions.schoolId, schoolId), eq(learnerPromotions.academicYearId, selectedYearId))),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.schoolId, schoolId)),
  ]);

  const promotionMap = new Map(promotionRecords.map((r) => [r.learnerId, r]));
  const deciderMap = new Map(deciderRows.map((u) => [u.id, u.name]));

  const subsByLearner = new Map<string, typeof submissions>();
  for (const s of submissions) {
    const list = subsByLearner.get(s.learnerId) ?? [];
    list.push(s);
    subsByLearner.set(s.learnerId, list);
  }

  const rows = learnerRows
    .filter((r) => r.learner.classId) // skip unclassed learners
    .map(({ learner, className, stream }) => {
      const subs = subsByLearner.get(learner.id) ?? [];
      const locked = subs.filter((s) => s.status === 'LOCKED');
      const hasIncomplete = subs.some((s) => !['LOCKED','REJECTED'].includes(s.status));
      const annualAverage = locked.length > 0 ? locked.reduce((sum, s) => sum + Number(s.totalScore), 0) / locked.length : 0;
      const subjectsPassed = locked.filter((s) => Number(s.totalScore) >= SUBJECT_PASS_MARK).length;
      const compulsoryResults: Record<string, number | null> = {};
      for (const id of activePolicy.compulsorySubjectIds) { const s = locked.find((x) => x.subjectId === id); compulsoryResults[id] = s ? Number(s.totalScore) : null; }
      const summary = { learnerId: learner.id, totalSubjects: subs.length, approvedSubjects: locked.length, annualAverage, subjectsPassed, compulsorySubjectResults: compulsoryResults, attendancePct: null as null, hasIncompleteResults: hasIncomplete };
      const recommendation = computePromotionRecommendation(summary, activePolicy, false);
      const record = promotionMap.get(learner.id);
      return { learner, className: `${className ?? ''}${stream ? ` ${stream}` : ''}`, summary, recommendation, record };
    });

  // Summary counts
  const counts = { eligible: 0, repeat: 0, incomplete: 0, graduation: 0, decided: 0, approved: 0 };
  for (const r of rows) {
    if (r.recommendation === 'ELIGIBLE_FOR_PROMOTION') counts.eligible++;
    else if (r.recommendation === 'REPEAT_RECOMMENDED') counts.repeat++;
    else if (r.recommendation === 'INCOMPLETE_RESULTS') counts.incomplete++;
    else if (r.recommendation === 'GRADUATION_ELIGIBLE') counts.graduation++;
    if (r.record?.decision) counts.decided++;
    if (r.record?.approvedAt) counts.approved++;
  }

  const pendingApproval = promotionRecords.filter((r) => r.decision && r.decision !== 'DEFERRED' && !r.approvedAt).length;

  const recColour: Record<string, string> = {
    ELIGIBLE_FOR_PROMOTION: 'bg-emerald-100 text-emerald-800',
    GRADUATION_ELIGIBLE:    'bg-sky-100 text-sky-800',
    REPEAT_RECOMMENDED:     'bg-amber-100 text-amber-800',
    INCOMPLETE_RESULTS:     'bg-rose-100 text-rose-800',
  };
  const decColour: Record<string, string> = {
    PROMOTED:       'bg-emerald-100 text-emerald-800',
    FORCE_PROMOTED: 'bg-orange-100 text-orange-800',
    GRADUATED:      'bg-sky-100 text-sky-800',
    REPEAT:         'bg-amber-100 text-amber-800',
    DEFERRED:       'bg-slate-100 text-slate-700',
  };

  const mayDecide = canDecidePromotion(user.role);
  const mayApprove = canApprovePromotion(user.role);

  return <>
    <PageHeader eyebrow="Academic management" title="Learner promotion" description={`${selectedYear.name} · ${rows.length} active learner${rows.length !== 1 ? 's' : ''}`} action={
      <form className="flex gap-2 flex-wrap">
        <select className="input text-sm" name="yearId" defaultValue={selectedYearId}>
          {yearRows.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <button className="btn-secondary text-sm" type="submit">Change year</button>
      </form>
    }/>
    <FlashMessage success={params.success} error={params.error}/>

    {policyPanel}

    {/* Summary cards */}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      {[
        { label: 'Eligible for promotion', value: counts.eligible, colour: 'text-emerald-700' },
        { label: 'Repeat recommended', value: counts.repeat, colour: 'text-amber-700' },
        { label: 'Incomplete results', value: counts.incomplete, colour: 'text-rose-700' },
        { label: 'Decisions recorded', value: `${counts.decided} / ${rows.length}`, colour: 'text-slate-700' },
      ].map((c) => (
        <div key={c.label} className="paper-card p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{c.label}</p>
          <p className={`mt-1 text-2xl font-black ${c.colour}`}>{c.value}</p>
        </div>
      ))}
    </div>

    {/* Batch approve panel */}
    {mayApprove && pendingApproval > 0 && (
      <section className="paper-card p-4 mb-6 border-l-4 border-emerald-500">
        <p className="font-black">{pendingApproval} decision{pendingApproval !== 1 ? 's' : ''} ready for final approval</p>
        <p className="text-xs text-slate-500 mt-1 mb-3">Approving will update each learner&apos;s class record. This action is recorded in the audit log and cannot be automatically reversed.</p>
        <form action={batchApprovePromotionsAction}>
          <input type="hidden" name="academicYearId" value={selectedYearId}/>
          <button className="btn-primary">Apply all approved promotions</button>
        </form>
      </section>
    )}

    {/* Learner list */}
    <section className="paper-card overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
        <h2 className="font-black">Promotion list</h2>
        <span className="text-xs text-slate-500">{counts.approved} applied · policy: average ≥ {activePolicy.minAnnualAverage}%, ≥ {activePolicy.minSubjectsPassed} subjects passed</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Learner</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-right">Avg</th>
              <th className="px-4 py-3 text-right">Passed</th>
              <th className="px-4 py-3 text-left">Recommendation</th>
              <th className="px-4 py-3 text-left">Decision</th>
              {mayDecide && <th className="px-4 py-3 text-left">Record decision</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ learner, className, summary, recommendation, record }) => (
              <tr key={learner.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-black">{learner.firstName} {learner.lastName}</p>
                  <p className="text-xs text-slate-500">{learner.admissionNo}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{className || '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{summary.approvedSubjects > 0 ? summary.annualAverage.toFixed(1) : '—'}</td>
                <td className="px-4 py-3 text-right">{summary.approvedSubjects > 0 ? `${summary.subjectsPassed}/${summary.approvedSubjects}` : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`status-pill ${recColour[recommendation]}`}>{RECOMMENDATION_LABEL[recommendation]}</span>
                  {summary.hasIncompleteResults && <span className="ml-1 text-xs text-amber-600">pending results</span>}
                </td>
                <td className="px-4 py-3">
                  {record?.decision ? (
                    <div>
                      <span className={`status-pill ${decColour[record.decision]}`}>{DECISION_LABEL[record.decision as keyof typeof DECISION_LABEL]}</span>
                      {record.approvedAt && <span className="ml-1 text-xs text-emerald-600">✓ applied</span>}
                      {record.decidedBy && <p className="text-xs text-slate-400 mt-1">by {deciderMap.get(record.decidedBy) ?? record.decidedBy}</p>}
                      {record.reason && <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{record.reason}&rdquo;</p>}
                    </div>
                  ) : <span className="text-slate-400">Pending</span>}
                </td>
                {mayDecide && (
                  <td className="px-4 py-3">
                    {!record?.approvedAt ? (
                      <form action={recordPromotionDecisionAction} className="space-y-2 min-w-60">
                        <input type="hidden" name="learnerId" value={learner.id}/>
                        <input type="hidden" name="academicYearId" value={selectedYearId}/>
                        <select className="input text-xs" name="decision" required defaultValue={record?.decision ?? ''}>
                          <option value="">Select decision</option>
                          <option value="PROMOTED">Promote to next class</option>
                          <option value="REPEAT">Repeat current class</option>
                          <option value="FORCE_PROMOTED">Force promote (reason required)</option>
                          <option value="GRADUATED">Mark as graduated</option>
                          <option value="DEFERRED">Defer decision</option>
                        </select>
                        <select className="input text-xs" name="toClassId" defaultValue={record?.toClassId ?? ''}>
                          <option value="">No class change / graduated</option>
                          {classRows.map((c) => <option key={c.id} value={c.id}>{c.name}{c.stream ? ` ${c.stream}` : ''}</option>)}
                        </select>
                        <textarea className="input text-xs min-h-16 w-full" name="reason" placeholder="Reason (required for force promotion)" defaultValue={record?.reason ?? ''}/>
                        <button className="btn-secondary text-xs w-full">Save decision</button>
                      </form>
                    ) : <span className="text-xs text-slate-400">Decision applied</span>}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={mayDecide ? 7 : 6} className="px-4 py-8 text-center text-slate-400">No active learners found for this school.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  </>;
}
