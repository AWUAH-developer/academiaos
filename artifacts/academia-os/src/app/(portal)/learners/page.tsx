import Image from 'next/image';
import Link from 'next/link';
import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm';
import { Search, UserRoundPlus } from 'lucide-react';
import { createLearnerAction, promoteLearnersAction, updateLearnerStatusAction } from '@/app/actions/learners';
import { EmptyState } from '@/components/EmptyState';
import { ExportLink } from '@/components/ExportLink';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { classes, guardians, learnerGuardians, learners } from '@/db/schema';
import { visibleLearnerIds } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import { canManageLearners } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

export default async function LearnersPage({ searchParams }: { searchParams: Promise<{ q?: string; success?: string; error?: string }> }) {
  const user = await requireUser();
  const schoolId = await getActiveSchoolId(user);
  const params = await searchParams;
  const query = String(params.q || '').trim();
  const ids = await visibleLearnerIds(user);
  const filter = and(
    eq(learners.schoolId, schoolId),
    ids === null ? undefined : ids.length ? inArray(learners.id, ids) : eq(learners.id, '__none__'),
    query ? or(ilike(learners.firstName, `%${query}%`), ilike(learners.lastName, `%${query}%`), ilike(learners.admissionNo, `%${query}%`)) : undefined
  );

  const rows = await db.select({
    learner: learners,
    className: classes.name,
    stream: classes.stream,
    guardianName: guardians.name,
    guardianPhone: guardians.phone,
    guardianEmail: guardians.email
  }).from(learners)
    .leftJoin(classes, eq(learners.classId, classes.id))
    .leftJoin(learnerGuardians, and(eq(learnerGuardians.learnerId, learners.id), eq(learnerGuardians.isPrimary, true)))
    .leftJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
    .where(filter)
    .orderBy(asc(classes.name), asc(learners.firstName));

  const classRows = await db.select().from(classes)
    .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))
    .orderBy(asc(classes.name), asc(classes.stream));
  const mayCreate = canManageLearners(user.role);

  return <>
    <PageHeader eyebrow="Student information system" title="Learner management" description="Admission records, profile photos, parent contacts, classes, payment plans and digital badges." action={<div className="flex items-center gap-2"><div className="rounded-xl bg-white px-4 py-2 text-sm font-black shadow-sm">{rows.length} records</div><ExportLink type="learners"/></div>}/>
    <FlashMessage success={params.success} error={params.error}/>
    <div className={`grid gap-6 ${mayCreate ? 'xl:grid-cols-[390px_1fr]' : ''}`}>
      {mayCreate && <section className="paper-card h-fit p-5 xl:sticky xl:top-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-chalk-50 text-chalk-700"><UserRoundPlus size={20}/></div>
          <div><h2 className="font-black">Add learner</h2><p className="text-xs text-slate-500">Photo and parent contact details are required</p></div>
        </div>
        <form action={createLearnerAction} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Learner profile photo</label>
            <input className="input" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/>
            <p className="mt-1 text-[11px] text-slate-500">JPG, PNG or WebP. Maximum 1.5 MB.</p>
          </div>
          <input className="input" name="admissionNo" placeholder="Admission number" required/>
          <div className="grid grid-cols-2 gap-3"><input className="input" name="firstName" placeholder="First name" required/><input className="input" name="lastName" placeholder="Last name" required/></div>
          <select className="input" name="classId"><option value="">No class assigned</option>{classRows.map((item) => <option key={item.id} value={item.id}>{item.name} {item.stream}</option>)}</select>
          <div className="grid grid-cols-2 gap-3"><input className="input" name="dateOfBirth" type="date"/><select className="input" name="gender"><option value="">Gender</option><option>Male</option><option>Female</option></select></div>
          <textarea className="input min-h-20" name="address" placeholder="Home address"/>
          <input className="input" name="medicalNotes" placeholder="Medical notes"/>
          <input className="input" name="emergencyContact" placeholder="Emergency contact"/>
          <select className="input" name="paymentPlan"><option>TERM</option><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option><option>INSTALLMENT</option><option>SCHOLARSHIP</option></select>
          <hr/>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Primary parent or guardian</p>
          <input className="input" name="guardianName" placeholder="Parent or guardian full name" required/>
          <input className="input" name="guardianPhone" type="tel" placeholder="Parent mobile number" required/>
          <input className="input" name="guardianEmail" type="email" placeholder="Parent email address" required/>
          <input className="input" name="guardianAddress" placeholder="Parent address"/>
          <select className="input" name="relationship"><option>Parent</option><option>Guardian</option><option>Sibling</option><option>Other</option></select>
          <button className="btn-primary w-full">Create learner</button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="font-black">Promote a class</h3>
          <p className="mt-1 text-xs text-slate-500">Moves active learners while keeping previous attendance, finance and academic records.</p>
          <form action={promoteLearnersAction} className="mt-3 space-y-3">
            <select className="input" name="fromClassId" required><option value="">From class</option>{classRows.map((item) => <option key={`from-${item.id}`} value={item.id}>{item.name} {item.stream}</option>)}</select>
            <select className="input" name="toClassId" required><option value="">To class</option>{classRows.map((item) => <option key={`to-${item.id}`} value={item.id}>{item.name} {item.stream}</option>)}</select>
            <button className="btn-secondary w-full">Promote active learners</button>
          </form>
        </div>
      </section>}

      <section className="paper-card overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <form className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="input pl-10" name="q" defaultValue={query} placeholder="Search learner or admission number"/></div><button className="btn-secondary">Search</button></form>
        </div>
        {rows.length ? <div className="overflow-x-auto"><table className="data-table">
          <thead><tr><th>Learner</th><th>Class</th><th>Parent or guardian</th><th>Plan</th><th>Status</th><th>Open</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(({ learner, className, stream, guardianName, guardianPhone, guardianEmail }) => <tr key={learner.id}>
            <td><div className="flex min-w-52 items-center gap-3"><Image src={learner.photoUrl || '/learner-placeholder.svg'} alt={`${learner.firstName} ${learner.lastName}`} width={52} height={52} unoptimized className="h-14 w-14 rounded-xl border border-slate-200 object-cover"/><div><p className="font-black">{learner.firstName} {learner.lastName}</p><p className="text-xs text-slate-500">{learner.admissionNo}</p></div></div></td>
            <td>{className ? `${className} ${stream || ''}` : 'Unassigned'}</td>
            <td><p className="font-bold">{guardianName || 'Not linked'}</p><p className="text-xs text-slate-500">{guardianPhone || ''}</p><p className="text-xs text-slate-500">{guardianEmail || ''}</p></td>
            <td>{learner.paymentPlan}</td>
            <td>{mayCreate ? <form action={updateLearnerStatusAction} className="flex gap-2"><input type="hidden" name="learnerId" value={learner.id}/><select className="input min-h-9 py-1 text-xs" name="status" defaultValue={learner.status}><option>ACTIVE</option><option>SUSPENDED</option><option>GRADUATED</option><option>WITHDRAWN</option></select><button className="btn-secondary min-h-9 px-2 py-1 text-xs">Save</button></form> : <span className="status-pill bg-emerald-100 text-emerald-800">{learner.status}</span>}</td>
            <td><Link href={`/learners/${learner.id}`} className="font-extrabold text-chalk-700">Profile</Link></td>
          </tr>)}</tbody>
        </table></div> : <div className="p-5"><EmptyState title="No learners found" text="Create a learner or change the search terms."/></div>}
      </section>
    </div>
  </>;
}
