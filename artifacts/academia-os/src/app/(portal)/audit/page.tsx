import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { ExportLink } from '@/components/ExportLink';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Audit log' }; export const dynamic = 'force-dynamic';
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser(); if (!canAccess(user.role, 'audit')) redirect('/dashboard'); const schoolId = await getActiveSchoolId(user); const params = await searchParams; const q = (params.q || '').trim();
  const filters = [eq(auditLogs.schoolId, schoolId)]; if (q) filters.push(or(ilike(auditLogs.action, `%${q}%`), ilike(auditLogs.entityType, `%${q}%`))!);
  const rows = await db.select({ log: auditLogs, userName: users.name }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).where(and(...filters)).orderBy(desc(auditLogs.createdAt)).limit(300);
  return <><PageHeader eyebrow="Security and accountability" title="Audit log" description="Sensitive activity records who acted, what changed, when it happened, and the device or network details available to the server." action={<div className="flex flex-wrap gap-2"><ExportLink type="audit"/><form className="flex gap-2"><input className="input min-w-64" name="q" defaultValue={q} placeholder="Search action or record type"/><button className="btn-primary">Search</button></form></div>}/>
  <section className="paper-card overflow-hidden">{rows.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Record</th><th>Network</th><th>Change data</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(({log,userName})=><tr key={log.id}><td className="whitespace-nowrap text-xs">{log.createdAt.toLocaleString()}</td><td>{userName || 'System'}</td><td><span className="status-pill bg-slate-100 text-slate-700">{log.action.replaceAll('_',' ')}</span></td><td>{log.entityType}<p className="max-w-48 truncate font-mono text-xs text-slate-400">{log.entityId || '-'}</p></td><td className="max-w-52 text-xs"><p>{log.ipAddress || 'IP unavailable'}</p><p className="truncate text-slate-400">{log.userAgent || 'Device unavailable'}</p></td><td><details className="max-w-96 text-xs"><summary className="cursor-pointer font-bold text-chalk-700">View values</summary><pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-white">{JSON.stringify({old:log.oldValue,new:log.newValue},null,2)}</pre></details></td></tr>)}</tbody></table></div> : <div className="p-5"><EmptyState title="No audit events" text="Login, user, attendance, fee, academic, messaging, and support actions will appear here."/></div>}</section></>;
}
