import { and, desc, eq, sum } from 'drizzle-orm';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { CalendarCheck2, CircleDollarSign, KeyRound, UserRound } from 'lucide-react';
import { createGuardianPortalAction, createLearnerPortalAction, updateGuardianContactAction, updateLearnerPhotoAction } from '@/app/actions/learners';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { db } from '@/db';
import { attendanceRecords, classes, feeCharges, guardians, learnerGuardians, learners, payments } from '@/db/schema';
import { mayViewLearner } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';
import { getActiveSchoolId } from '@/lib/tenant';
import { canManageLearners } from '@/lib/permissions';

export default async function LearnerProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const schoolId = await getActiveSchoolId(user);
  if (!(await mayViewLearner(user, id))) redirect('/learners');

  const row = (await db.select({ learner: learners, className: classes.name, stream: classes.stream })
    .from(learners).leftJoin(classes, eq(learners.classId, classes.id))
    .where(and(eq(learners.id, id), eq(learners.schoolId, schoolId))).limit(1))[0];
  if (!row) notFound();

  const guardianRows = await db.select({ guardian: guardians, link: learnerGuardians })
    .from(learnerGuardians).innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
    .where(eq(learnerGuardians.learnerId, id));
  const attendance = await db.select().from(attendanceRecords).where(eq(attendanceRecords.learnerId, id)).orderBy(desc(attendanceRecords.date)).limit(20);
  const [charges] = await db.select({ value: sum(feeCharges.amount) }).from(feeCharges).where(eq(feeCharges.learnerId, id));
  const [paid] = await db.select({ value: sum(payments.amount) }).from(payments).where(eq(payments.learnerId, id));
  const qr = await QRCode.toDataURL(row.learner.badgeCode, { margin: 1, width: 220 });
  const outstanding = Number(charges.value || 0) - Number(paid.value || 0);
  const canCreatePortals = ['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER'].includes(user.role);
  const canEditProfile = canManageLearners(user.role);

  return <>
    <PageHeader
      eyebrow="Learner profile"
      title={`${row.learner.firstName} ${row.learner.lastName}`}
      description={`${row.learner.admissionNo} • ${row.className || 'No class'} ${row.stream || ''}`}
    />
    <FlashMessage success={query.success} error={query.error}/>

    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Status" value={row.learner.status} note={`Admitted ${formatDate(row.learner.admissionDate)}`} icon={UserRound}/>
      <StatCard label="Attendance records" value={attendance.length} note="Most recent 20 shown below" icon={CalendarCheck2}/>
      <StatCard label="Outstanding balance" value={formatMoney(outstanding, user.school?.currency)} note={`Payment plan: ${row.learner.paymentPlan}`} icon={CircleDollarSign}/>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
      <section className="space-y-6">
        <div className="paper-card p-5 text-center">
          <h2 className="font-black">Learner photograph</h2>
          <Image src={row.learner.photoUrl || '/learner-placeholder.svg'} alt={`${row.learner.firstName} ${row.learner.lastName}`} width={240} height={240} unoptimized className="mx-auto mt-4 h-56 w-56 rounded-2xl border border-slate-200 object-cover"/>
          {canEditProfile && <form action={updateLearnerPhotoAction} className="mt-4 space-y-3 text-left">
            <input type="hidden" name="learnerId" value={row.learner.id}/>
            <label className="block text-xs font-bold text-slate-600">Replace learner photo</label>
            <input className="input" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/>
            <button className="btn-secondary w-full">Upload new photo</button>
          </form>}
        </div>

        <div className="paper-card p-5 text-center">
          <h2 className="font-black">Digital badge</h2>
          <Image src={qr} alt="Learner QR badge" width={224} height={224} unoptimized className="mx-auto mt-4 h-56 w-56"/>
          <p className="mt-3 break-all text-xs font-bold text-slate-500">{row.learner.badgeCode}</p>
          <div className="mt-4 rounded-xl bg-chalk-50 p-4 text-left text-sm">
            <p><b>Class:</b> {row.className} {row.stream}</p>
            <p><b>Date of birth:</b> {formatDate(row.learner.dateOfBirth)}</p>
            <p><b>Emergency:</b> {row.learner.emergencyContact || 'Not set'}</p>
          </div>
        </div>

        {canCreatePortals && <div className="paper-card p-5">
          <h2 className="flex items-center gap-2 font-black"><KeyRound size={18}/> Learner portal access</h2>
          {row.learner.userId
            ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">A learner login is linked to this profile. Reset or suspend it from Users and staff.</p>
            : <form action={createLearnerPortalAction} className="mt-4 space-y-3">
                <input type="hidden" name="learnerId" value={row.learner.id}/>
                <input className="input" name="username" placeholder="Learner username" required/>
                <input className="input" name="temporaryPassword" type="password" placeholder="Temporary password, 10+ characters" required/>
                <button className="btn-primary w-full">Create learner login</button>
              </form>}
        </div>}
      </section>

      <section className="space-y-6">
        <div className="paper-card p-5">
          <h2 className="font-black">Guardians</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {guardianRows.length ? guardianRows.map(({ guardian, link }) => <div key={guardian.id} className="rounded-xl bg-slate-50 p-4">
              <p className="font-black">{guardian.name}</p>
              <p className="text-sm">{link.relationship} • {guardian.phone}</p>
              <p className="text-xs text-slate-500">{guardian.email || 'No email'}</p>
              {canEditProfile && <details className="mt-3 rounded-lg bg-white p-2">
                <summary className="cursor-pointer text-xs font-black text-chalk-700">Edit parent contact</summary>
                <form action={updateGuardianContactAction} className="mt-2 space-y-2">
                  <input type="hidden" name="learnerId" value={row.learner.id}/>
                  <input type="hidden" name="guardianId" value={guardian.id}/>
                  <input className="input min-h-9 py-1.5 text-xs" name="name" defaultValue={guardian.name} required/>
                  <input className="input min-h-9 py-1.5 text-xs" name="phone" type="tel" defaultValue={guardian.phone} required/>
                  <input className="input min-h-9 py-1.5 text-xs" name="email" type="email" defaultValue={guardian.email || ''} required/>
                  <button className="btn-secondary w-full text-xs">Save parent contact</button>
                </form>
              </details>}
              {guardian.userId
                ? <p className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">Parent portal linked</p>
                : canCreatePortals && <form action={createGuardianPortalAction} className="mt-3 space-y-2">
                    <input type="hidden" name="learnerId" value={row.learner.id}/>
                    <input type="hidden" name="guardianId" value={guardian.id}/>
                    <input className="input min-h-9 py-1.5 text-xs" name="username" placeholder="Parent username" required/>
                    <input className="input min-h-9 py-1.5 text-xs" name="temporaryPassword" type="password" placeholder="Temporary password" required/>
                    <button className="btn-secondary w-full text-xs">Create parent login</button>
                  </form>}
            </div>) : <p className="text-sm text-slate-500">No guardian linked.</p>}
          </div>
        </div>

        <div className="paper-card overflow-hidden">
          <div className="border-b p-4"><h2 className="font-black">Recent attendance</h2></div>
          <div className="overflow-x-auto"><table className="data-table">
            <thead><tr><th>Date</th><th>Status</th><th>Check-in</th></tr></thead>
            <tbody>{attendance.map((record) => <tr key={record.id}>
              <td>{formatDate(record.date)}</td>
              <td><span className="status-pill bg-slate-100 text-slate-700">{record.status}</span></td>
              <td>{record.checkInTime?.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' }) || '—'}</td>
            </tr>)}</tbody>
          </table></div>
        </div>
      </section>
    </div>
  </>;
}
