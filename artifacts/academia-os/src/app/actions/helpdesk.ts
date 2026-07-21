'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { supportTickets } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';

export async function createTicketAction(formData: FormData) {
  const user = await requireUser(); const schoolId = await getActiveSchoolId(user); const subject = String(formData.get('subject') || '').trim(); const description = String(formData.get('description') || '').trim(); const priority = String(formData.get('priority') || 'NORMAL');
  if (!subject || !description || !['LOW','NORMAL','HIGH','URGENT'].includes(priority)) redirect('/helpdesk?error=Enter+valid+ticket+details');
  const [ticket] = await db.insert(supportTickets).values({ schoolId, createdById: user.id, subject, description, priority }).returning(); await audit({ schoolId, userId: user.id, action: 'SUPPORT_TICKET_CREATED', entityType: 'SupportTicket', entityId: ticket.id }); revalidatePath('/helpdesk'); redirect('/helpdesk?success=Support+ticket+created');
}

export async function updateTicketAction(formData: FormData) {
  const user = await requireUser(); if (!['SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role)) redirect('/helpdesk?error=Only+administrators+can+update+tickets'); const schoolId = await getActiveSchoolId(user);
  const ticketId = String(formData.get('ticketId') || ''); const status = String(formData.get('status') || 'IN_PROGRESS'); if (!['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].includes(status)) redirect('/helpdesk?error=Invalid+ticket+status');
  const ticket = (await db.select().from(supportTickets).where(and(eq(supportTickets.id, ticketId), eq(supportTickets.schoolId, schoolId))).limit(1))[0]; if (!ticket) redirect('/helpdesk?error=Ticket+not+found');
  const resolution = String(formData.get('resolution') || '').trim() || ticket.resolution;
  await db.update(supportTickets).set({ status, resolution, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
  await audit({ schoolId, userId: user.id, action: 'SUPPORT_TICKET_UPDATED', entityType: 'SupportTicket', entityId: ticketId, oldValue: { status: ticket.status, resolution: ticket.resolution }, newValue: { status, resolution } });
  revalidatePath('/helpdesk'); redirect('/helpdesk?success=Ticket+updated');
}
