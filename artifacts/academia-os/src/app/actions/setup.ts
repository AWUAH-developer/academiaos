'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { academicYears, classes, feeCategories, feeStructures, schoolManagementControls, schools, subjects, curriculumTopics, teacherAssignments, terms, users } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';
import { imageToDataUrl, ImageUploadError } from '@/lib/images';
import { cleanCode, cleanText, isValidEmail, isValidPhone, normalizeEmail, normalizePhone, safeMoney } from '@/lib/validation';

function allowed(role: string) { return role === 'SUPER_ADMIN'; }
function dateValue(value: FormDataEntryValue | null) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const gh = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (gh) {
    const day = Number(gh[1]);
    const month = Number(gh[2]);
    const year = Number(gh[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? d : null;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function updateSchoolAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') redirect('/dashboard');
  const schoolId = await getActiveSchoolId(user);
  const name = cleanText(formData.get('name'), 160);
  if (!name) redirect('/setup?error=School+name+is+required');
  const schoolPhone = normalizePhone(formData.get('phone'));
  const schoolEmail = normalizeEmail(formData.get('email'));
  if (schoolPhone && !isValidPhone(schoolPhone)) redirect('/setup?error=Enter+a+valid+school+telephone');
  if (schoolEmail && !isValidEmail(schoolEmail)) redirect('/setup?error=Enter+a+valid+school+email');

  const removeLogo = formData.get('removeLogo') === 'on';
  let logoUrl: string | null = null;
  try {
    if (!removeLogo) logoUrl = await imageToDataUrl(formData.get('logo'), { label: 'School logo' });
  } catch (error) {
    redirect(`/setup?error=${encodeURIComponent(error instanceof ImageUploadError ? error.message : 'School logo could not be processed')}`);
  }

  await db.update(schools).set({
    name,
    ...(removeLogo ? { logoUrl: null } : logoUrl ? { logoUrl } : {}),
    address: cleanText(formData.get('address'), 300) || null,
    phone: schoolPhone || null,
    email: schoolEmail || null,
    currency: cleanCode(formData.get('currency') || 'GHS', 8) || 'GHS',
    smsSenderName: cleanText(formData.get('smsSenderName'), 20) || null,
    proprietorApprovalRequired: formData.get('proprietorApprovalRequired') === 'on',
    updatedAt: new Date()
  }).where(eq(schools.id, schoolId));

  await audit({ schoolId, userId: user.id, action: 'SCHOOL_SETTINGS_UPDATED', entityType: 'School', entityId: schoolId, newValue: { logoChanged: Boolean(logoUrl), logoRemoved: removeLogo } });
  revalidatePath('/setup');
  revalidatePath('/dashboard');
  redirect('/setup?success=School+settings+updated');
}

export async function assignStaffAttendanceOfficerAction(
  formData: FormData
) {
  const actor = await requireUser();

  if (actor.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const schoolId = await getActiveSchoolId(actor);
  const officerId =
    String(formData.get('officerId') || '') || null;

  const current = (
    await db
      .select({
        officerId:
          schoolManagementControls.staffAttendanceOfficerId
      })
      .from(schoolManagementControls)
      .where(eq(
        schoolManagementControls.schoolId,
        schoolId
      ))
      .limit(1)
  )[0];

  if (officerId) {
    const officer = (
      await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role
        })
        .from(users)
        .where(and(
          eq(users.id, officerId),
          eq(users.schoolId, schoolId),
          eq(users.status, 'ACTIVE')
        ))
        .limit(1)
    )[0];

    if (
      !officer ||
      ['PARENT', 'LEARNER'].includes(officer.role)
    ) {
      redirect(
        '/setup?error=Select+a+valid+active+staff+member'
      );
    }
  }

  await db
    .insert(schoolManagementControls)
    .values({
      schoolId,
      staffAttendanceOfficerId: officerId,
      updatedById: actor.id
    })
    .onConflictDoUpdate({
      target: schoolManagementControls.schoolId,
      set: {
        staffAttendanceOfficerId: officerId,
        updatedById: actor.id,
        updatedAt: new Date()
      }
    });

  await audit({
    schoolId,
    userId: actor.id,
    action: 'STAFF_ATTENDANCE_OFFICER_UPDATED',
    entityType: 'SchoolManagementControl',
    entityId: schoolId,
    oldValue: {
      officerId: current?.officerId || null
    },
    newValue: {
      officerId
    }
  });

  revalidatePath('/setup');
  revalidatePath('/staff-attendance');

  redirect(
    officerId
      ? '/setup?success=Authorised+staff+attendance+officer+saved'
      : '/setup?success=Additional+attendance+officer+cleared'
  );
}

export async function createAcademicYearAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/setup?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const name = String(formData.get('name') || '').trim(); const startsOn = dateValue(formData.get('startsOn')); const endsOn = dateValue(formData.get('endsOn'));
  if (!name || !startsOn || !endsOn || startsOn >= endsOn) redirect('/setup?error=Enter+a+valid+academic+year');
  try { await db.transaction(async (tx) => { if (formData.get('isCurrent') === 'on') await tx.update(academicYears).set({ isCurrent: false }).where(eq(academicYears.schoolId, schoolId)); await tx.insert(academicYears).values({ schoolId, name, startsOn, endsOn, isCurrent: formData.get('isCurrent') === 'on' }); }); }
  catch { redirect('/setup?error=Academic+year+already+exists'); }
  revalidatePath('/setup'); redirect('/setup?success=Academic+year+created');
}

export async function createTermAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/setup?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const academicYearId = String(formData.get('academicYearId') || ''); const name = String(formData.get('name') || '').trim(); const startsOn = dateValue(formData.get('startsOn')); const endsOn = dateValue(formData.get('endsOn')); const reopeningDate = dateValue(formData.get('reopeningDate'));
  if (!academicYearId || !name || !startsOn || !endsOn) redirect('/setup?error=Enter+valid+term+details');
  const year = (await db.select({ id: academicYears.id }).from(academicYears).where(and(eq(academicYears.id, academicYearId), eq(academicYears.schoolId, schoolId))).limit(1))[0]; if (!year) redirect('/setup?error=Academic+year+not+found');
  try { await db.transaction(async (tx) => { if (formData.get('isCurrent') === 'on') await tx.update(terms).set({ isCurrent: false }).where(eq(terms.schoolId, schoolId)); await tx.insert(terms).values({ schoolId, academicYearId, name, startsOn, endsOn, reopeningDate, isCurrent: formData.get('isCurrent') === 'on' }); }); }
  catch { redirect('/setup?error=Term+already+exists'); }
  revalidatePath('/setup'); redirect('/setup?success=Term+created');
}

export async function createClassAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/setup?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const name = String(formData.get('name') || '').trim(); const stream = String(formData.get('stream') || '').trim(); if (!name) redirect('/setup?error=Class+name+is+required');
  try { await db.insert(classes).values({ schoolId, name, stream, level: String(formData.get('level') || '').trim() || null }); } catch { redirect('/setup?error=Class+and+stream+already+exist'); }
  revalidatePath('/setup'); redirect('/setup?success=Class+created');
}

export async function assignClassTeacherAction(formData: FormData) {
  const user = await requireUser();

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/setup?error=Permission+denied');
  }

  const schoolId = await getActiveSchoolId(user);
  const classId = String(formData.get('classId') || '');
  const teacherId = String(formData.get('teacherId') || '');

  if (!classId || !teacherId) {
    redirect('/setup?error=Select+a+class+and+class+teacher');
  }

  const classRecord = (
    await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
      .limit(1)
  )[0];

  if (!classRecord) {
    redirect('/setup?error=Class+not+found');
  }

  const teacher = (
    await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.schoolId, schoolId),
          eq(users.status, 'ACTIVE'),
        ),
      )
      .limit(1)
  )[0];

  if (!teacher || !['TEACHER','HEADTEACHER','ACADEMIC_ADMIN'].includes(teacher.role)) {
    redirect('/setup?error=Select+a+valid+class+teacher');
  }

  await db
    .update(classes)
    .set({
      classTeacherId: teacher.id,
      updatedAt: new Date(),
    })
    .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)));

  revalidatePath('/setup');
  revalidatePath('/attendance');

  redirect('/setup?success=Class+teacher+assigned');
}

export async function createSubjectAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/setup?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const name = String(formData.get('name') || '').trim(); const code = String(formData.get('code') || '').trim().toUpperCase(); if (!name || !code) redirect('/setup?error=Subject+name+and+code+are+required');
  try { await db.insert(subjects).values({ schoolId, name, code }); } catch { redirect('/setup?error=Subject+code+already+exists'); }
  revalidatePath('/setup'); redirect('/setup?success=Subject+created');
}

export async function createCurriculumTopicAction(formData: FormData) {
  const user = await requireUser();
  // SCHOOL_ADMIN has view-only homework oversight; only academic staff may create topics.
  const topicManagers = ['SUPER_ADMIN','HEADTEACHER','ACADEMIC_ADMIN'];
  const returnTo = formData.get('returnTo') === 'homework-topics' ? '/homework-topics' : '/setup';

  if (!topicManagers.includes(user.role)) {
    await audit({ schoolId: await getActiveSchoolId(user), userId: user.id, action: 'CURRICULUM_TOPIC_CREATE_DENIED', entityType: 'CurriculumTopic', entityId: '', newValue: { role: user.role } });
    redirect(`${returnTo}?error=Only+academic+staff+may+create+curriculum+topics`);
  }

  const schoolId = await getActiveSchoolId(user);
  const classId = String(formData.get('classId') || '');
  const subjectId = String(formData.get('subjectId') || '');
  const name = String(formData.get('name') || '').trim();

  if (!classId || !subjectId || !name) {
    redirect(`${returnTo}?error=Class,+subject+and+topic+are+required`);
  }

  const [classRecord, subjectRecord] = await Promise.all([
    db.select({ id: classes.id }).from(classes)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
      .limit(1).then((rows) => rows[0]),
    db.select({ id: subjects.id }).from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId)))
      .limit(1).then((rows) => rows[0])
  ]);

  if (!classRecord || !subjectRecord) {
    redirect(`${returnTo}?error=Class+or+subject+not+found`);
  }

  try {
    await db.insert(curriculumTopics).values({ schoolId, classId, subjectId, name });
  } catch {
    redirect(`${returnTo}?error=That+topic+already+exists+for+this+class+and+subject`);
  }

  revalidatePath('/setup');
  revalidatePath('/homework-topics');
  revalidatePath('/homework');
  redirect(`${returnTo}?success=Homework+topic+created`);
}

export async function assignTeacherAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/setup?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const teacherId = String(formData.get('teacherId') || ''); const classId = String(formData.get('classId') || ''); const subjectId = String(formData.get('subjectId') || '');
  const teacher = (await db.select().from(users).where(and(eq(users.id, teacherId), eq(users.schoolId, schoolId))).limit(1))[0]; if (!teacher || !['TEACHER','HEADTEACHER','ACADEMIC_ADMIN'].includes(teacher.role)) redirect('/setup?error=Select+a+valid+teacher');
  const classRecord = (await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId))).limit(1))[0];
  const subjectRecord = (await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId))).limit(1))[0];
  if (!classRecord || !subjectRecord) redirect('/setup?error=Class+or+subject+not+found');
  await db.insert(teacherAssignments).values({ schoolId, teacherId, classId, subjectId }).onConflictDoNothing(); revalidatePath('/setup'); redirect('/setup?success=Teacher+assigned');
}

export async function createFeeCategoryAction(formData: FormData) {
  const user = await requireUser(); if (user.role !== 'SUPER_ADMIN') redirect('/dashboard'); const schoolId = await getActiveSchoolId(user);
  const name = String(formData.get('name') || '').trim(); const code = String(formData.get('code') || '').trim().toUpperCase(); if (!name || !code) redirect('/setup?error=Fee+category+name+and+code+are+required');
  try { await db.insert(feeCategories).values({ schoolId, name, code, isDailyTuition: formData.get('isDailyTuition') === 'on', isCanteen: formData.get('isCanteen') === 'on' }); } catch { redirect('/setup?error=Fee+category+already+exists'); }
  revalidatePath('/setup'); redirect('/setup?success=Fee+category+created');
}

export async function createFeeStructureAction(formData: FormData) {
  const user = await requireUser(); if (user.role !== 'SUPER_ADMIN') redirect('/dashboard'); const schoolId = await getActiveSchoolId(user);
  const categoryId = String(formData.get('categoryId') || ''); const classId = String(formData.get('classId') || '') || null;
  const rawPlan = String(formData.get('paymentPlan') || '');
  const paymentPlan = (['FULL_FEE','HALF_FEE','DAILY_FEE','INSTALLMENT'] as const).includes(rawPlan as never) ? rawPlan : 'FULL_FEE';
  const amount = safeMoney(formData.get('amount'));
  if (!categoryId || amount === null) redirect('/setup?error=Enter+a+valid+fee+structure');
  const category = (await db.select({ id: feeCategories.id }).from(feeCategories).where(and(eq(feeCategories.id, categoryId), eq(feeCategories.schoolId, schoolId))).limit(1))[0];
  if (!category) redirect('/setup?error=Fee+category+not+found');
  if (classId) { const classRecord = (await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId))).limit(1))[0]; if (!classRecord) redirect('/setup?error=Class+not+found'); }
  try { await db.insert(feeStructures).values({ schoolId, categoryId, classId, paymentPlan, amount, chargeOnAbsent: formData.get('chargeOnAbsent') === 'on' }); } catch { redirect('/setup?error=That+fee+structure+already+exists'); }
  revalidatePath('/setup'); redirect('/setup?success=Fee+structure+created');
}
