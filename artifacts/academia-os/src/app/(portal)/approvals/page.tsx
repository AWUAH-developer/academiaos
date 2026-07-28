import { desc, eq } from 'drizzle-orm';
import { BadgeCheck, CheckCheck, RotateCcw, Undo2, XCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import { academicReviewAction, bulkProprietorApproveAction, proprietorDecisionAction, reopenAcademicAction } from '@/app/actions/academics';
import { EmptyState } from '@/components/EmptyState';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { db } from '@/db';
import { academicSubmissions, classes, learners, subjects, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { canAccess, canApproveAcademics, canReviewAcademics } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Academic approvals' };
export const dynamic = 'force-dynamic';

type ApprovalRow = {
  result: typeof academicSubmissions.$inferSelect;
  learnerFirstName: string;
  learnerLastName: string;
  admissionNo: string;
  className: string;
  stream: string;
  subjectName: string;
  teacherName: string;
};

function LearnerCell({ row }: { row: ApprovalRow }) {
  return <><b>{row.learnerFirstName} {row.learnerLastName}</b><p className="text-xs text-slate-500">{row.admissionNo} | {row.className} {row.stream}</p></>;
}

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  if (!canAccess(user.role, 'approvals')) redirect('/dashboard');
  const schoolId = await getActiveSchoolId(user); const params = await searchParams;
  const rows: ApprovalRow[] = await db.select({ result: academicSubmissions, learnerFirstName: learners.firstName, learnerLastName: learners.lastName, admissionNo: learners.admissionNo, className: classes.name, stream: classes.stream, subjectName: subjects.name, teacherName: users.name })
    .from(academicSubmissions).innerJoin(learners, eq(academicSubmissions.learnerId, learners.id)).innerJoin(classes, eq(academicSubmissions.classId, classes.id)).innerJoin(subjects, eq(academicSubmissions.subjectId, subjects.id)).innerJoin(users, eq(academicSubmissions.teacherId, users.id))
    .where(eq(academicSubmissions.schoolId, schoolId)).orderBy(desc(academicSubmissions.updatedAt)).limit(300);
  const submitted = rows.filter(r => r.result.status === 'SUBMITTED');
  const finalQueue = rows.filter(r => r.result.status === 'UNDER_REVIEW');
  const returned = rows.filter(r => ['RETURNED','REJECTED','REOPENED'].includes(r.result.status));
  const locked = rows.filter(r => r.result.status === 'LOCKED');
  const reviewer = canReviewAcademics(user.role); const proprietor = canApproveAcademics(user.role); const superAdmin = user.role === 'SUPER_ADMIN';

  return <>
    <PageHeader eyebrow="Academic control" title="Approval desk" description="Academic reviewers check teacher submissions. The proprietor gives final approval, returns or rejects records. Only SUPER_ADMIN can reopen locked results." />
    <FlashMessage success={params.success} error={params.error}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Awaiting review" value={submitted.length} note="Teacher submissions" icon={Undo2}/><StatCard label="Final approval" value={finalQueue.length} note="Ready for proprietor" icon={BadgeCheck}/><StatCard label="Returned or rejected" value={returned.length} note="Needs correction" icon={XCircle}/><StatCard label="Locked results" value={locked.length} note="Approved records" icon={CheckCheck}/></div>

    {reviewer && <section className="paper-card mt-6 overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">Academic review queue</h2><p className="mt-1 text-xs text-slate-500">Forward correct records to the proprietor or return them with a reason.</p></div>{submitted.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Learner</th><th>Subject</th><th>Total</th><th>Teacher</th><th>Review action</th></tr></thead><tbody className="divide-y divide-slate-100">{submitted.map(row => <tr key={row.result.id}><td><LearnerCell row={row}/></td><td>{row.subjectName}</td><td className="font-black">{row.result.totalScore.toFixed(1)} | {row.result.grade}</td><td>{row.teacherName}</td><td><form action={academicReviewAction} className="min-w-64 space-y-2"><input type="hidden" name="submissionId" value={row.result.id}/><input className="input min-h-9 py-1.5 text-xs" name="reason" placeholder="Reason when returning"/><div className="flex gap-2"><button className="btn-primary min-h-9 flex-1 px-2 py-1.5 text-xs" name="decision" value="FORWARD">Forward</button><button className="btn-secondary min-h-9 flex-1 px-2 py-1.5 text-xs" name="decision" value="RETURN">Return</button></div></form></td></tr>)}</tbody></table></div> : <div className="p-5"><EmptyState title="Review queue is clear" text="There are no teacher submissions waiting for academic review."/></div>}</section>}

    {proprietor && finalQueue.length > 0 && <section className="paper-card mt-6 overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">Bulk final approval</h2><p className="mt-1 text-xs text-slate-500">Select only records you have reviewed. Approval immediately locks the marks and remarks.</p></div><form action={bulkProprietorApproveAction}><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Select</th><th>Learner</th><th>Subject</th><th>Marks</th><th>Remarks</th></tr></thead><tbody className="divide-y divide-slate-100">{finalQueue.map(row => <tr key={row.result.id}><td><input type="checkbox" name="submissionIds" value={row.result.id} aria-label={`Select ${row.learnerFirstName} ${row.learnerLastName}`}/></td><td><LearnerCell row={row}/><p className="text-xs text-slate-500">Teacher: {row.teacherName}</p></td><td>{row.subjectName}</td><td className="text-xs">CW {row.result.classworkScore}, HW {row.result.homeworkScore}, Test {row.result.testScore}, Exam {row.result.examScore}<p className="mt-1 font-black">Total {row.result.totalScore.toFixed(1)} | Grade {row.result.grade}</p></td><td><p className="max-w-72 text-xs">{row.result.teacherRemark || 'No teacher remark'}</p><p className="mt-1 max-w-72 text-xs text-slate-500">{row.result.conductRemark || 'No conduct remark'}</p></td></tr>)}</tbody></table></div><div className="border-t border-slate-200 p-4"><button className="btn-primary"><CheckCheck size={17}/> Approve selected records</button></div></form></section>}

    {proprietor && <section className="paper-card mt-6 overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">Individual final decisions</h2><p className="mt-1 text-xs text-slate-500">Approve, return for correction, or reject. Returns and rejections require a reason.</p></div>{finalQueue.length ? <div className="grid gap-4 p-5 lg:grid-cols-2">{finalQueue.map(row => <article key={row.result.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><LearnerCell row={row}/><p className="mt-1 text-sm font-bold text-chalk-700">{row.subjectName}</p></div><span className="status-pill bg-amber-100 text-amber-800">{row.result.totalScore.toFixed(1)} | {row.result.grade}</span></div><div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs"><p>CW {row.result.classworkScore} | HW {row.result.homeworkScore} | Test {row.result.testScore} | Exam {row.result.examScore}</p><p className="mt-2"><b>Teacher remark:</b> {row.result.teacherRemark || 'None'}</p><p className="mt-1"><b>Conduct:</b> {row.result.conductRemark || 'None'}</p></div><form action={proprietorDecisionAction} className="mt-3 space-y-2"><input type="hidden" name="submissionId" value={row.result.id}/><input className="input" name="reason" placeholder="Required for return or rejection"/><div className="grid grid-cols-3 gap-2"><button className="btn-primary min-h-9 px-2 py-1.5 text-xs" name="decision" value="APPROVE">Approve</button><button className="btn-secondary min-h-9 px-2 py-1.5 text-xs" name="decision" value="RETURN">Return</button><button className="btn-secondary min-h-9 px-2 py-1.5 text-xs" name="decision" value="REJECT">Reject</button></div></form></article>)}</div> : <div className="p-5"><EmptyState title="Final approval queue is clear" text="No reviewed results are waiting for the proprietor."/></div>}</section>}

    {superAdmin && <section className="paper-card mt-6 overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">Locked results</h2><p className="mt-1 text-xs text-slate-500">Only SUPER_ADMIN can reopen a locked result. A written reason and audit record are required.</p></div>{locked.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Learner</th><th>Subject</th><th>Total</th><th>Reopen</th></tr></thead><tbody className="divide-y divide-slate-100">{locked.slice(0,100).map(row => <tr key={row.result.id}><td><LearnerCell row={row}/></td><td>{row.subjectName}</td><td className="font-black">{row.result.totalScore.toFixed(1)} | {row.result.grade}</td><td><form action={reopenAcademicAction} className="flex min-w-80 gap-2"><input type="hidden" name="submissionId" value={row.result.id}/><input className="input min-h-9 py-1.5 text-xs" name="reason" placeholder="Reason for reopening" required/><button className="btn-secondary min-h-9 px-3 py-1.5 text-xs"><RotateCcw size={14}/> Reopen</button></form></td></tr>)}</tbody></table></div> : <div className="p-5"><EmptyState title="No locked results" text="Approved results will appear here."/></div>}</section>}
  </>;
}
