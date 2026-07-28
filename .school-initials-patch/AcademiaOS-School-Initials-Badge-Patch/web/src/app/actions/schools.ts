'use server';

import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { packages, schoolManagementControls, schoolSubscriptions, schools, users } from '@/db/schema';
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

  let logoUrl: string | null;
  let adminPhotoUrl: string;
  try {
    logoUrl = await imageToDataUrl(formData.get('logo'), { label: 'School logo' });
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


async function hasActivePremiumSubscription(schoolId: string) {
  const row = (await db
    .select({ id: schoolSubscriptions.id })
    .from(schoolSubscriptions)
    .innerJoin(packages, eq(schoolSubscriptions.packageId, packages.id))
    .where(and(
      eq(schoolSubscriptions.schoolId, schoolId),
      eq(schoolSubscriptions.status, 'ACTIVE'),
      eq(packages.name, 'Premium')
    ))
    .limit(1))[0];

  return Boolean(row);
}

export async function updateUserAdmissionManagementAction(formData: FormData) {
  const actor = await requireUser();

  if (actor.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const schoolId = cleanText(formData.get('schoolId'), 100);
  const mode = cleanText(formData.get('mode'), 20);

  if (!schoolId || !['unlock', 'save', 'lock'].includes(mode)) {
    redirect('/schools?error=Invalid+management+control+request');
  }

  const school = (await db
    .select({ id: schools.id, name: schools.name })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1))[0];

  if (!school) {
    redirect('/schools?error=School+not+found');
  }

  const current = (await db
    .select()
    .from(schoolManagementControls)
    .where(eq(schoolManagementControls.schoolId, schoolId))
    .limit(1))[0];

  const oldValue = current
    ? {
        enabled: current.userAdmissionEnabled,
        allowSchoolAdminLearners: current.allowSchoolAdminLearners,
        allowSchoolAdminStaff: current.allowSchoolAdminStaff,
        allowProprietorLearners: current.allowProprietorLearners,
        allowProprietorStaff: current.allowProprietorStaff,
      }
    : {
        enabled: false,
        allowSchoolAdminLearners: false,
        allowSchoolAdminStaff: false,
        allowProprietorLearners: false,
        allowProprietorStaff: false,
      };

  /* LOCK is always allowed for SUPER_ADMIN, even if Premium has expired. */
  if (mode === 'lock') {
    const locked = {
      userAdmissionEnabled: false,
      allowSchoolAdminLearners: false,
      allowSchoolAdminStaff: false,
      allowProprietorLearners: false,
      allowProprietorStaff: false,
      updatedById: actor.id,
      unlockedAt: null,
      updatedAt: new Date(),
    };

    await db
      .insert(schoolManagementControls)
      .values({
        schoolId,
        ...locked,
      })
      .onConflictDoUpdate({
        target: schoolManagementControls.schoolId,
        set: locked,
      });

    await audit({
      userId: actor.id,
      schoolId,
      action: 'USER_ADMISSION_MANAGEMENT_LOCKED',
      entityType: 'SchoolManagementControl',
      entityId: schoolId,
      oldValue,
      newValue: {
        enabled: false,
        allowSchoolAdminLearners: false,
        allowSchoolAdminStaff: false,
        allowProprietorLearners: false,
        allowProprietorStaff: false,
      },
    });

    revalidatePath('/schools');
    redirect(`/schools?expand=${schoolId}&success=School+Administrator+admissions+locked`);
  }

  /* Unlock/save requires an ACTIVE Premium subscription. */
  const premiumEligible = await hasActivePremiumSubscription(schoolId);

  if (!premiumEligible) {
    redirect(`/schools?expand=${schoolId}&error=Active+Premium+subscription+required`);
  }

  const allowSchoolAdminLearners =
    formData.get('allowSchoolAdminLearners') === 'on';

  const allowSchoolAdminStaff =
    formData.get('allowSchoolAdminStaff') === 'on';

  // Proprietors are oversight and approval users only. Creation rights
  // are never delegated to them, even if stale values exist in the table.
  const allowProprietorLearners = false;
  const allowProprietorStaff = false;

  if (!allowSchoolAdminLearners && !allowSchoolAdminStaff) {
    redirect(
      `/schools?expand=${schoolId}&error=Select+at+least+one+permission+before+unlocking`
    );
  }

  const now = new Date();

  const enabled = {
    userAdmissionEnabled: true,
    allowSchoolAdminLearners,
    allowSchoolAdminStaff,
    allowProprietorLearners,
    allowProprietorStaff,
    updatedById: actor.id,
    unlockedAt: current?.unlockedAt ?? now,
    updatedAt: now,
  };

  await db
    .insert(schoolManagementControls)
    .values({
      schoolId,
      ...enabled,
    })
    .onConflictDoUpdate({
      target: schoolManagementControls.schoolId,
      set: enabled,
    });

  await audit({
    userId: actor.id,
    schoolId,
    action: current?.userAdmissionEnabled
      ? 'USER_ADMISSION_MANAGEMENT_UPDATED'
      : 'USER_ADMISSION_MANAGEMENT_UNLOCKED',
    entityType: 'SchoolManagementControl',
    entityId: schoolId,
    oldValue,
    newValue: {
      enabled: true,
      allowSchoolAdminLearners,
      allowSchoolAdminStaff,
      allowProprietorLearners,
      allowProprietorStaff,
    },
  });

  revalidatePath('/schools');

  redirect(
    `/schools?expand=${schoolId}&success=School+Administrator+admission+permissions+saved`
  );
}
