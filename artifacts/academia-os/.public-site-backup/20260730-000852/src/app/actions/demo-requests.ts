'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { demoRequests } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { cleanText, isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from '@/lib/validation';

// ── Public: submit a demo request ────────────────────────────────────────────
export type DemoRequestState = { status: 'idle' | 'success' | 'error'; message?: string };

export async function submitDemoRequestAction(
  _prev: DemoRequestState,
  formData: FormData,
): Promise<DemoRequestState> {
  const schoolName   = cleanText(formData.get('schoolName'), 200);
  const contactName  = cleanText(formData.get('contactName'), 120);
  const email        = normalizeEmail(formData.get('email'));
  const phone        = normalizePhone(formData.get('phone'));
  const learnerCount = parseInt(String(formData.get('learnerCount') || ''), 10) || null;
  const staffCount   = parseInt(String(formData.get('staffCount') || ''), 10) || null;
  const message      = cleanText(formData.get('message'), 1000) || null;

  if (!schoolName) return { status: 'error', message: 'Enter your school name.' };
  if (!contactName) return { status: 'error', message: 'Enter the contact person\'s name.' };
  if (!isValidEmail(email)) return { status: 'error', message: 'Enter a valid email address.' };
  if (!isValidPhone(phone)) return { status: 'error', message: 'Enter a valid phone number.' };

  await db.insert(demoRequests).values({
    schoolName,
    contactName,
    email,
    phone,
    learnerCount,
    staffCount,
    message,
    status: 'PENDING',
  });

  return { status: 'success', message: 'Request received! We will be in touch within 24 hours.' };
}

// ── Super admin: update request status / notes ────────────────────────────────
export async function updateDemoRequestAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') return;

  const id     = String(formData.get('id'));
  const status = String(formData.get('status'));
  const notes  = cleanText(formData.get('notes'), 1000) || null;

  if (!['PENDING', 'APPROVED', 'DECLINED'].includes(status)) return;

  await db.update(demoRequests)
    .set({ status, notes, updatedAt: new Date() })
    .where(eq(demoRequests.id, id));

  revalidatePath('/demo-requests');
}

// ── Super admin: delete a request ────────────────────────────────────────────
export async function deleteDemoRequestAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') return;
  const id = String(formData.get('id'));
  await db.delete(demoRequests).where(eq(demoRequests.id, id));
  revalidatePath('/demo-requests');
}
