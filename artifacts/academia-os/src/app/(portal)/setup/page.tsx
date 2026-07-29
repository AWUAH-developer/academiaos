import { redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { BookOpen, CalendarRange, CircleDollarSign, School, ShieldCheck, Users } from 'lucide-react';
import { assignClassTeacherAction, assignStaffAttendanceOfficerAction, assignTeacherAction, createAcademicYearAction, createClassAction, createFeeCategoryAction, createFeeStructureAction, createSubjectAction, createCurriculumTopicAction, createTermAction, updateSchoolAction } from '@/app/actions/setup';
import { FlashMessage } from '@/components/FlashMessage'; import { PageHeader } from '@/components/PageHeader'; import { SchoolBadge } from '@/components/SchoolBadge'; import { SchoolInitialsInput } from '@/components/SchoolInitialsInput';
import { db } from '@/db'; import { academicYears, classes, feeCategories, feeStructures, schoolManagementControls, schools, subjects, curriculumTopics, teacherAssignments, terms, users } from '@/db/schema';
import { requireUser } from '@/lib/auth'; import { getActiveSchoolId } from '@/lib/tenant';

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
 const user = await requireUser(); if (user.role !== 'SUPER_ADMIN') redirect('/dashboard'); const schoolId = await getActiveSchoolId(user); const params = await searchParams;
 const [school, controls, years, termRows, classRows, subjectRows, topicRows, teacherRows, categories, structures, assignments] = await Promise.all([
  db.select().from(schools).where(eq(schools.id, schoolId)).limit(1).then(r=>r[0]),
  db.select().from(schoolManagementControls).where(eq(schoolManagementControls.schoolId, schoolId)).limit(1).then(r=>r[0]),
  db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)).orderBy(asc(academicYears.name)),
  db.select().from(terms).where(eq(terms.schoolId, schoolId)).orderBy(asc(terms.startsOn)), db.select().from(classes).where(eq(classes.schoolId, schoolId)).orderBy(asc(classes.name),asc(classes.stream)),
  db.select().from(subjects).where(eq(subjects.schoolId, schoolId)).orderBy(asc(subjects.name)), db.select().from(curriculumTopics).where(eq(curriculumTopics.schoolId, schoolId)).orderBy(asc(curriculumTopics.name)), db.select().from(users).where(and(eq(users.schoolId, schoolId), eq(users.status,'ACTIVE'))).orderBy(asc(users.name)),
  db.select().from(feeCategories).where(eq(feeCategories.schoolId, schoolId)).orderBy(asc(feeCategories.name)), db.select().from(feeStructures).where(eq(feeStructures.schoolId, schoolId)),
  db.select({ assignment: teacherAssignments, teacherName: users.name, className: classes.name, stream: classes.stream, subjectName: subjects.name }).from(teacherAssignments).innerJoin(users,eq(teacherAssignments.teacherId,users.id)).innerJoin(classes,eq(teacherAssignments.classId,classes.id)).innerJoin(subjects,eq(teacherAssignments.subjectId,subjects.id)).where(eq(teacherAssignments.schoolId,schoolId))
 ]);
 const teachers = teacherRows.filter(t=>['TEACHER','HEADTEACHER','ACADEMIC_ADMIN'].includes(t.role));
 const staffAttendanceCandidates = teacherRows.filter(t=>!['PARENT','LEARNER'].includes(t.role));
 const teacherById = new Map(teacherRows.map(t => [t.id, t.name]));
 return <><PageHeader eyebrow="Configuration" title="School setup" description="Academic calendar, classes, subjects, teacher assignments and fee rules."/><FlashMessage success={params.success} error={params.error}/><div className="grid gap-6 xl:grid-cols-2">
 <section className="paper-card p-5"><h2 className="flex items-center gap-2 font-black"><School size={19}/> School identity</h2><div className="mt-4 flex items-center gap-4 rounded-xl bg-slate-50 p-3"><SchoolBadge name={school?.name || 'School'} logoUrl={school?.logoUrl} size={76} className="rounded-xl"/><div><p className="font-black">Current school badge</p><p className="text-xs text-slate-500">Without an uploaded logo, AcademiaOS automatically uses up to three initials from the school name.</p></div></div><form action={updateSchoolAction} className="mt-4 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><label className="label">Custom logo (optional)</label><input className="input" name="logo" type="file" accept="image/jpeg,image/png,image/webp"/><p className="mt-1 text-xs text-slate-500">Leave empty to keep the current badge.</p></div>{school?.logoUrl ? <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input type="checkbox" name="removeLogo"/> Remove custom logo and use school initials</label> : null}<SchoolInitialsInput className="sm:col-span-2" nameInputName="name" defaultName={school?.name || ''} nameLabel="School name *" namePlaceholder="e.g. Paul Lawrence Academy"/><input className="input" name="phone" defaultValue={school?.phone || ''} placeholder="Phone"/><input className="input" name="email" type="email" defaultValue={school?.email || ''} placeholder="Email"/><input className="input sm:col-span-2" name="address" defaultValue={school?.address || ''} placeholder="Address"/><input className="input" name="currency" defaultValue={school?.currency || 'GHS'} placeholder="Currency"/><input className="input" name="smsSenderName" defaultValue={school?.smsSenderName || ''} placeholder="SMS sender name"/><label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input type="checkbox" name="proprietorApprovalRequired" defaultChecked={school?.proprietorApprovalRequired}/> Proprietor approval required</label><button className="btn-primary sm:col-span-2">Save school settings</button></form></section>
 <section className="paper-card p-5">
   <h2 className="flex items-center gap-2 font-black">
     <ShieldCheck size={19}/>
     Authorised staff attendance recording
   </h2>

   <p className="mt-2 text-sm text-slate-600">
     Security-role users are automatically allowed to record staff arrival,
     departure and approved gate movement. Select one additional active staff
     member who may perform the same duty.
   </p>

   <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
     Nobody may record their own arrival, departure, leaving or return.
   </p>

   <form action={assignStaffAttendanceOfficerAction} className="mt-4 space-y-3">
     <select
       className="input"
       name="officerId"
       defaultValue={controls?.staffAttendanceOfficerId || ''}
     >
       <option value="">No additional authorised officer</option>

       {staffAttendanceCandidates.map(staff=>
         <option key={staff.id} value={staff.id}>
           {staff.name} | {staff.role.replaceAll('_',' ')}
         </option>
       )}
     </select>

     <button className="btn-primary w-full">
       Save authorised attendance officer
     </button>
   </form>
 </section>

 <section className="paper-card p-5"><h2 className="flex items-center gap-2 font-black"><CalendarRange size={19}/> Academic calendar</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><form action={createAcademicYearAction} className="space-y-3"><p className="text-sm font-black">New academic year</p><input className="input" name="name" placeholder="2026/2027" required/><input className="input" name="startsOn" inputMode="numeric" placeholder="Start date DD/MM/YYYY" pattern="[0-3][0-9]/[0-1][0-9]/[0-9]{4}" required/><input className="input" name="endsOn" inputMode="numeric" placeholder="End date DD/MM/YYYY" pattern="[0-3][0-9]/[0-1][0-9]/[0-9]{4}" required/><label className="flex gap-2 text-sm"><input type="checkbox" name="isCurrent"/> Current year</label><button className="btn-secondary w-full">Add year</button></form><form action={createTermAction} className="space-y-3"><p className="text-sm font-black">New term</p><select className="input" name="academicYearId" required>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><input className="input" name="name" placeholder="Term 1" required/><div className="grid grid-cols-2 gap-2"><input className="input" name="startsOn" inputMode="numeric" placeholder="Start date DD/MM/YYYY" pattern="[0-3][0-9]/[0-1][0-9]/[0-9]{4}" required/><input className="input" name="endsOn" inputMode="numeric" placeholder="End date DD/MM/YYYY" pattern="[0-3][0-9]/[0-1][0-9]/[0-9]{4}" required/></div><input className="input" name="reopeningDate" inputMode="numeric" placeholder="Reopening DD/MM/YYYY" pattern="[0-3][0-9]/[0-1][0-9]/[0-9]{4}"/><label className="flex gap-2 text-sm"><input type="checkbox" name="isCurrent"/> Current term</label><button className="btn-secondary w-full">Add term</button></form></div><div className="mt-4 text-xs text-slate-500">Use Ghana date format DD/MM/YYYY. {years.length} academic year(s), {termRows.length} term(s)</div></section>
 <section className="paper-card p-5"><h2 className="flex items-center gap-2 font-black"><BookOpen size={19}/> Classes and subjects</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><form action={createClassAction} className="space-y-3"><input className="input" name="name" placeholder="Class, e.g. Primary 5" required/><div className="grid grid-cols-2 gap-2"><input className="input" name="stream" placeholder="Stream"/><input className="input" name="level" placeholder="Level"/></div><button className="btn-secondary w-full">Add class</button></form><form action={createSubjectAction} className="space-y-3"><input className="input" name="name" placeholder="Subject name" required/><input className="input" name="code" placeholder="Code, e.g. MATH" required/><button className="btn-secondary w-full">Add subject</button></form></div><div className="mt-4 flex flex-wrap gap-2">{classRows.map(c=><span key={c.id} className="status-pill bg-slate-100 text-slate-700">{c.name} {c.stream}</span>)}</div></section>
 <section className="paper-card p-5">
    <h2 className="flex items-center gap-2 font-black">
      <BookOpen size={19}/> Curriculum topics
    </h2>

    <p className="mt-1 text-xs text-slate-500">
      Create the topics taught under each subject for each class.
      Teachers can later select these topics when publishing homework.
    </p>

    <form action={createCurriculumTopicAction} className="mt-4 grid gap-3 sm:grid-cols-3">
      <select className="input" name="classId" required>
        <option value="">Select class</option>
        {classRows.map(c=>
          <option key={c.id} value={c.id}>
            {c.name} {c.stream}
          </option>
        )}
      </select>

      <select className="input" name="subjectId" required>
        <option value="">Select subject</option>
        {subjectRows.map(subject=>
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        )}
      </select>

      <input
        className="input"
        name="name"
        placeholder="Topic, e.g. Fractions"
        required
      />

      <button className="btn-secondary sm:col-span-3">
        Add curriculum topic
      </button>
    </form>

    <div className="mt-4 space-y-2">
      {topicRows.length ? topicRows.map(topic=>
        <div key={topic.id} className="rounded-xl bg-slate-50 p-3 text-sm">
          <b>{topic.name}</b>
          <span className="ml-2 text-slate-500">
            {classRows.find(c=>c.id===topic.classId)?.name || "Class"}
            {" "}•{" "}
            {subjectRows.find(subject=>subject.id===topic.subjectId)?.name || "Subject"}
          </span>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          No curriculum topics have been configured yet.
        </p>
      )}
    </div>
  </section>

  <section className="paper-card p-5">
  <h2 className="flex items-center gap-2 font-black"><Users size={19}/> Teacher assignments</h2>

  <div className="mt-4 rounded-xl border border-slate-200 p-4">
    <p className="font-black">Official Class Teacher / Class Head</p>
    <p className="mt-1 text-xs text-slate-500">
      The assigned Class Teacher is responsible for the official attendance register for this class.
      Subject teaching assignments do not grant attendance authority.
    </p>

    <form action={assignClassTeacherAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <select className="input" name="classId" required>
        <option value="">Select class</option>
        {classRows.map(c=><option key={c.id} value={c.id}>{c.name} {c.stream}</option>)}
      </select>

      <select className="input" name="teacherId" required>
        <option value="">Select Class Teacher</option>
        {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <button className="btn-primary sm:col-span-2">Assign Class Teacher</button>
    </form>

    <div className="mt-4 space-y-2">
      {classRows.map(c=>
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          <b>{c.name} {c.stream}</b>
          <span className="text-slate-600">
            Class Teacher: <b>{c.classTeacherId ? (teacherById.get(c.classTeacherId) || 'Assigned staff') : 'Not assigned'}</b>
          </span>
        </div>
      )}
    </div>
  </div>

  <div className="mt-5 rounded-xl border border-slate-200 p-4">
    <p className="font-black">Subject teacher assignment</p>
    <p className="mt-1 text-xs text-slate-500">
      Assign teachers to subjects they teach. This does not make them the official Class Teacher.
    </p>

    <form action={assignTeacherAction} className="mt-4 grid gap-3 sm:grid-cols-3">
      <select className="input" name="teacherId" required>
        {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <select className="input" name="classId" required>
        {classRows.map(c=><option key={c.id} value={c.id}>{c.name} {c.stream}</option>)}
      </select>

      <select className="input" name="subjectId" required>
        {subjectRows.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <button className="btn-secondary sm:col-span-3">Assign Subject Teacher</button>
    </form>

    <div className="mt-4 space-y-2 text-sm">
      {assignments.map(a=>
        <div key={a.assignment.id} className="rounded-xl bg-slate-50 p-3">
          <b>{a.teacherName}</b> • {a.className} {a.stream} • {a.subjectName}
        </div>
      )}
    </div>
  </div>
</section>
<section className="paper-card p-5 xl:col-span-2"><h2 className="flex items-center gap-2 font-black"><CircleDollarSign size={19}/> Fee rules</h2><div className="mt-4 grid gap-4 lg:grid-cols-2"><form action={createFeeCategoryAction} className="grid gap-3 sm:grid-cols-2"><input className="input" name="name" placeholder="Category name" required/><input className="input" name="code" placeholder="Code" required/><label className="flex gap-2 text-sm"><input type="checkbox" name="isDailyTuition"/> Daily tuition</label><label className="flex gap-2 text-sm"><input type="checkbox" name="isCanteen"/> Canteen</label><button className="btn-secondary sm:col-span-2">Add category</button></form><form action={createFeeStructureAction} className="grid gap-3 sm:grid-cols-2"><select className="input" name="categoryId" required>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="input" name="classId"><option value="">All classes</option>{classRows.map(c=><option key={c.id} value={c.id}>{c.name} {c.stream}</option>)}</select><select className="input" name="paymentPlan"><option>TERM</option><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option><option>INSTALLMENT</option></select><input className="input" name="amount" type="number" step="0.01" min="0.01" placeholder="Amount" required/><label className="flex gap-2 text-sm sm:col-span-2"><input type="checkbox" name="chargeOnAbsent"/> Charge when learner is absent</label><button className="btn-secondary sm:col-span-2">Add fee structure</button></form></div><p className="mt-4 text-xs text-slate-500">{categories.length} categories and {structures.length} fee structures configured.</p></section>
 </div></>;
}
