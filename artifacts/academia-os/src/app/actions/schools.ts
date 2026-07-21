'use server';

import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { schools, users } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { generateTemporaryPassword, usernameBaseFromName } from '@/lib/credentials';
import { imageToDataUrl, ImageUploadError } from '@/lib/images';
import { setActiveSchoolCookie } from '@/lib/tenant';
import { cleanCode, cleanText, isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from '@/lib/validation';

const TEMPORARY_PASSWORD_HOURS = 24;

export type SchoolCreateState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  username?: string;
  temporaryPassword?: string;
};

async function availableUsername(name: string) {
  const base = usernameBaseFromName(name);
  for (let number = 1; number <= 9999; number += 1) {
    const candidate = number === 1 ? base : `${base}${number}`;
    const exists = (await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1))[0];
    if (!exists) return candidate;
  }
  throw new Error('Unable to generate username');
}

export async function createSchoolAction(
  _previousState: SchoolCreateState,
  formData: FormData
): Promise<SchoolCreateState> {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') return { status: 'error', message: 'Only the Super Admin can register schools.' };

  const name = cleanText(formData.get('name'), 160);
  const code = cleanCode(formData.get('code'), 20);
  const address = cleanText(formData.get('address'), 300) || null;
  const schoolPhone = normalizePhone(formData.get('phone'));
  const schoolEmail = normalizeEmail(formData.get('email'));
  const adminName = cleanText(formData.get('adminName'), 120);
  const adminPhone = normalizePhone(formData.get('adminPhone'));
  const adminEmail = normalizeEmail(formData.get('adminEmail'));

  if (!name || code.length < 2 || !adminName || !isValidPhone(adminPhone) || !isValidEmail(adminEmail)) {
    return { status: 'error', message: 'Complete the school and administrator details, including a valid mobile number and email.' };
  }
  if (schoolPhone && !isValidPhone(schoolPhone)) return { status: 'error', message: 'Enter a valid school telephone number.' };
  if (schoolEmail && !isValidEmail(schoolEmail)) return { status: 'error', message: 'Enter a valid school email address.' };

  let logoUrl: string;
  let adminPhotoUrl: string;
  try {
    logoUrl = (await imageToDataUrl(formData.get('logo'), { required: true, label: 'School logo' }))!;
    adminPhotoUrl = (await imageToDataUrl(formData.get('adminPhoto'), { required: true, label: 'Administrator photo' }))!;
  } catch (error) {
    return { status: 'error', message: error instanceof ImageUploadError ? error.message : 'The uploaded image could not be processed.' };
  }

  const username = await availableUsername(adminName);
  const temporaryPassword = generateTemporaryPassword(6);
  const temporaryPasswordExpiresAt = new Date(Date.now() + TEMPORARY_PASSWORD_HOURS * 60 * 60 * 1000);

  try {
    const school = await db.transaction(async (tx) => {
      const [created] = await tx.insert(schools).values({
        name,
        code,
        logoUrl,
        address,
        phone: schoolPhone || null,
        email: schoolEmail || null
      }).returning();

      await tx.insert(users).values({
        schoolId: created.id,
        name: adminName,
        username,
        email: adminEmail,
        phone: adminPhone,
        photoUrl: adminPhotoUrl,
        role: 'SCHOOL_ADMIN',
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        mustChangePassword: true,
        temporaryPasswordExpiresAt
      });
      return created;
    });

    await audit({
      userId: user.id,
      action: 'SCHOOL_CREATED',
      entityType: 'School',
      entityId: school.id,
      newValue: { name, code, adminUsername: username, temporaryPasswordExpiresInHours: TEMPORARY_PASSWORD_HOURS }
    });
  } catch {
    return { status: 'error', message: 'School code already exists or the record could not be created.' };
  }

  revalidatePath('/schools');
  return {
    status: 'success',
    message: `School and first administrator created. The temporary password expires in ${TEMPORARY_PASSWORD_HOURS} hours.`,
    username,
    temporaryPassword
  };
}

export async function toggleSchoolAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') redirect('/dashboard');
  const schoolId = cleanText(formData.get('schoolId'), 100);
  const active = formData.get('active') === 'true';
  const school = (await db.select({ id: schools.id, isActive: schools.isActive }).from(schools).where(eq(schools.id, schoolId)).limit(1))[0];
  if (!school) redirect('/schools?error=School+not+found');
  await db.update(schools).set({ isActive: active, updatedAt: new Date() }).where(eq(schools.id, schoolId));
  await audit({
    userId: user.id,
    schoolId,
    action: active ? 'SCHOOL_ACTIVATED' : 'SCHOOL_SUSPENDED',
    entityType: 'School',
    entityId: schoolId,
    oldValue: { isActive: school.isActive },
    newValue: { isActive: active }
  });
  revalidatePath('/schools');
  redirect('/schools?success=School+status+updated');
}

export async function selectSchoolAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') redirect('/dashboard');
  const schoolId = cleanText(formData.get('schoolId'), 100);
  const school = (await db.select({ id: schools.id }).from(schools)
    .where(and(eq(schools.id, schoolId), eq(schools.isActive, true))).limit(1))[0];
  if (!school) redirect('/schools?error=School+not+found+or+suspended');
  await setActiveSchoolCookie(schoolId);
  await audit({ userId: user.id, schoolId, action: 'SCHOOL_CONTEXT_SELECTED', entityType: 'School', entityId: schoolId });
  redirect('/dashboard?success=School+workspace+opened');
}
