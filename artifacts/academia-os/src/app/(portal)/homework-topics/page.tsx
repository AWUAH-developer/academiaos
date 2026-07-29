import { and, asc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { createCurriculumTopicAction } from '@/app/actions/setup';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { classes, curriculumTopics, subjects } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Homework topics' };
export const dynamic = 'force-dynamic';

export default async function HomeworkTopicsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  if (!canAccess(user.role, 'homework-topics')) redirect('/dashboard');
  // SCHOOL_ADMIN has view-only oversight; cannot create topics.
  const canManageTopics = ['SUPER_ADMIN','HEADTEACHER','ACADEMIC_ADMIN'].includes(user.role);

  const schoolId = await getActiveSchoolId(user);
  const params = await searchParams;

  const [classRows, subjectRows, topicRows] = await Promise.all([
    db.select().from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))
      .orderBy(asc(classes.name), asc(classes.stream)),
    db.select().from(subjects)
      .where(and(eq(subjects.schoolId, schoolId), eq(subjects.isActive, true)))
      .orderBy(asc(subjects.name)),
    db.select().from(curriculumTopics)
      .where(and(eq(curriculumTopics.schoolId, schoolId), eq(curriculumTopics.isActive, true)))
      .orderBy(asc(curriculumTopics.name))
  ]);

  return <>
    <PageHeader
      eyebrow="Teaching and learning"
      title={canManageTopics ? 'Homework topics' : 'Curriculum topic monitoring'}
      description={canManageTopics ? 'Create the topics teachers can select when publishing homework for a class and subject.' : 'Read-only view of curriculum topics configured for each class and subject.'}
    />
    <FlashMessage success={params.success} error={params.error}/>

    {canManageTopics && (
      <section className="paper-card p-5">
        <h2 className="flex items-center gap-2 font-black">
          <BookOpen size={19}/> Add homework topic
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Topics are managed here by authorised academic administrators. Full School Setup remains a Super Admin control.
        </p>
        <form action={createCurriculumTopicAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="returnTo" value="homework-topics"/>
          <select className="input" name="classId" required>
            <option value="">Select class</option>
            {classRows.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name} {schoolClass.stream || ''}
              </option>
            ))}
          </select>
          <select className="input" name="subjectId" required>
            <option value="">Select subject</option>
            {subjectRows.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <input className="input" name="name" placeholder="Topic, e.g. Fractions" required/>
          <button className="btn-primary sm:col-span-3">Add homework topic</button>
        </form>
      </section>
    )}

    <section className="paper-card mt-6 p-5">
      <h2 className="font-black">Configured topics</h2>
      <div className="mt-4 space-y-2">
        {topicRows.length ? topicRows.map((topic) => (
          <div key={topic.id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <b>{topic.name}</b>
            <span className="ml-2 text-slate-500">
              {classRows.find((item) => item.id === topic.classId)?.name || 'Class'}
              {' • '}
              {subjectRows.find((item) => item.id === topic.subjectId)?.name || 'Subject'}
            </span>
          </div>
        )) : (
          <p className="text-sm text-slate-500">No homework topics have been configured yet.</p>
        )}
      </div>
    </section>
  </>;
}
