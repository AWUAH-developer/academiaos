'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { demoRequests } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { cleanText, isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from '@/lib/validation';

export type DemoRequestState = { status: 'idle' | 'success' | 'error'; message?: string };

const PACKAGE_NAMES: Record<string, string> = {
  STARTER: 'Starter',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

const ADDON_NAMES: Record<string, string> = {
  SMART_ID: 'Smart ID',
  SECURITY: 'Security',
};

const CONTACT_NAMES: Record<string, string> = {
  PHONE: 'Phone call',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
};

export async function submitDemoRequestAction(
  _prev: DemoRequestState,
  formData: FormData,
): Promise<DemoRequestState> {
  const honeypot = cleanText(formData.get('website'), 120);
  if (honeypot) {
    return { status: 'success', message: 'Request received. We will be in touch.' };
  }

  const schoolName = cleanText(formData.get('schoolName'), 200);
  const contactName = cleanText(formData.get('contactName'), 120);
  const email = normalizeEmail(formData.get('email'));
  const phone = normalizePhone(formData.get('phone'));
  const learnerCount = parseInt(String(formData.get('learnerCount') || ''), 10) || null;
  const staffCount = parseInt(String(formData.get('staffCount') || ''), 10) || null;
  const schoolMessage = cleanText(formData.get('message'), 1400) || null;

  const contactRole = cleanText(formData.get('contactRole'), 80) || null;
  const country = cleanText(formData.get('country'), 80) || null;
  const region = cleanText(formData.get('region'), 120) || null;
  const whatsapp = normalizePhone(formData.get('whatsapp')) || null;
  const packageInterest = cleanText(formData.get('packageInterest'), 30).toUpperCase();
  const enquiryType = cleanText(formData.get('enquiryType'), 30).toUpperCase();
  const preferredContact = cleanText(formData.get('preferredContact'), 30).toUpperCase();
  const preferredDemoDate = cleanText(formData.get('preferredDemoDate'), 30) || null;
  const addonKeys = formData
    .getAll('addons')
    .map((value) => cleanText(value, 30).toUpperCase())
    .filter((value) => Boolean(ADDON_NAMES[value]));

  if (!schoolName) return { status: 'error', message: 'Enter your school name.' };
  if (!contactName) return { status: 'error', message: "Enter the contact person's name." };
  if (!isValidEmail(email)) return { status: 'error', message: 'Enter a valid email address.' };
  if (!isValidPhone(phone)) return { status: 'error', message: 'Enter a valid phone number.' };

  const isPackageForm = Boolean(
    contactRole || country || region || whatsapp || packageInterest || enquiryType || preferredContact || preferredDemoDate || addonKeys.length,
  );

  if (isPackageForm) {
    if (!contactRole) return { status: 'error', message: 'Select your role at the school.' };
    if (!country || !region) return { status: 'error', message: 'Enter the school country and city or region.' };
    if (!PACKAGE_NAMES[packageInterest]) return { status: 'error', message: 'Select Starter, Standard or Premium.' };
    if (!['PRICING', 'DEMO'].includes(enquiryType)) return { status: 'error', message: 'Select request pricing or request a demo.' };
    if (formData.get('consent') !== 'on') return { status: 'error', message: 'Confirm that AcademiaOS may contact you about this request.' };
  }

  const details = [
    enquiryType ? `Request type: ${enquiryType === 'PRICING' ? 'Pricing' : 'Demo'}` : null,
    packageInterest ? `Package interest: ${PACKAGE_NAMES[packageInterest]}` : null,
    addonKeys.length ? `Add-ons: ${addonKeys.map((key) => ADDON_NAMES[key]).join(', ')}` : null,
    contactRole ? `Contact role: ${contactRole}` : null,
    country || region ? `Location: ${[region, country].filter(Boolean).join(', ')}` : null,
    whatsapp ? `WhatsApp: ${whatsapp}` : null,
    preferredContact ? `Preferred contact: ${CONTACT_NAMES[preferredContact] || preferredContact}` : null,
    preferredDemoDate ? `Preferred demo date: ${preferredDemoDate}` : null,
  ].filter(Boolean);

  const message = [
    details.length ? details.join('\n') : null,
    schoolMessage ? `School message: ${schoolMessage}` : null,
  ].filter(Boolean).join('\n\n') || null;

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

  revalidatePath('/demo-requests');

  return {
    status: 'success',
    message: enquiryType === 'PRICING'
      ? 'Your pricing request has been recorded. The AcademiaOS team will contact your school with the appropriate package information.'
      : 'Your demo request has been recorded. The AcademiaOS team will contact your school to arrange the next step.',
  };
}

export async function updateDemoRequestAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') return;

  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  const notes = cleanText(formData.get('notes'), 1000) || null;

  if (!['PENDING', 'APPROVED', 'DECLINED'].includes(status)) return;

  await db
    .update(demoRequests)
    .set({ status, notes, updatedAt: new Date() })
    .where(eq(demoRequests.id, id));

  revalidatePath('/demo-requests');
}

export async function deleteDemoRequestAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') return;
  const id = String(formData.get('id'));
  await db.delete(demoRequests).where(eq(demoRequests.id, id));
  revalidatePath('/demo-requests');
}
