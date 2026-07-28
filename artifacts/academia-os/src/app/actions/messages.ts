'use server';
import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { feeCharges, financialAdjustments, guardians, learnerGuardians, messages, notifications, payments, transportAssignments, users } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { calculateFinancialBalance } from '@/lib/financial-balance';
import { getActiveSchoolId } from '@/lib/tenant';

const staffRoles = ['SCHOOL_ADMIN','PROPRIETOR','HEADTEACHER','ACADEMIC_ADMIN','TEACHER','ACCOUNTS','TRANSPORT','SECURITY','RECEPTIONIST','LIBRARIAN','CANTEEN'];

async function audienceUserIds(schoolId: string, audience: string, recipient: string) {
  if (audience === 'INDIVIDUAL') {
    if (!recipient) return [];
    return (await db.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), or(eq(users.username, recipient.toLowerCase()), eq(users.email, recipient), eq(users.phone, recipient))))).map((row) => row.id);
  }
  if (audience === 'ALL') return (await db.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), eq(users.status, 'ACTIVE')))).map((row) => row.id);
  if (audience === 'PARENTS') return (await db.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), eq(users.role, 'PARENT'), eq(users.status, 'ACTIVE')))).map((row) => row.id);
  if (audience === 'TEACHERS') return (await db.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), inArray(users.role, ['TEACHER','HEADTEACHER','ACADEMIC_ADMIN']), eq(users.status, 'ACTIVE')))).map((row) => row.id);
  if (audience === 'STAFF') return (await db.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), inArray(users.role, staffRoles), eq(users.status, 'ACTIVE')))).map((row) => row.id);
  if (audience === 'TRANSPORT') {
    const learnerIds = (await db.select({ learnerId: transportAssignments.learnerId }).from(transportAssignments).where(and(eq(transportAssignments.schoolId, schoolId), eq(transportAssignments.isActive, true)))).map((row) => row.learnerId);
    if (!learnerIds.length) return [];
    const rows = await db.select({ userId: guardians.userId }).from(learnerGuardians).innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id)).where(inArray(learnerGuardians.learnerId, learnerIds));
    return Array.from(new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id))));
  }
  if (audience === 'OUTSTANDING_FEES') {
    const chargeTotals = await db
      .select({
        learnerId: feeCharges.learnerId,
        total: sql<number>`coalesce(sum(${feeCharges.amount}), 0)::numeric`,
      })
      .from(feeCharges)
      .where(eq(feeCharges.schoolId, schoolId))
      .groupBy(feeCharges.learnerId);

    if (!chargeTotals.length) return [];

    const candidateLearnerIds = chargeTotals.map(
      (row) => row.learnerId,
    );

    const paymentTotals = await db
      .select({
        learnerId: payments.learnerId,
        total: sql<number>`coalesce(sum(${payments.amount}), 0)::numeric`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.schoolId, schoolId),
          inArray(
            payments.learnerId,
            candidateLearnerIds,
          ),
        ),
      )
      .groupBy(payments.learnerId);

    const adjustmentRows = await db
      .select({
        learnerId: financialAdjustments.learnerId,
        type: financialAdjustments.type,
        amount: financialAdjustments.amount,
      })
      .from(financialAdjustments)
      .where(
        and(
          eq(financialAdjustments.schoolId, schoolId),
          inArray(
            financialAdjustments.learnerId,
            candidateLearnerIds,
          ),
          isNotNull(financialAdjustments.approvedAt),
        ),
      );

    const chargeTotalByLearner = new Map(
      chargeTotals.map((row) => [
        row.learnerId,
        Number(row.total || 0),
      ]),
    );

    const paymentTotalByLearner = new Map(
      paymentTotals.map((row) => [
        row.learnerId,
        Number(row.total || 0),
      ]),
    );

    const learnerIds = candidateLearnerIds.filter(
      (learnerId) => {
        const adjustments = adjustmentRows
          .filter(
            (adjustment) =>
              adjustment.learnerId === learnerId,
          )
          .map((adjustment) => ({
            type: adjustment.type,
            amount: Number(adjustment.amount || 0),
          }));

        const balance = calculateFinancialBalance({
          totalCharges:
            chargeTotalByLearner.get(learnerId) || 0,
          totalPayments:
            paymentTotalByLearner.get(learnerId) || 0,
          adjustments,
        });

        return balance > 0;
      },
    );

    if (!learnerIds.length) return [];

    const rows = await db
      .select({ userId: guardians.userId })
      .from(learnerGuardians)
      .innerJoin(
        guardians,
        eq(learnerGuardians.guardianId, guardians.id),
      )
      .where(
        inArray(
          learnerGuardians.learnerId,
          learnerIds,
        ),
      );

    return Array.from(
      new Set(
        rows
          .map((row) => row.userId)
          .filter(
            (id): id is string => Boolean(id),
          ),
      ),
    );
  }
  return [];
}


async function audienceExternalRecipients(schoolId: string, audience: string, channel: string, recipient: string) {
  if (audience === 'INDIVIDUAL') return recipient ? [recipient] : [];
  const userIds = await audienceUserIds(schoolId, audience, '');
  if (!userIds.length) return [];
  const userRows = await db.select({ id: users.id, phone: users.phone, email: users.email }).from(users).where(inArray(users.id, userIds));
  const guardianRows = await db.select({ userId: guardians.userId, phone: guardians.phone, email: guardians.email }).from(guardians).where(inArray(guardians.userId, userIds));
  const contactByUser = new Map<string, string>();
  for (const row of userRows) {
    const value = channel === 'EMAIL' ? row.email : row.phone;
    if (value) contactByUser.set(row.id, value.trim());
  }
  for (const row of guardianRows) {
    if (!row.userId || contactByUser.has(row.userId)) continue;
    const value = channel === 'EMAIL' ? row.email : row.phone;
    if (value) contactByUser.set(row.userId, value.trim());
  }
  return Array.from(new Set(contactByUser.values())).filter(Boolean).slice(0, 2000);
}

export async function sendMessageAction(formData: FormData) {
  const user = await requireUser(); const schoolId = await getActiveSchoolId(user);
  if (!['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR','HEADTEACHER','ACADEMIC_ADMIN','TEACHER','ACCOUNTS','TRANSPORT','RECEPTIONIST'].includes(user.role)) redirect('/messages?error=Permission+denied');
  const channel = String(formData.get('channel') || 'IN_APP'); const audience = String(formData.get('audience') || 'ALL'); const recipient = String(formData.get('recipient') || '').trim(); const subject = String(formData.get('subject') || '').trim(); const body = String(formData.get('body') || '').trim();
  if (!body || !['IN_APP','SMS','WHATSAPP','EMAIL'].includes(channel)) redirect('/messages?error=Message+body+and+valid+channel+are+required');
  if (channel !== 'IN_APP' && audience === 'INDIVIDUAL' && !recipient) redirect('/messages?error=A+phone+number+or+email+is+required+for+an+individual+external+message');

  if (channel === 'IN_APP') {
    const recipientIds = await audienceUserIds(schoolId, audience, recipient);
    if (!recipientIds.length) redirect('/messages?error=No+matching+recipients+were+found');
    const [message] = await db.insert(messages).values({ schoolId, senderId: user.id, channel, audience, recipient: recipient || null, subject: subject || null, body, status: 'DELIVERED', sentAt: new Date(), deliveredAt: new Date() }).returning();
    for (const recipientId of recipientIds) await db.insert(notifications).values({ schoolId, userId: recipientId, type: 'ANNOUNCEMENT', title: subject || 'School message', body, link: '/messages' });
    await audit({ schoolId, userId: user.id, action: 'MESSAGE_DELIVERED_IN_APP', entityType: 'Message', entityId: message.id, newValue: { audience, recipientCount: recipientIds.length } });
    revalidatePath('/messages'); redirect(`/messages?success=${recipientIds.length}+in-app+notification(s)+delivered`);
  }

  const recipients = await audienceExternalRecipients(schoolId, audience, channel, recipient);
  if (!recipients.length) redirect('/messages?error=No+external+recipients+with+the+required+contact+details+were+found');
  const created = await db.insert(messages).values(recipients.map((target) => ({ schoolId, senderId: user.id, channel, audience, recipient: target, subject: subject || null, body, status: 'QUEUED' }))).returning({ id: messages.id });
  await audit({ schoolId, userId: user.id, action: 'MESSAGE_BATCH_QUEUED', entityType: 'Message', newValue: { channel, audience, recipientCount: created.length } });
  revalidatePath('/messages'); redirect(`/messages?success=${created.length}+message(s)+queued+for+the+configured+provider`);
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser(); const notificationId = String(formData.get('notificationId') || '');
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));
  revalidatePath('/messages');
}
