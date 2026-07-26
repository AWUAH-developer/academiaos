'use server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { classes, guardians, learnerGuardians, learners, users } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { canManageLearners } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';
import { canCreateUserAdmissionRecord } from '@/lib/user-admission';
import { imageToDataUrl, ImageUploadError } from '@/lib/images';
import { cleanIdentifier, cleanMultilineText, cleanText, isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from '@/lib/validation';

const TEMPORARY_PASSWORD_HOURS = 24;
const temporaryPasswordExpiry = () => new Date(Date.now() + TEMPORARY_PASSWORD_HOURS * 60 * 60 * 1000);

export async function createLearnerAction(formData: FormData) {
  const user = await requireUser();
  const schoolId = await getActiveSchoolId(user);

  const mayCreateLearner = await canCreateUserAdmissionRecord(
    user.role,
    schoolId,
    'learners'
  );

  if (!mayCreateLearner) {
    redirect(
      '/learners?error=New+learner+admission+is+locked+for+this+school.+Contact+the+AcademiaOS+Super+Admin'
    );
  }

  const admissionNo = cleanIdentifier(formData.get('admissionNo'), 40);
  const firstName = cleanText(formData.get('firstName'), 80);
  const lastName = cleanText(formData.get('lastName'), 80);
  const classId = cleanText(formData.get('classId'), 100) || null;
  const guardianName = cleanText(formData.get('guardianName'), 120);
  const guardianPhone = normalizePhone(formData.get('guardianPhone'));
  const guardianEmail = normalizeEmail(formData.get('guardianEmail'));

  if (!admissionNo || !firstName || !lastName) redirect('/learners?error=Admission+number+and+learner+name+are+required');
  if (!guardianName || !isValidPhone(guardianPhone) || !isValidEmail(guardianEmail)) redirect('/learners?error=Parent+name,+valid+mobile+number+and+email+address+are+required');

  let photoUrl: string;
  try {
    photoUrl = (await imageToDataUrl(formData.get('photo'), { required: true, label: 'Learner photo' }))!;
  } catch (error) {
    redirect(`/learners?error=${encodeURIComponent(error instanceof ImageUploadError ? error.message : 'Learner photo could not be processed')}`);
  }

  if (classId) {
    const exists = (await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId))).limit(1))[0];
    if (!exists) redirect('/learners?error=Selected+class+does+not+exist');
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [learner] = await tx.insert(learners).values({
        schoolId,
        admissionNo,
        firstName,
        lastName,
        photoUrl,
        classId,
        dateOfBirth: formData.get('dateOfBirth') ? new Date(String(formData.get('dateOfBirth'))) : null,
        gender: cleanText(formData.get('gender'), 30) || null,
        address: cleanText(formData.get('address'), 300) || null,
        medicalNotes: cleanMultilineText(formData.get('medicalNotes'), 2000) || null,
        emergencyContact: normalizePhone(formData.get('emergencyContact')) || null,
        paymentPlan: cleanText(formData.get('paymentPlan'), 30) || 'TERM',
        badgeCode: `${admissionNo}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`
      }).returning();

      let guardian = (await tx.select().from(guardians).where(and(eq(guardians.schoolId, schoolId), eq(guardians.phone, guardianPhone))).limit(1))[0];
      if (!guardian) {
        [guardian] = await tx.insert(guardians).values({
          schoolId,
          name: guardianName,
          phone: guardianPhone,
          email: guardianEmail,
          address: cleanText(formData.get('guardianAddress'), 300) || null
        }).returning();
      } else {
        [guardian] = await tx.update(guardians).set({
          name: guardianName,
          email: guardianEmail,
          address: cleanText(formData.get('guardianAddress'), 300) || guardian.address,
          updatedAt: new Date()
        }).where(eq(guardians.id, guardian.id)).returning();
      }

      await tx.insert(learnerGuardians).values({
        learnerId: learner.id,
        guardianId: guardian.id,
        relationship: cleanText(formData.get('relationship'), 40) || 'Parent',
        isPrimary: true
      });
      return learner;
    });

    await audit({
      schoolId,
      userId: user.id,
      action: 'LEARNER_CREATED',
      entityType: 'Learner',
      entityId: created.id,
      newValue: { admissionNo, firstName, lastName, guardianPhone, guardianEmail }
    });
  } catch {
    redirect('/learners?error=Admission+number+or+badge+already+exists');
  }

  revalidatePath('/learners');
  redirect('/learners?success=Learner+profile+created');
}

export async function updateLearnerPhotoAction(formData: FormData) {
  const user = await requireUser();
  if (!canManageLearners(user.role)) redirect('/learners?error=Permission+denied');
  const schoolId = await getActiveSchoolId(user);
  const learnerId = cleanText(formData.get('learnerId'), 100);
  const learner = (await db.select().from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0];
  if (!learner) redirect('/learners?error=Learner+not+found');

  let photoUrl: string;
  try {
    photoUrl = (await imageToDataUrl(formData.get('photo'), { required: true, label: 'Learner photo' }))!;
  } catch (error) {
    redirect(`/learners/${learnerId}?error=${encodeURIComponent(error instanceof ImageUploadError ? error.message : 'Learner photo could not be processed')}`);
  }

  await db.update(learners).set({ photoUrl, updatedAt: new Date() }).where(eq(learners.id, learnerId));
  await audit({ schoolId, userId: user.id, action: 'LEARNER_PHOTO_UPDATED', entityType: 'Learner', entityId: learnerId });
  revalidatePath('/learners');
  revalidatePath(`/learners/${learnerId}`);
  redirect(`/learners/${learnerId}?success=Learner+photo+updated`);
}

export async function updateGuardianContactAction(formData: FormData) {
  const user = await requireUser();
  if (!canManageLearners(user.role)) redirect('/learners?error=Permission+denied');
  const schoolId = await getActiveSchoolId(user);
  const learnerId = cleanText(formData.get('learnerId'), 100);
  const guardianId = cleanText(formData.get('guardianId'), 100);
  const name = cleanText(formData.get('name'), 120);
  const phone = normalizePhone(formData.get('phone'));
  const email = normalizeEmail(formData.get('email'));
  if (!name || !isValidPhone(phone) || !isValidEmail(email)) {
    redirect(`/learners/${learnerId}?error=Parent+name,+mobile+number+and+valid+email+are+required`);
  }

  const link = (await db.select({ guardian: guardians }).from(learnerGuardians)
    .innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id))
    .where(and(eq(learnerGuardians.learnerId, learnerId), eq(learnerGuardians.guardianId, guardianId), eq(guardians.schoolId, schoolId)))
    .limit(1))[0];
  if (!link) redirect(`/learners/${learnerId}?error=Parent+or+guardian+not+found`);

  await db.transaction(async (tx) => {
    await tx.update(guardians).set({ name, phone, email, updatedAt: new Date() }).where(eq(guardians.id, guardianId));
    if (link.guardian.userId) {
      await tx.update(users).set({ name, phone, email, updatedAt: new Date() }).where(eq(users.id, link.guardian.userId));
    }
  });

  await audit({ schoolId, userId: user.id, action: 'GUARDIAN_CONTACT_UPDATED', entityType: 'Guardian', entityId: guardianId, newValue: { name, phone, email } });
  revalidatePath(`/learners/${learnerId}`);
  redirect(`/learners/${learnerId}?success=Parent+contact+updated`);
}

export async function updateLearnerStatusAction(formData: FormData) {
  const user = await requireUser(); if (!canManageLearners(user.role)) redirect('/learners?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || ''); const status = String(formData.get('status') || 'ACTIVE'); if (!['ACTIVE','GRADUATED','WITHDRAWN','SUSPENDED'].includes(status)) redirect('/learners?error=Invalid+status');
  const learner = (await db.select().from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0]; if (!learner) redirect('/learners?error=Learner+not+found');
  await db.update(learners).set({ status, updatedAt: new Date() }).where(eq(learners.id, learnerId)); await audit({ schoolId, userId: user.id, action: 'LEARNER_STATUS_CHANGED', entityType: 'Learner', entityId: learnerId, oldValue: { status: learner.status }, newValue: { status } });
  revalidatePath('/learners'); redirect('/learners?success=Learner+status+updated');
}


function canCreatePortalAccount(role: string) {
  return ['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER'].includes(role);
}

export async function createLearnerPortalAction(formData: FormData) {
  const actor = await requireUser();
  if (!canCreatePortalAccount(actor.role)) redirect('/learners?error=Permission+denied');
  const schoolId = await getActiveSchoolId(actor);
  const learnerId = String(formData.get('learnerId') || '');
  const username = String(formData.get('username') || '').trim().toLowerCase();
  const temporaryPassword = String(formData.get('temporaryPassword') || '');
  if (username.length < 3 || temporaryPassword.length < 10) redirect(`/learners/${learnerId}?error=Use+a+valid+username+and+a+10-character+temporary+password`);
  const learner = (await db.select().from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0];
  if (!learner) redirect('/learners?error=Learner+not+found');
  if (learner.userId) redirect(`/learners/${learnerId}?error=Learner+already+has+a+portal+account`);
  try {
    const [account] = await db.transaction(async (tx) => {
      const created = await tx.insert(users).values({ schoolId, name: `${learner.firstName} ${learner.lastName}`, username, role: 'LEARNER', passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true, temporaryPasswordExpiresAt: temporaryPasswordExpiry() }).returning();
      await tx.update(learners).set({ userId: created[0].id, updatedAt: new Date() }).where(eq(learners.id, learnerId));
      return created;
    });
    await audit({ schoolId, userId: actor.id, action: 'LEARNER_PORTAL_CREATED', entityType: 'User', entityId: account.id, newValue: { learnerId, username } });
  } catch {
    redirect(`/learners/${learnerId}?error=Username+already+exists`);
  }
  revalidatePath(`/learners/${learnerId}`); revalidatePath('/users');
  redirect(`/learners/${learnerId}?success=Learner+portal+account+created`);
}

export async function createGuardianPortalAction(formData: FormData) {
  const actor = await requireUser();
  if (!canCreatePortalAccount(actor.role)) redirect('/learners?error=Permission+denied');
  const schoolId = await getActiveSchoolId(actor);
  const learnerId = String(formData.get('learnerId') || '');
  const guardianId = String(formData.get('guardianId') || '');
  const username = String(formData.get('username') || '').trim().toLowerCase();
  const temporaryPassword = String(formData.get('temporaryPassword') || '');
  if (username.length < 3 || temporaryPassword.length < 10) redirect(`/learners/${learnerId}?error=Use+a+valid+username+and+a+10-character+temporary+password`);
  const link = (await db.select({ guardian: guardians }).from(learnerGuardians).innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id)).where(and(eq(learnerGuardians.learnerId, learnerId), eq(learnerGuardians.guardianId, guardianId), eq(guardians.schoolId, schoolId))).limit(1))[0];
  if (!link) redirect(`/learners/${learnerId}?error=Guardian+not+found`);
  if (link.guardian.userId) redirect(`/learners/${learnerId}?error=Guardian+already+has+a+portal+account`);
  try {
    const [account] = await db.transaction(async (tx) => {
      const created = await tx.insert(users).values({ schoolId, name: link.guardian.name, username, email: link.guardian.email, phone: link.guardian.phone, role: 'PARENT', passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true, temporaryPasswordExpiresAt: temporaryPasswordExpiry() }).returning();
      await tx.update(guardians).set({ userId: created[0].id, updatedAt: new Date() }).where(eq(guardians.id, guardianId));
      return created;
    });
    await audit({ schoolId, userId: actor.id, action: 'GUARDIAN_PORTAL_CREATED', entityType: 'User', entityId: account.id, newValue: { guardianId, learnerId, username } });
  } catch {
    redirect(`/learners/${learnerId}?error=Username+already+exists`);
  }
  revalidatePath(`/learners/${learnerId}`); revalidatePath('/users');
  redirect(`/learners/${learnerId}?success=Parent+portal+account+created`);
}

export async function promoteLearnersAction(formData: FormData) {
  const actor = await requireUser();
  if (!['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN'].includes(actor.role)) redirect('/learners?error=Permission+denied');
  const schoolId = await getActiveSchoolId(actor);
  const fromClassId = String(formData.get('fromClassId') || '');
  const toClassId = String(formData.get('toClassId') || '');
  if (!fromClassId || !toClassId || fromClassId === toClassId) redirect('/learners?error=Choose+two+different+classes');
  const classRows = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)));
  const validIds = new Set(classRows.map((row) => row.id));
  if (!validIds.has(fromClassId) || !validIds.has(toClassId)) redirect('/learners?error=One+of+the+selected+classes+is+invalid');
  const promoted = await db.update(learners).set({ classId: toClassId, updatedAt: new Date() })
    .where(and(eq(learners.schoolId, schoolId), eq(learners.classId, fromClassId), eq(learners.status, 'ACTIVE')))
    .returning({ id: learners.id });
  await audit({ schoolId, userId: actor.id, action: 'LEARNERS_PROMOTED', entityType: 'Class', entityId: toClassId, oldValue: { fromClassId }, newValue: { toClassId, learnerCount: promoted.length } });
  revalidatePath('/learners'); revalidatePath('/dashboard');
  redirect(`/learners?success=${promoted.length}+learner(s)+promoted`);
}
