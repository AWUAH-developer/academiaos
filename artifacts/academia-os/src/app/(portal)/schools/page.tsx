import Image from 'next/image';
import { asc, count, eq } from 'drizzle-orm';
import { selectSchoolAction, toggleSchoolAction } from '@/app/actions/schools';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { SchoolRegistrationForm } from '@/components/SchoolRegistrationForm';
import { db } from '@/db';
import { schools, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';


export default async function SchoolsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') return <div className="paper-card p-8">Access denied.</div>;
  const params = await searchParams;
  const activeSchoolId = await getActiveSchoolId(user);
  const rows = await db.select({ school: schools, users: count(users.id) })
    .from(schools)
    .leftJoin(users, eq(schools.id, users.schoolId))
    .groupBy(schools.id)
    .orderBy(asc(schools.name));

  return <>
    <PageHeader eyebrow="Platform administration" title="Schools" description="Create and control schools without mixing their data."/>
    <FlashMessage success={params.success} error={params.error}/>
    <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <SchoolRegistrationForm/>
      <section className="paper-card overflow-hidden">
        <div className="overflow-x-auto"><table className="data-table">
          <thead><tr><th>School</th><th>Code</th><th>Users</th><th>Status</th><th>Control</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(({ school, users: userCount }) => <tr key={school.id}>
            <td><div className="flex min-w-64 items-center gap-3"><Image src={school.logoUrl || '/icon.svg'} alt={`${school.name} logo`} width={52} height={52} unoptimized className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-1"/><div><p className="font-black">{school.name}</p><p className="text-xs text-slate-500">{school.address || 'No address set'}</p></div></div></td>
            <td>{school.code}</td><td>{userCount}</td>
            <td><span className={`status-pill ${school.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{school.isActive ? 'ACTIVE' : 'SUSPENDED'}</span></td>
            <td><div className="flex gap-2">{school.isActive && <form action={selectSchoolAction}><input type="hidden" name="schoolId" value={school.id}/><button className="btn-primary min-h-9 px-3 py-1.5 text-xs">{activeSchoolId === school.id ? 'Current workspace' : 'Open school'}</button></form>}<form action={toggleSchoolAction}><input type="hidden" name="schoolId" value={school.id}/><input type="hidden" name="active" value={String(!school.isActive)}/><button className="btn-secondary min-h-9 px-3 py-1.5 text-xs">{school.isActive ? 'Suspend' : 'Activate'}</button></form></div></td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </div>
  </>;
}
