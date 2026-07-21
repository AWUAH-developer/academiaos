import Link from 'next/link';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { FileCheck2, Printer } from 'lucide-react';
import { redirect } from 'next/navigation';
import { approveTerminalReportAction, generateTerminalReportAction } from '@/app/actions/academics';
import { EmptyState } from '@/components/EmptyState';
import { ExportLink } from '@/components/ExportLink';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { academicYears, classes, learners, terminalReports, terms } from '@/db/schema';
import { visibleLearnerIds } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import { canAccess, canApproveAcademics } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Terminal reports' }; export const dynamic = 'force-dynamic';
function statusStyle(status: string) { return status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : status === 'READY_FOR_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'; }
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser(); if (!canAccess(user.role, 'reports')) redirect('/dashboard'); const schoolId = await getActiveSchoolId(user); const params = await searchParams; const scope = await visibleLearnerIds(user);
  const [learnerRows, years, termRows] = await Promise.all([
    db.select({ learner: learners, className: classes.name, stream: classes.stream }).from(learners).leftJoin(classes, eq(learners.classId, classes.id)).where(and(eq(learners.schoolId, schoolId), eq(learners.status,'ACTIVE'))).orderBy(asc(learners.firstName)),
    db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)).orderBy(desc(academicYears.startsOn)),
    db.select().from(terms).where(eq(terms.schoolId, schoolId)).orderBy(desc(terms.startsOn))
  ]);
  const filters = [eq(terminalReports.schoolId, schoolId)];
  if (scope !== null) filters.push(scope.length ? inArray(terminalReports.learnerId, scope) : eq(terminalReports.id, '__none__'), eq(terminalReports.status, 'PUBLISHED'));
  const reports = await db.select({ report: terminalReports, learnerFirstName: learners.firstName, learnerLastName: learners.lastName, admissionNo: learners.admissionNo, className: classes.name, stream: classes.stream, yearName: academicYears.name, termName: terms.name })
    .from(terminalReports).innerJoin(learners, eq(terminalReports.learnerId, learners.id)).innerJoin(classes, eq(terminalReports.classId, classes.id)).innerJoin(academicYears, eq(terminalReports.academicYearId, academicYears.id)).innerJoin(terms, eq(terminalReports.termId, terms.id)).where(and(...filters)).orderBy(desc(terminalReports.updatedAt)).limit(250);
  const canGenerate = ['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','PROPRIETOR'].includes(user.role); const proprietor = canApproveAcademics(user.role);
  return <><PageHeader eyebrow="Academic reporting" title="Terminal reports" description="Reports are generated only from locked results. The proprietor approves the final report before parents and learners can open it." action={<ExportLink type="academics" label="Export result register"/>}/><FlashMessage success={params.success} error={params.error}/>
  {canGenerate && <section className="paper-card p-5"><h2 className="flex items-center gap-2 font-black"><FileCheck2 size={19}/> Generate report</h2><form action={generateTerminalReportAction} className="mt-4 grid gap-3 sm:grid-cols-4"><select className="input sm:col-span-2" name="learnerId" required><option value="">Select learner</option>{learnerRows.map(({learner,className,stream})=><option key={learner.id} value={learner.id}>{learner.admissionNo} | {learner.firstName} {learner.lastName} | {className} {stream}</option>)}</select><select className="input" name="academicYearId" required>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><select className="input" name="termId" required>{termRows.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button className="btn-primary sm:col-span-4">Generate from approved results</button></form></section>}
  <section className="paper-card mt-6 overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">Report register</h2></div>{reports.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Learner</th><th>Period</th><th>Status</th><th>Verification</th><th>Action</th></tr></thead><tbody className="divide-y divide-slate-100">{reports.map(({report,learnerFirstName,learnerLastName,admissionNo,className,stream,yearName,termName})=><tr key={report.id}><td><b>{learnerFirstName} {learnerLastName}</b><p className="text-xs text-slate-500">{admissionNo} | {className} {stream}</p></td><td>{yearName}<p className="text-xs text-slate-500">{termName}</p></td><td><span className={`status-pill ${statusStyle(report.status)}`}>{report.status.replaceAll('_',' ')}</span></td><td className="font-mono text-xs">{report.verificationCode}</td><td><div className="flex flex-wrap gap-2"><Link href={`/reports/${report.id}`} className="btn-secondary min-h-9 px-3 py-1.5 text-xs"><Printer size={14}/> Open</Link>{proprietor && report.status === 'READY_FOR_APPROVAL' && <form action={approveTerminalReportAction}><input type="hidden" name="reportId" value={report.id}/><button className="btn-primary min-h-9 px-3 py-1.5 text-xs">Approve and publish</button></form>}</div></td></tr>)}</tbody></table></div> : <div className="p-5"><EmptyState title="No terminal reports" text="Generate a report after the proprietor has approved and locked the learner's subject results."/></div>}</section></>;
}
