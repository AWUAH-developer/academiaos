import { desc, eq } from 'drizzle-orm';
import { LifeBuoy } from 'lucide-react';
import { createTicketAction, updateTicketAction } from '@/app/actions/helpdesk';
import { EmptyState } from '@/components/EmptyState';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { supportTickets, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';

export const metadata = { title: 'Help desk' }; export const dynamic = 'force-dynamic';
function style(status: string) { return status === 'RESOLVED' || status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' : status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'; }
export default async function HelpdeskPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser(); const schoolId = await getActiveSchoolId(user); const params = await searchParams;
  const tickets = await db.select({ ticket: supportTickets, creatorName: users.name }).from(supportTickets).innerJoin(users, eq(supportTickets.createdById, users.id)).where(eq(supportTickets.schoolId, schoolId)).orderBy(desc(supportTickets.updatedAt)).limit(200);
  const canManage = ['SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role);
  return <><PageHeader eyebrow="Support" title="Help desk" description="Report software, account, attendance, fee, academic, and device problems. Administrators can track and resolve every ticket."/>
  <FlashMessage success={params.success} error={params.error}/><div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><section className="paper-card p-5"><h2 className="flex items-center gap-2 font-black"><LifeBuoy size={19}/> Create support ticket</h2><form action={createTicketAction} className="mt-4 space-y-3"><input className="input" name="subject" placeholder="What is wrong?" required/><select className="input" name="priority"><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select><textarea className="input min-h-36" name="description" placeholder="Describe the problem, affected page, learner or transaction, and what you expected." required/><button className="btn-primary w-full">Submit ticket</button></form></section>
  <section className="paper-card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">Ticket register</h2><p className="mt-1 text-xs text-slate-500">{tickets.length} ticket(s)</p></div>{tickets.length ? <div className="divide-y divide-slate-100">{tickets.map(({ticket,creatorName}) => <article key={ticket.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black">{ticket.subject}</h3><p className="mt-1 text-xs text-slate-500">Opened by {creatorName} | {ticket.createdAt.toLocaleString()}</p></div><div className="flex gap-2"><span className={`status-pill ${style(ticket.status)}`}>{ticket.status.replaceAll('_',' ')}</span><span className="status-pill bg-slate-100 text-slate-700">{ticket.priority}</span></div></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>{ticket.resolution && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><b>Resolution:</b> {ticket.resolution}</p>}{canManage && <form action={updateTicketAction} className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_auto]"><input type="hidden" name="ticketId" value={ticket.id}/><select className="input" name="status" defaultValue={ticket.status}><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select><input className="input" name="resolution" defaultValue={ticket.resolution || ''} placeholder="Resolution or administrator note"/><button className="btn-secondary">Update</button></form>}</article>)}</div> : <div className="p-5"><EmptyState title="No support tickets" text="Create a ticket when something needs technical attention."/></div>}</section></div></>;
}
