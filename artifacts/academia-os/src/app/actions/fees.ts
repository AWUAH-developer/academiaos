'use server';
import crypto from 'crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { feeCategories, feeCharges, feeFollowUps, financialAdjustments, guardians, learnerGuardians, learners, notifications, paymentAllocations, payments } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { allocatePayment } from '@/lib/fees';
import { canRecordPayments, canRecordFeeFollowUp, canSendFeeReminder } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';
import { notifyLearnerGuardians } from '@/lib/notifications';

function receiptNo(code: string) { return `${code}-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }

export async function createFeeChargeAction(formData: FormData) {
  const user = await requireUser(); if (!canRecordPayments(user.role)) redirect('/fees?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || ''); const categoryId = String(formData.get('categoryId') || '') || null; const description = String(formData.get('description') || '').trim(); const amount = Number(formData.get('amount'));
  if (!learnerId || !description || !Number.isFinite(amount) || amount <= 0) redirect('/fees?error=Enter+a+valid+charge');
  const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0]; if (!learner) redirect('/fees?error=Learner+not+found');
  if (categoryId) { const category = (await db.select({ id: feeCategories.id }).from(feeCategories).where(and(eq(feeCategories.id, categoryId), eq(feeCategories.schoolId, schoolId))).limit(1))[0]; if (!category) redirect('/fees?error=Fee+category+not+found'); }
  const [charge] = await db.insert(feeCharges).values({ schoolId, learnerId, categoryId, description, amount, dueDate: formData.get('dueDate') ? new Date(String(formData.get('dueDate'))) : null }).returning();
  await audit({ schoolId, userId: user.id, action: 'FEE_CHARGE_CREATED', entityType: 'FeeCharge', entityId: charge.id, newValue: { learnerId, description, amount } }); revalidatePath('/fees'); revalidatePath('/dashboard'); redirect('/fees?success=Charge+created');
}

export async function recordPaymentAction(formData: FormData) {
  const user = await requireUser(); if (!canRecordPayments(user.role)) redirect('/fees?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || ''); const amount = Number(formData.get('amount')); const method = String(formData.get('method') || 'CASH');
  if (!learnerId || !Number.isFinite(amount) || amount <= 0 || !['CASH','MOBILE_MONEY','BANK','CARD'].includes(method)) redirect('/fees?error=Enter+a+valid+payment');
  const learner = (await db.select().from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0]; if (!learner) redirect('/fees?error=Learner+not+found');
  const schoolCode = user.school?.code || 'SCH';
  const payment = await db.transaction(async (tx) => {
    const [created] = await tx.insert(payments).values({ schoolId, learnerId, amount, method, reference: String(formData.get('reference') || '').trim() || null, notes: String(formData.get('notes') || '').trim() || null, receiptNo: receiptNo(schoolCode), recordedById: user.id }).returning();
    const openCharges = await tx.select().from(feeCharges).where(and(eq(feeCharges.schoolId, schoolId), eq(feeCharges.learnerId, learnerId), inArray(feeCharges.status, ['OPEN','PARTIALLY_PAID']))).orderBy(asc(feeCharges.createdAt));
    const result = allocatePayment(amount, openCharges.map((c) => ({ id: c.id, amount: c.amount, paidAmount: c.paidAmount })));
    for (const allocation of result.allocations) {
      const charge = openCharges.find((c) => c.id === allocation.chargeId)!; const nextPaid = charge.paidAmount + allocation.amount;
      await tx.insert(paymentAllocations).values({ schoolId, paymentId: created.id, chargeId: charge.id, amount: allocation.amount });
      await tx.update(feeCharges).set({ paidAmount: nextPaid, status: nextPaid >= charge.amount ? 'PAID' : 'PARTIALLY_PAID', updatedAt: new Date() }).where(eq(feeCharges.id, charge.id));
    }
    return created;
  });
  await notifyLearnerGuardians({ schoolId, learnerId, type: 'PAYMENT', title: 'School fee payment received', body: `${user.school?.currency || 'GHS'} ${amount.toFixed(2)} was recorded. Receipt: ${payment.receiptNo}.`, link: `/fees/receipt/${payment.id}` });
  await audit({ schoolId, userId: user.id, action: 'PAYMENT_RECORDED', entityType: 'Payment', entityId: payment.id, newValue: { learnerId, amount, method, receiptNo: payment.receiptNo } }); revalidatePath('/fees'); revalidatePath('/dashboard'); redirect(`/fees?success=${encodeURIComponent(`Payment recorded. Receipt ${payment.receiptNo}`)}`);
}

export async function reversePaymentAction(formData: FormData) {
  const user = await requireUser(); if (!['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR'].includes(user.role)) redirect('/fees?error=Only+an+authorised+administrator+can+reverse+a+payment'); const schoolId = await getActiveSchoolId(user);
  const paymentId = String(formData.get('paymentId') || ''); const reason = String(formData.get('reason') || '').trim(); if (!reason) redirect('/fees?error=A+reason+is+required+for+reversal');
  const payment = (await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.schoolId, schoolId))).limit(1))[0]; if (!payment) redirect('/fees?error=Payment+not+found');
  const already = (await db.select({ id: financialAdjustments.id }).from(financialAdjustments).where(and(eq(financialAdjustments.paymentId, paymentId), eq(financialAdjustments.type, 'PAYMENT_REVERSAL'))).limit(1))[0]; if (already) redirect('/fees?error=Payment+has+already+been+reversed');
  await db.transaction(async (tx) => {
    const allocations = await tx.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, paymentId));
    for (const allocation of allocations) { const charge = (await tx.select().from(feeCharges).where(eq(feeCharges.id, allocation.chargeId)).limit(1))[0]; if (charge) { const nextPaid = Math.max(0, charge.paidAmount - allocation.amount); await tx.update(feeCharges).set({ paidAmount: nextPaid, status: nextPaid === 0 ? 'OPEN' : 'PARTIALLY_PAID', updatedAt: new Date() }).where(eq(feeCharges.id, charge.id)); } }
    await tx.insert(financialAdjustments).values({ schoolId, learnerId: payment.learnerId, paymentId, type: 'PAYMENT_REVERSAL', amount: payment.amount, reason, requestedById: user.id, approvedById: user.id, approvedAt: new Date() });
  });
  await audit({ schoolId, userId: user.id, action: 'PAYMENT_REVERSED', entityType: 'Payment', entityId: payment.id, oldValue: { amount: payment.amount, receiptNo: payment.receiptNo }, newValue: { reason } }); revalidatePath('/fees'); revalidatePath('/dashboard'); redirect('/fees?success=Payment+reversed+with+an+audit+record');
}

// ── Fee arrears follow-up ──────────────────────────────────────────────────────

const VALID_CONTACT_METHODS = ['PHONE','SMS','WHATSAPP','EMAIL','IN_PERSON'] as const;
const VALID_OUTCOMES = ['CONTACTED','PROMISED_PAYMENT','PARTIALLY_RESOLVED','UNREACHABLE','DISPUTED','REFERRED_TO_MANAGEMENT'] as const;

export async function recordFeeFollowUpAction(formData: FormData) {
  const user = await requireUser();
  if (!canRecordFeeFollowUp(user.role)) redirect('/fee-arrears?error=Permission+denied');
  const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || '');
  const contactMethod = String(formData.get('contactMethod') || '');
  const outcome = String(formData.get('outcome') || '');
  const note = String(formData.get('note') || '').trim() || null;
  const rawPromised = String(formData.get('promisedPaymentDate') || '').trim();
  const rawNext = String(formData.get('nextFollowUpDate') || '').trim();
  if (!learnerId || !contactMethod || !outcome) redirect('/fee-arrears?error=Contact+method+and+outcome+are+required');
  if (!(VALID_CONTACT_METHODS as readonly string[]).includes(contactMethod)) redirect('/fee-arrears?error=Invalid+contact+method');
  if (!(VALID_OUTCOMES as readonly string[]).includes(outcome)) redirect('/fee-arrears?error=Invalid+outcome');
  const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0];
  if (!learner) redirect('/fee-arrears?error=Learner+not+found');
  const promisedPaymentDate = rawPromised ? new Date(rawPromised) : null;
  const nextFollowUpDate = rawNext ? new Date(rawNext) : null;
  await db.insert(feeFollowUps).values({ schoolId, learnerId, contactMethod, outcome, note, promisedPaymentDate, nextFollowUpDate, recordedById: user.id });
  await audit({ schoolId, userId: user.id, action: 'FEE_FOLLOW_UP_RECORDED', entityType: 'FeeFollowUp', entityId: learnerId, newValue: { contactMethod, outcome, note, promisedPaymentDate, nextFollowUpDate } });
  revalidatePath('/fee-arrears');
  redirect(`/fee-arrears?success=Follow-up+recorded+for+learner`);
}

export async function sendFeeReminderAction(formData: FormData) {
  const user = await requireUser();
  if (!canSendFeeReminder(user.role)) redirect('/fee-arrears?error=Permission+denied');
  const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || '');
  const outstanding = String(formData.get('outstanding') || '0');
  const learnerName = String(formData.get('learnerName') || '');
  if (!learnerId) redirect('/fee-arrears?error=Learner+not+found');
  // Notify linked guardian accounts (in-app notification). External SMS/WhatsApp/email
  // channels will activate once messaging providers are configured in School Settings.
  const guardianLinks = await db.select({ userId: guardians.userId, phone: guardians.phone })
    .from(learnerGuardians).innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
    .where(and(eq(learnerGuardians.learnerId, learnerId)));
  const currency = user.school?.currency ?? 'GHS';
  const schoolName = user.school?.name ?? 'Your school';
  // phone is not on the session school object — fetch it directly
  const { schools } = await import('@/db/schema');
  const schoolRow = user.school ? (await db.select({ phone: schools.phone }).from(schools).where(eq(schools.id, user.school.id)).limit(1))[0] : null;
  const schoolPhone = schoolRow?.phone ?? '';
  let notified = 0;
  for (const g of guardianLinks) {
    if (g.userId) {
      await db.insert(notifications).values({ schoolId, userId: g.userId, type: 'PAYMENT', title: `Fee payment reminder — ${learnerName}`, body: `Outstanding balance: ${currency} ${Number(outstanding).toFixed(2)}. Please contact ${schoolName}${schoolPhone ? ` on ${schoolPhone}` : ''} to settle this balance.`, link: '/fees' });
      notified++;
    }
  }
  await audit({ schoolId, userId: user.id, action: 'FEE_REMINDER_SENT', entityType: 'Learner', entityId: learnerId, newValue: { outstanding, guardiansNotified: notified } });
  const latestFollowUp = (await db.select({ id: feeFollowUps.id }).from(feeFollowUps).where(and(eq(feeFollowUps.learnerId, learnerId), eq(feeFollowUps.schoolId, schoolId))).orderBy(desc(feeFollowUps.createdAt)).limit(1))[0];
  if (!latestFollowUp) await db.insert(feeFollowUps).values({ schoolId, learnerId, contactMethod: 'IN_PERSON', outcome: 'CONTACTED', note: `Reminder sent via system notification to ${notified} guardian account(s).`, recordedById: user.id });
  revalidatePath('/fee-arrears');
  redirect(`/fee-arrears?success=Reminder+sent+to+${notified}+guardian+account(s)`);
}
