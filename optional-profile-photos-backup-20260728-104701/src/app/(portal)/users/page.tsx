import Image from 'next/image';
import { asc, eq } from 'drizzle-orm';
import { updateStaffProfileAction, updateUserStatusAction } from '@/app/actions/users';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { PasswordResetControl } from '@/components/PasswordResetControl';
import { StaffAccountForm } from '@/components/StaffAccountForm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { canManageUsers, canViewUsers } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';
import { canCreateUserAdmissionRecord } from '@/lib/user-admission';
import { USER_ROLES, type UserRole } from '@/lib/types';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const actor = await requireUser();
  if (!canViewUsers(actor.role)) return <div className="paper-card p-8">Access denied.</div>;
  const params = await searchParams;
  const schoolId = await getActiveSchoolId(actor);
  const mayCreateStaff = await canCreateUserAdmissionRecord(
    actor.role,
    schoolId,
    'staff'
  );
  const mayManageStaff = canManageUsers(actor.role);
  const rows = await db.select().from(users).where(eq(users.schoolId, schoolId)).orderBy(asc(users.name));
  const delegatedStaffRoles: UserRole[] = [
    'HEADTEACHER',
    'ACADEMIC_ADMIN',
    'TEACHER',
    'ACCOUNTS',
    'TRANSPORT',
    'SECURITY',
    'RECEPTIONIST',
    'LIBRARIAN',
    'CANTEEN',
  ];

  const roles = actor.role === 'SUPER_ADMIN'
    ? USER_ROLES.filter(
        (role) =>
          role !== 'SUPER_ADMIN' &&
          role !== 'PARENT' &&
          role !== 'LEARNER'
      ) as UserRole[]
    : delegatedStaffRoles;

  return <>
    <PageHeader eyebrow="Access control" title="Users and staff" description="Create staff profiles and manage permitted staff accounts. Password resets and Proprietor account security are controlled by the AcademiaOS Super Admin."/>
    <FlashMessage success={params.success} error={params.error}/>
    <div className={`grid gap-6 ${mayCreateStaff ? 'xl:grid-cols-[390px_1fr]' : ''}`}>
      {mayCreateStaff && <StaffAccountForm roles={roles}/>}
      <section className="paper-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Staff member</th><th>Contact</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={row.id}>
                <td>
                  <div className="flex min-w-56 items-center gap-3">
                    <Image src={row.photoUrl || '/staff-placeholder.svg'} alt={`${row.name} profile`} width={52} height={52} unoptimized className="h-14 w-14 rounded-xl border border-slate-200 object-cover"/>
                    <div><p className="font-black">{row.name}</p><p className="text-xs text-slate-500">@{row.username}</p></div>
                  </div>
                </td>
                <td><p className="text-sm font-bold">{row.phone || 'No mobile number'}</p><p className="text-xs text-slate-500">{row.email || 'No email address'}</p></td>
                <td>{row.role.replaceAll('_',' ')}</td>
                <td><span className={`status-pill ${row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{row.status}</span></td>
                <td>
                {mayManageStaff && (actor.role === 'SUPER_ADMIN' || row.role !== 'PROPRIETOR') ? (
                  <>

                  <div className="flex min-w-64 flex-wrap gap-2">
                    <form action={updateUserStatusAction}>
                      <input type="hidden" name="userId" value={row.id}/>
                      <input type="hidden" name="status" value={row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'}/>
                      <button className="btn-secondary min-h-9 px-3 py-1.5 text-xs">{row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button>
                    </form>
                    {actor.role === 'SUPER_ADMIN' && <PasswordResetControl userId={row.id}/>}
                  </div>
                  <details className="mt-3 rounded-xl bg-slate-50 p-3">
                    <summary className="cursor-pointer text-xs font-black text-chalk-700">Edit photo and contact details</summary>
                    <form action={updateStaffProfileAction} className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input type="hidden" name="userId" value={row.id}/>
                      <input className="input min-h-9 py-1.5 text-xs" name="phone" type="tel" defaultValue={row.phone || ''} placeholder="Mobile number" required/>
                      <input className="input min-h-9 py-1.5 text-xs" name="email" type="email" defaultValue={row.email || ''} placeholder="Email address" required/>
                      <input className="input min-h-9 py-1.5 text-xs sm:col-span-2" name="photo" type="file" accept="image/jpeg,image/png,image/webp"/>
                      <button className="btn-primary min-h-9 py-1.5 text-xs sm:col-span-2">Save staff profile</button>
                    </form>
                  </details>
                
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-400">
                    View only
                  </span>
                )}
              </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </>;
}
