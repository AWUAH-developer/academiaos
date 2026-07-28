import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { FlashMessage } from '@/components/FlashMessage';
import { HomeworkPublishForm } from '@/components/HomeworkPublishForm';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { academicYears, classes, curriculumTopics, homework, homeworkTopics, learners, subjects, terms, users } from '@/db/schema';
import { visibleLearnerIds } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Homework' }; export const dynamic = 'force-dynamic';
export default async function HomeworkPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser(); if (!canAccess(user.role, 'homework')) redirect('/dashboard'); const schoolId = await getActiveSchoolId(user); const params = await searchParams;
  const scope = await visibleLearnerIds(user);
  const [classRows, subjectRows, years, termRows, topicRows] = await Promise.all([
    db.select().from(classes).where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true))).orderBy(asc(classes.name), asc(classes.stream)),
    db.select().from(subjects).where(and(eq(subjects.schoolId, schoolId), eq(subjects.isActive, true))).orderBy(asc(subjects.name)),
    db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)).orderBy(desc(academicYears.startsOn)),
    db.select().from(terms).where(eq(terms.schoolId, schoolId)).orderBy(desc(terms.startsOn)),
    db.select().from(curriculumTopics).where(and(eq(curriculumTopics.schoolId, schoolId), eq(curriculumTopics.isActive, true))).orderBy(asc(curriculumTopics.name))
  ]);
  let classScope: string[] | null = null;
  if (scope !== null) {
    if (scope.length) classScope = Array.from(new Set((await db.select({ classId: learners.classId }).from(learners).where(inArray(learners.id, scope))).map(r => r.classId).filter((id): id is string => Boolean(id))));
    else classScope = [];
  }
  const filters = [eq(homework.schoolId, schoolId)];
  if (classScope !== null) filters.push(classScope.length ? inArray(homework.classId, classScope) : eq(homework.id, '__none__'));
  const rows = await db.select({ assignment: homework, teacherName: users.name, className: classes.name, stream: classes.stream, subjectName: subjects.name, yearName: academicYears.name, termName: terms.name })
    .from(homework).innerJoin(users, eq(homework.teacherId, users.id)).innerJoin(classes, eq(homework.classId, classes.id)).innerJoin(subjects, eq(homework.subjectId, subjects.id)).innerJoin(academicYears, eq(homework.academicYearId, academicYears.id)).innerJoin(terms, eq(homework.termId, terms.id)).where(and(...filters)).orderBy(desc(homework.dueAt)).limit(200);
  const homeworkTopicRows = rows.length
    ? await db.select({
        homeworkId: homeworkTopics.homeworkId,
        topicName: curriculumTopics.name
      })
        .from(homeworkTopics)
        .innerJoin(
          curriculumTopics,
          eq(homeworkTopics.topicId, curriculumTopics.id)
        )
        .where(and(
          eq(homeworkTopics.schoolId, schoolId),
          inArray(
            homeworkTopics.homeworkId,
            rows.map(({ assignment }) => assignment.id)
          )
        ))
    : [];

  const topicsByHomework = new Map<string, string[]>();

  for (const item of homeworkTopicRows) {
    const current = topicsByHomework.get(item.homeworkId) || [];
    current.push(item.topicName);
    topicsByHomework.set(item.homeworkId, current);
  }

  const canCreate = ['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','TEACHER'].includes(user.role);
  return <><PageHeader eyebrow="Teaching and learning" title="Homework and class assignments" description="Publish homework by class and subject, connect it to topics taught, and include textbook pages or uploaded material. Parents and learners see assignments for their linked class."/><FlashMessage success={params.success} error={params.error}/>
  {canCreate && (
    <HomeworkPublishForm
      years={years}
      terms={termRows}
      classes={classRows}
      subjects={subjectRows}
      topics={topicRows}
    />
  )}
  <section className="paper-card mt-6 overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">Published work</h2></div>{rows.length ? <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{rows.map(({assignment,teacherName,className,stream,subjectName,yearName,termName})=><article key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-chalk-700">{subjectName}</p><h3 className="mt-1 font-black">{assignment.title}</h3></div><span className="status-pill bg-blue-100 text-blue-800">{assignment.status}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{assignment.instructions}</p><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><p><b>Topic{(topicsByHomework.get(assignment.id)?.length || 0) > 1 ? "s" : ""}:</b>{" "}{(topicsByHomework.get(assignment.id) || []).join(", ") || "Not recorded"}</p><p className="mt-1"><b>Homework source:</b>{" "}{assignment.sourceType === "BOOK" ? "Textbook / book" : assignment.sourceType === "UPLOAD" ? "Uploaded worksheet / material" : assignment.sourceType === "BOOK_AND_UPLOAD" ? "Book pages + uploaded material" : "Typed instructions / questions"}</p>{assignment.bookTitle && <p className="mt-1"><b>Book:</b> {assignment.bookTitle}</p>}{assignment.pageReference && <p className="mt-1"><b>Page(s):</b> {assignment.pageReference}</p>}</div><div className="mt-4 space-y-1 text-xs text-slate-500"><p><b>Class:</b> {className} {stream}</p><p><b>Due:</b> {assignment.dueAt.toLocaleString()}</p><p><b>Teacher:</b> {teacherName}</p><p>{yearName} | {termName}{assignment.maximumScore !== null ? ` | ${assignment.maximumScore} marks` : ''}</p>{assignment.attachmentUrl && <a className="font-bold text-chalk-700 underline" href={assignment.attachmentUrl} target="_blank" rel="noreferrer">{assignment.attachmentName ? "Open " + assignment.attachmentName : "Open homework material"}</a>}</div></article>)}</div> : <div className="p-5"><EmptyState title="No homework published" text="Assignments will appear here after a teacher publishes them."/></div>}</section></>;
}
