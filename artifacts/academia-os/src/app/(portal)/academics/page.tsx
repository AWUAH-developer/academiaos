import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { ClipboardEdit, Save, Send } from 'lucide-react';
import { redirect } from 'next/navigation';
import { saveAcademicAction } from '@/app/actions/academics';
import { EmptyState } from '@/components/EmptyState';
import { ExportLink } from '@/components/ExportLink';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { academicSubmissions, academicYears, classes, learners, subjects, terms, users } from '@/db/schema';
import { teachingScope, teachingScopeCondition, visibleLearnerIds } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Academic results' };
export const dynamic = 'force-dynamic';

function statusStyle(status: string) {
  if (status === 'LOCKED') return 'bg-emerald-100 text-emerald-800';
  if (['RETURNED', 'REJECTED', 'REOPENED'].includes(status)) return 'bg-rose-100 text-rose-800';
  if (status === 'UNDER_REVIEW') return 'bg-blue-100 text-blue-800';
  if (status === 'DRAFT') return 'bg-slate-100 text-slate-700';
  return 'bg-amber-100 text-amber-800';
}

export default async function AcademicsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  if (!canAccess(user.role, 'academics')) redirect('/dashboard');
  const schoolId = await getActiveSchoolId(user);
  const params = await searchParams;
  const learnerScope = await visibleLearnerIds(user);

  const [learnerRows, classRows, subjectRows, years, termRows] = await Promise.all([
    db.select({ learner: learners, className: classes.name, stream: classes.stream }).from(learners).leftJoin(classes, eq(learners.classId, classes.id)).where(and(eq(learners.schoolId, schoolId), eq(learners.status, 'ACTIVE'))).orderBy(asc(classes.name), asc(learners.firstName)),
    db.select().from(classes).where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true))).orderBy(asc(classes.name), asc(classes.stream)),
    db.select().from(subjects).where(and(eq(subjects.schoolId, schoolId), eq(subjects.isActive, true))).orderBy(asc(subjects.name)),
    db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)).orderBy(desc(academicYears.startsOn)),
    db.select().from(terms).where(eq(terms.schoolId, schoolId)).orderBy(desc(terms.startsOn))
  ]);

  const conditions = [eq(academicSubmissions.schoolId, schoolId)];
  // HEADTEACHER has no school-wide monitoring: only submissions for their own class+subject assignments.
  if (user.role === 'HEADTEACHER') {
    const scope = await teachingScope(user.id, schoolId);
    conditions.push(teachingScopeCondition(scope, academicSubmissions.classId, academicSubmissions.subjectId) ?? eq(academicSubmissions.id, '__none__'));
  }
  if (learnerScope !== null) {
    if (!learnerScope.length) conditions.push(eq(academicSubmissions.id, '__none__'));
    else conditions.push(inArray(academicSubmissions.learnerId, learnerScope));
    conditions.push(eq(academicSubmissions.status, 'LOCKED'));
  }
  const results = await db.select({
    result: academicSubmissions,
    learnerFirstName: learners.firstName,
    learnerLastName: learners.lastName,
    admissionNo: learners.admissionNo,
    className: classes.name,
    stream: classes.stream,
    subjectName: subjects.name,
    teacherName: users.name,
    yearName: academicYears.name,
    termName: terms.name
  }).from(academicSubmissions)
    .innerJoin(learners, eq(academicSubmissions.learnerId, learners.id))
    .innerJoin(classes, eq(academicSubmissions.classId, classes.id))
    .innerJoin(subjects, eq(academicSubmissions.subjectId, subjects.id))
    .innerJoin(users, eq(academicSubmissions.teacherId, users.id))
    .innerJoin(academicYears, eq(academicSubmissions.academicYearId, academicYears.id))
    .innerJoin(terms, eq(academicSubmissions.termId, terms.id))
    .where(and(...conditions)).orderBy(desc(academicSubmissions.updatedAt)).limit(250);

  const canEnter = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADTEACHER', 'ACADEMIC_ADMIN', 'TEACHER'].includes(user.role);

  return <>
    <PageHeader eyebrow="Academic records" title="Scores and remarks" description="Teachers save drafts or submit marks. Reviewers check them. The proprietor gives final approval before results lock and appear on reports." action={<ExportLink type="academics" label="Export results"/>} />
    <FlashMessage success={params.success} error={params.error} />

    {canEnter && <section className="paper-card p-5 sm:p-6">
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-chalk-50 text-chalk-700"><ClipboardEdit size={21}/></div><div><h2 className="font-black text-slate-900">Enter a learner result</h2><p className="text-xs text-slate-500">The four score fields must total 100 or less.</p></div></div>
      <form action={saveAcademicAction} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2"><label className="label">Learner</label><select className="input" name="learnerId" required defaultValue=""><option value="" disabled>Select learner</option>{learnerRows.map(({ learner, className, stream }) => <option key={learner.id} value={learner.id}>{learner.admissionNo} | {learner.firstName} {learner.lastName} | {className} {stream}</option>)}</select></div>
        <div><label className="label">Class</label><select className="input" name="classId" required defaultValue=""><option value="" disabled>Select class</option>{classRows.map(c => <option key={c.id} value={c.id}>{c.name} {c.stream}</option>)}</select></div>
        <div><label className="label">Subject</label><select className="input" name="subjectId" required defaultValue=""><option value="" disabled>Select subject</option>{subjectRows.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="label">Academic year</label><select className="input" name="academicYearId" required>{years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></div>
        <div><label className="label">Term</label><select className="input" name="termId" required>{termRows.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className="label">Classwork</label><input className="input" name="classworkScore" type="number" min="0" max="100" step="0.01" required /></div>
        <div><label className="label">Homework</label><input className="input" name="homeworkScore" type="number" min="0" max="100" step="0.01" required /></div>
        <div><label className="label">Test</label><input className="input" name="testScore" type="number" min="0" max="100" step="0.01" required /></div>
        <div><label className="label">Examination</label><input className="input" name="examScore" type="number" min="0" max="100" step="0.01" required /></div>
        <div className="sm:col-span-2"><label className="label">Teacher remark</label><input className="input" name="teacherRemark" placeholder="Academic remark" /></div>
        <div><label className="label">Conduct remark</label><input className="input" name="conductRemark" placeholder="Conduct" /></div>
        <div><label className="label">Class teacher remark</label><input className="input" name="classTeacherRemark" placeholder="Class teacher comment" /></div>
        <button className="btn-secondary sm:col-span-1 xl:col-span-2" name="mode" value="DRAFT"><Save size={17}/> Save draft</button>
        <button className="btn-primary sm:col-span-1 xl:col-span-2" name="mode" value="SUBMIT"><Send size={17}/> Submit for review</button>
      </form>
    </section>}

    <section className="paper-card mt-6 overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black text-slate-900">Academic records</h2><p className="mt-1 text-xs text-slate-500">Parents and learners only see proprietor-approved, locked results.</p></div>
      {results.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Learner</th><th>Subject</th><th>Scores</th><th>Total</th><th>Teacher</th><th>Status</th></tr></thead><tbody className="divide-y divide-slate-100">{results.map(({ result, learnerFirstName, learnerLastName, admissionNo, className, stream, subjectName, teacherName, yearName, termName }) => <tr key={result.id}>
        <td><p className="font-black text-slate-900">{learnerFirstName} {learnerLastName}</p><p className="text-xs text-slate-500">{admissionNo} | {className} {stream}</p></td>
        <td><p className="font-bold">{subjectName}</p><p className="text-xs text-slate-500">{yearName} | {termName}</p></td>
        <td className="whitespace-nowrap text-xs">CW {result.classworkScore} | HW {result.homeworkScore} | Test {result.testScore} | Exam {result.examScore}</td>
        <td><p className="text-lg font-black text-slate-950">{result.totalScore.toFixed(1)}</p><p className="text-xs font-bold text-slate-500">Grade {result.grade}{result.position ? ` | Position ${result.position}` : ''}</p></td>
        <td><p>{teacherName}</p><p className="max-w-60 truncate text-xs text-slate-500">{result.teacherRemark || 'No remark'}</p></td>
        <td><span className={`status-pill ${statusStyle(result.status)}`}>{result.status.replaceAll('_', ' ')}</span>{result.rejectionReason && <p className="mt-1 max-w-56 text-xs text-rose-700">{result.rejectionReason}</p>}</td>
      </tr>)}</tbody></table></div> : <div className="p-5"><EmptyState title="No academic records" text="Enter the first result or wait for approved results to become available." /></div>}
    </section>
  </>;
}
