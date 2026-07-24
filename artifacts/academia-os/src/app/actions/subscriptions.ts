'use server';

import bcrypt from 'bcryptjs';
import { and, desc, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  packageAddons, packages, schoolSubscriptions, schools,
  subscriptionAddons, subscriptionPayments, users,
} from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { generateTemporaryPassword, usernameBaseFromName } from '@/lib/credentials';
import { imageToDataUrl, ImageUploadError } from '@/lib/images';
import { cleanText, isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from '@/lib/validation';

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
const TEMPORARY_PASSWORD_HOURS = 72;

async function availableUsername(name: string) {
  const base = usernameBaseFromName(name);
  for (let n = 1; n <= 9999; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    const exists = (await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1))[0];
    if (!exists) return candidate;
  }
  throw new Error('Unable to generate a unique username');
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrol school (create + package + subscription + payment + activate)
// ─────────────────────────────────────────────────────────────────────────────
export type EnrolSchoolState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  username?: string;
  temporaryPassword?: string;
  schoolId?: string;
};

export async function enrolSchoolAction(
  _prev: EnrolSchoolState,
  formData: FormData,
): Promise<EnrolSchoolState> {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') return { status: 'error', message: 'Only the Super Admin can enrol schools.' };

  // School fields
  const name        = cleanText(formData.get('name'), 160);
  const code        = cleanText(formData.get('code'), 20)?.toUpperCase();
  const address     = cleanText(formData.get('address'), 300) || null;
  const schoolPhone = normalizePhone(formData.get('phone'));
  const schoolEmail = normalizeEmail(formData.get('email'));

  // Admin fields
  const adminName  = cleanText(formData.get('adminName'), 120);
  const adminPhone = normalizePhone(formData.get('adminPhone'));
  const adminEmail = normalizeEmail(formData.get('adminEmail'));
  const adminRole  = (formData.get('adminRole') as string) || 'SCHOOL_ADMIN';

  // Package & subscription
  const packageId    = cleanText(formData.get('packageId'), 36);
  const academicYear = cleanText(formData.get('academicYear'), 20);
  const term         = cleanText(formData.get('term'), 20);
  const startDate    = formData.get('startDate') ? new Date(String(formData.get('startDate'))) : new Date();
  const endDate      = formData.get('endDate')   ? new Date(String(formData.get('endDate')))   : new Date(Date.now() + 90 * 86400000);
  const addonIds     = formData.getAll('addonIds').map(String).filter(Boolean);
  const subNotes     = cleanText(formData.get('subNotes'), 500) || null;

  // Payment
  const paymentAmount = parseFloat(String(formData.get('paymentAmount') || '0')) || 0;
  const paymentMethod = cleanText(formData.get('paymentMethod'), 40) || 'CASH';
  const paymentRef    = cleanText(formData.get('paymentReference'), 120) || null;

  // Validate required fields
  if (!name || !code || code.length < 2) return { status: 'error', message: 'Enter a valid school name and code.' };
  if (!adminName || !isValidPhone(adminPhone) || !isValidEmail(adminEmail)) return { status: 'error', message: 'Enter the administrator name, a valid phone number and email.' };
  if (!packageId) return { status: 'error', message: 'Select a package.' };
  if (!academicYear || !term) return { status: 'error', message: 'Set the academic year and term.' };
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { status: 'error', message: 'Enter valid start and end dates.' };

  // Fetch package to get price
  const pkg = (await db.select().from(packages).where(eq(packages.id, packageId)).limit(1))[0];
  if (!pkg) return { status: 'error', message: 'Selected package not found.' };

  // Fetch add-on prices
  let addonsTotal = 0;
  const addonRows = addonIds.length
    ? await db.select().from(packageAddons).where(
        sql`${packageAddons.id} = ANY(${addonIds})`
      )
    : [];
  for (const a of addonRows) addonsTotal += parseFloat(String(a.pricePerTerm));

  const baseAmount  = parseFloat(String(pkg.pricePerTerm));
  const totalAmount = baseAmount + addonsTotal;
  const activateNow = paymentAmount >= totalAmount;

  // Images
  let logoUrl: string;
  let adminPhotoUrl: string;
  try {
    logoUrl       = (await imageToDataUrl(formData.get('logo'),      { required: true, label: 'School logo' }))!;
    adminPhotoUrl = (await imageToDataUrl(formData.get('adminPhoto'), { required: true, label: 'Administrator photo' }))!;
  } catch (e) {
    return { status: 'error', message: e instanceof ImageUploadError ? e.message : 'Image upload failed.' };
  }

  const username              = await availableUsername(adminName);
  const temporaryPassword     = generateTemporaryPassword(8);
  const passwordHash          = await bcrypt.hash(temporaryPassword, 12);
  const tempExpiry            = new Date(Date.now() + TEMPORARY_PASSWORD_HOURS * 3600000);

  try {
    const { schoolId, subId } = await db.transaction(async (tx) => {
      // 1. Create school
      const [school] = await tx.insert(schools).values({
        name, code, logoUrl, address,
        phone: schoolPhone || null,
        email: schoolEmail || null,
        isActive: activateNow,
      }).returning({ id: schools.id });

      // 2. Create admin user
      await tx.insert(users).values({
        schoolId: school.id, name: adminName, username,
        email: adminEmail, phone: adminPhone,
        photoUrl: adminPhotoUrl, passwordHash,
        role: adminRole, status: 'ACTIVE',
        mustChangePassword: true,
        temporaryPasswordExpiresAt: tempExpiry,
      });

      // 3. Create subscription
      const [sub] = await tx.insert(schoolSubscriptions).values({
        schoolId: school.id, packageId,
        academicYear, term,
        startDate, endDate,
        baseAmount: String(baseAmount),
        addonsAmount: String(addonsTotal),
        totalAmount: String(totalAmount),
        paidAmount: String(paymentAmount),
        status: activateNow ? 'ACTIVE' : 'PENDING',
        notes: subNotes,
        createdById: actor.id,
      }).returning({ id: schoolSubscriptions.id });

      // 4. Link add-ons
      if (addonRows.length) {
        await tx.insert(subscriptionAddons).values(
          addonRows.map(a => ({
            subscriptionId: sub.id,
            addonId: a.id,
            priceAtTime: String(a.pricePerTerm),
          }))
        );
      }

      // 5. Record payment (if any)
      if (paymentAmount > 0) {
        await tx.insert(subscriptionPayments).values({
          subscriptionId: sub.id,
          schoolId: school.id,
          amount: String(paymentAmount),
          method: paymentMethod,
          reference: paymentRef,
          recordedById: actor.id,
        });
      }

      return { schoolId: school.id, subId: sub.id };
    });

    await audit({ userId: actor.id, schoolId, action: 'SCHOOL_ENROLLED', entityType: 'school', entityId: schoolId, newValue: { package: pkg.name, term, activateNow } });
    revalidatePath('/schools');

    return {
      status: 'success',
      message: activateNow
        ? `${name} has been enrolled and activated.`
        : `${name} created. Activate by recording a payment against the subscription.`,
      username,
      temporaryPassword,
      schoolId,
    };
  } catch (e: any) {
    if (e?.code === '23505') return { status: 'error', message: 'A school with that code already exists.' };
    return { status: 'error', message: 'Failed to enrol school. Please try again.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Add subscription payment
// ─────────────────────────────────────────────────────────────────────────────
export async function recordSubscriptionPaymentAction(formData: FormData) {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') return;

  const subscriptionId = String(formData.get('subscriptionId'));
  const amount         = parseFloat(String(formData.get('amount') || '0'));
  const method         = cleanText(formData.get('method'), 40) || 'CASH';
  const reference      = cleanText(formData.get('reference'), 120) || null;

  if (!subscriptionId || amount <= 0) return;

  const [sub] = await db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.id, subscriptionId)).limit(1);
  if (!sub) return;

  await db.transaction(async (tx) => {
    await tx.insert(subscriptionPayments).values({
      subscriptionId, schoolId: sub.schoolId,
      amount: String(amount), method, reference,
      recordedById: actor.id,
    });

    const newPaid   = parseFloat(String(sub.paidAmount)) + amount;
    const newStatus = newPaid >= parseFloat(String(sub.totalAmount)) ? 'ACTIVE' : sub.status;

    await tx.update(schoolSubscriptions)
      .set({ paidAmount: String(newPaid), status: newStatus, updatedAt: new Date() })
      .where(eq(schoolSubscriptions.id, subscriptionId));

    // Activate the school if fully paid
    if (newStatus === 'ACTIVE') {
      await tx.update(schools)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(schools.id, sub.schoolId));
    }
  });

  revalidatePath('/schools');
}

// ─────────────────────────────────────────────────────────────────────────────
// Package management
// ─────────────────────────────────────────────────────────────────────────────
export async function createPackageAction(formData: FormData) {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') return;

  const name        = cleanText(formData.get('name'), 80);
  const description = cleanText(formData.get('description'), 400) || null;
  const price       = parseFloat(String(formData.get('pricePerTerm') || '0'));
  const maxLearners = parseInt(String(formData.get('maxLearners') || '')) || null;
  const maxStaff    = parseInt(String(formData.get('maxStaff') || ''))    || null;
  const rawFeatures = cleanText(formData.get('features'), 2000) || '';
  const features    = rawFeatures.split('\n').map(s => s.trim()).filter(Boolean);

  if (!name || isNaN(price)) return;

  await db.insert(packages).values({
    name, description, pricePerTerm: String(price),
    maxLearners, maxStaff, features,
  });
  revalidatePath('/packages');
}

export async function togglePackageAction(formData: FormData) {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') return;
  const id = String(formData.get('id'));
  const current = (await db.select({ isActive: packages.isActive }).from(packages).where(eq(packages.id, id)).limit(1))[0];
  if (!current) return;
  await db.update(packages).set({ isActive: !current.isActive, updatedAt: new Date() }).where(eq(packages.id, id));
  revalidatePath('/packages');
}
