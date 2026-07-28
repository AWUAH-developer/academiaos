'use server';

import bcrypt from 'bcryptjs';
import { asc, desc, eq, inArray, like } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  demoRequests,
  packages,
  schoolSubscriptions,
  schools,
  sessions,
  users,
} from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { generateTemporaryPassword, usernameBaseFromName } from '@/lib/credentials';
import { imageToDataUrl, ImageUploadError } from '@/lib/images';
import { sendDemoInvitationEmail } from '@/lib/email';
import {
  cleanText,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} from '@/lib/validation';

const DEMO_DAYS = 7;
const DAY_MS = 86_400_000;

export type CreateDemoAccessState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  username?: string;
  temporaryPassword?: string;
  expiresAt?: string;
  schoolId?: string;
  schoolName?: string;
  recipientEmail?: string;
  emailStatus?: 'sent' | 'not_configured' | 'failed' | 'skipped';
  emailMessage?: string;
};

export type SendDemoInvitationState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  schoolName?: string;
  username?: string;
  temporaryPassword?: string;
  expiresAt?: string;
  recipientEmail?: string;
  emailStatus?: 'sent' | 'not_configured' | 'failed';
  emailMessage?: string;
};

function demoMarker(requestId: string) {
  return `[DEMO_REQUEST:${requestId}]`;
}

function schoolInitials(name: string) {
  const ignored = new Set(['THE', 'OF', 'AND', '&']);
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  const useful = words.filter((word) => !ignored.has(word.toUpperCase()));
  const source = useful.length ? useful : words;
  const initials = source.slice(0, 3).map((word) => word[0]).join('').toUpperCase();
  return initials || 'SCH';
}

async function availableSchoolCode(name: string, requestedCode?: string) {
  const rawBase = (requestedCode || schoolInitials(name))
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 16) || 'SCH';

  for (let n = 1; n <= 9999; n += 1) {
    const suffix = n === 1 ? '' : String(n);
    const candidate = `${rawBase.slice(0, 20 - suffix.length)}${suffix}`;
    const existing = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.code, candidate))
      .limit(1);
    if (!existing[0]) return candidate;
  }

  throw new Error('Unable to generate a unique school code.');
}

async function availableUsername(name: string) {
  const base = usernameBaseFromName(name);
  for (let n = 1; n <= 9999; n += 1) {
    const candidate = n === 1 ? base : `${base}${n}`;
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!existing[0]) return candidate;
  }
  throw new Error('Unable to generate a unique username.');
}

function currentAcademicYear() {
  const now = new Date();
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

async function findDemoSubscription(requestId: string) {
  return (
    await db
      .select()
      .from(schoolSubscriptions)
      .where(like(schoolSubscriptions.notes, `%${demoMarker(requestId)}%`))
      .orderBy(desc(schoolSubscriptions.createdAt))
      .limit(1)
  )[0];
}

export async function createDemoAccessAction(
  _previous: CreateDemoAccessState,
  formData: FormData,
): Promise<CreateDemoAccessState> {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') {
    return { status: 'error', message: 'Only the Super Admin can create demo access.' };
  }

  const requestId = cleanText(formData.get('requestId'), 100);
  const schoolName = cleanText(formData.get('schoolName'), 160);
  const requestedCode = cleanText(formData.get('code'), 20);
  const adminName = cleanText(formData.get('adminName'), 120);
  const adminPhone = normalizePhone(formData.get('adminPhone'));
  const adminEmail = normalizeEmail(formData.get('adminEmail'));
  const packageId = cleanText(formData.get('packageId'), 100);
  const sendInvitation = formData.get('sendInvitation') === 'on';

  if (!requestId) return { status: 'error', message: 'The demo request could not be identified.' };
  if (!schoolName) return { status: 'error', message: 'Enter the school name.' };
  if (!adminName || !isValidPhone(adminPhone) || !isValidEmail(adminEmail)) {
    return { status: 'error', message: 'Enter the administrator name, valid phone number and email.' };
  }
  if (!packageId) return { status: 'error', message: 'Select the package to demonstrate.' };

  const [request, selectedPackage, existingDemo] = await Promise.all([
    db.select().from(demoRequests).where(eq(demoRequests.id, requestId)).limit(1),
    db.select().from(packages).where(eq(packages.id, packageId)).limit(1),
    findDemoSubscription(requestId),
  ]);

  if (!request[0]) return { status: 'error', message: 'The demo request no longer exists.' };
  if (!selectedPackage[0] || !selectedPackage[0].isActive) {
    return { status: 'error', message: 'Select an active package.' };
  }
  if (existingDemo) {
    return { status: 'error', message: 'Demo access has already been created for this request.' };
  }

  let logoUrl: string | null = null;
  let adminPhotoUrl: string | null = null;
  try {
    logoUrl = await imageToDataUrl(formData.get('logo'), {
      required: false,
      label: 'School logo',
    });
    adminPhotoUrl = await imageToDataUrl(formData.get('adminPhoto'), {
      required: false,
      label: 'Administrator photo',
    });
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof ImageUploadError ? error.message : 'The uploaded image could not be processed.',
    };
  }

  const code = await availableSchoolCode(schoolName, requestedCode);
  const username = await availableUsername(adminName);
  const temporaryPassword = generateTemporaryPassword(10);
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + DEMO_DAYS * DAY_MS);
  const marker = demoMarker(requestId);

  try {
    const result = await db.transaction(async (tx) => {
      const [school] = await tx
        .insert(schools)
        .values({
          name: schoolName,
          code,
          logoUrl,
          phone: request[0].phone || null,
          email: request[0].email || null,
          currency: 'GHS',
          timezone: 'Africa/Accra',
          isActive: true,
        })
        .returning({ id: schools.id });

      await tx.insert(users).values({
        schoolId: school.id,
        name: adminName,
        username,
        email: adminEmail,
        phone: adminPhone,
        photoUrl: adminPhotoUrl,
        passwordHash,
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        mustChangePassword: false,
        temporaryPasswordExpiresAt: expiresAt,
      });

      const [subscription] = await tx
        .insert(schoolSubscriptions)
        .values({
          schoolId: school.id,
          packageId,
          academicYear: currentAcademicYear(),
          term: 'DEMO',
          startDate: startsAt,
          endDate: expiresAt,
          learnerCount: request[0].learnerCount,
          baseAmount: '0',
          addonsAmount: '0',
          totalAmount: '0',
          paidAmount: '0',
          status: 'ACTIVE',
          notes: `${marker} Seven-day web demo. Demo records must remain separate from production records.`,
          createdById: actor.id,
        })
        .returning({ id: schoolSubscriptions.id });

      await tx
        .update(demoRequests)
        .set({ status: 'APPROVED', updatedAt: new Date() })
        .where(eq(demoRequests.id, requestId));

      return { schoolId: school.id, subscriptionId: subscription.id };
    });

    await audit({
      userId: actor.id,
      schoolId: result.schoolId,
      action: 'DEMO_ACCESS_CREATED',
      entityType: 'DemoRequest',
      entityId: requestId,
      newValue: {
        packageId,
        durationDays: DEMO_DAYS,
        expiresAt: expiresAt.toISOString(),
      },
    });

    let emailStatus: CreateDemoAccessState['emailStatus'] = 'skipped';
    let emailMessage = 'The invitation was not emailed. Copy the login details and send them privately.';

    if (sendInvitation) {
      const delivery = await sendDemoInvitationEmail({
        requestId,
        schoolName,
        contactName: adminName,
        recipientEmail: adminEmail,
        username,
        temporaryPassword,
        expiresAt,
      });

      emailStatus = delivery.status;
      emailMessage = delivery.status === 'sent'
        ? `Invitation sent to ${adminEmail}.`
        : delivery.message;

      if (delivery.status === 'sent') {
        const sentAt = new Date();
        const note = `Demo invitation sent to ${adminEmail} at ${sentAt.toISOString()} [EMAIL_ID:${delivery.id}]`;
        await db
          .update(demoRequests)
          .set({
            notes: [request[0].notes, note].filter(Boolean).join('\n'),
            updatedAt: sentAt,
          })
          .where(eq(demoRequests.id, requestId));

        await audit({
          userId: actor.id,
          schoolId: result.schoolId,
          action: 'DEMO_INVITATION_SENT',
          entityType: 'DemoRequest',
          entityId: requestId,
          newValue: { recipientEmail: adminEmail, provider: 'RESEND', emailId: delivery.id },
        });
      } else {
        await audit({
          userId: actor.id,
          schoolId: result.schoolId,
          action: 'DEMO_INVITATION_NOT_SENT',
          entityType: 'DemoRequest',
          entityId: requestId,
          newValue: { recipientEmail: adminEmail, reason: emailMessage },
        });
      }
    }

    revalidatePath('/demo-requests');
    revalidatePath(`/demo-requests/${requestId}/create`);

    return {
      status: 'success',
      message: `${schoolName} now has seven-day web demo access.`,
      username,
      temporaryPassword,
      expiresAt: expiresAt.toISOString(),
      schoolId: result.schoolId,
      schoolName,
      recipientEmail: adminEmail,
      emailStatus,
      emailMessage,
    };
  } catch (error: any) {
    if (error?.code === '23505') {
      return { status: 'error', message: 'The generated school code or username already exists. Try again.' };
    }
    console.error('createDemoAccessAction failed', error);
    return { status: 'error', message: 'The demo could not be created. No partial record was saved.' };
  }
}


export async function sendNewDemoInvitationAction(
  _previous: SendDemoInvitationState,
  formData: FormData,
): Promise<SendDemoInvitationState> {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') {
    return { status: 'error', message: 'Only the Super Admin can send demo invitations.' };
  }

  const requestId = cleanText(formData.get('requestId'), 100);
  const recipientEmail = normalizeEmail(formData.get('recipientEmail'));
  if (!requestId) return { status: 'error', message: 'The demo request could not be identified.' };
  if (!isValidEmail(recipientEmail)) return { status: 'error', message: 'Enter a valid invitation email address.' };

  const [request, subscription] = await Promise.all([
    db.select().from(demoRequests).where(eq(demoRequests.id, requestId)).limit(1),
    findDemoSubscription(requestId),
  ]);

  if (!request[0] || !subscription) {
    return { status: 'error', message: 'The demo access record could not be found.' };
  }

  const [school, admin] = await Promise.all([
    db.select().from(schools).where(eq(schools.id, subscription.schoolId)).limit(1),
    db
      .select()
      .from(users)
      .where(eq(users.schoolId, subscription.schoolId))
      .orderBy(asc(users.createdAt))
      .limit(1),
  ]);

  if (!school[0] || !admin[0]) {
    return { status: 'error', message: 'The demo school or administrator account could not be found.' };
  }

  const now = new Date();
  if (!school[0].isActive || subscription.status !== 'ACTIVE' || subscription.endDate <= now) {
    return { status: 'error', message: 'Extend or reactivate the demo before sending a new invitation.' };
  }

  const temporaryPassword = generateTemporaryPassword(10);
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          email: recipientEmail,
          passwordHash,
          status: 'ACTIVE',
          mustChangePassword: false,
          temporaryPasswordExpiresAt: subscription.endDate,
          failedLoginCount: 0,
          lockedUntil: null,
          updatedAt: now,
        })
        .where(eq(users.id, admin[0].id));

      await tx.delete(sessions).where(eq(sessions.userId, admin[0].id));
    });
  } catch (error) {
    console.error('sendNewDemoInvitationAction password reset failed', error);
    return { status: 'error', message: 'The invitation could not be prepared. The existing login remains unchanged.' };
  }

  const delivery = await sendDemoInvitationEmail({
    requestId,
    deliveryKey: `${requestId}-resend-${now.getTime()}`,
    schoolName: school[0].name,
    contactName: request[0].contactName,
    recipientEmail,
    username: admin[0].username,
    temporaryPassword,
    expiresAt: subscription.endDate,
  });

  const emailMessage = delivery.status === 'sent'
    ? `Invitation sent to ${recipientEmail}.`
    : delivery.message;

  try {
    const note = delivery.status === 'sent'
      ? `Demo invitation resent to ${recipientEmail} at ${now.toISOString()} [EMAIL_ID:${delivery.id}]`
      : `Demo invitation password reset at ${now.toISOString()}, but email was not sent to ${recipientEmail}: ${emailMessage}`;

    await db
      .update(demoRequests)
      .set({
        notes: [request[0].notes, note].filter(Boolean).join('\n'),
        updatedAt: now,
      })
      .where(eq(demoRequests.id, requestId));

    await audit({
      userId: actor.id,
      schoolId: subscription.schoolId,
      action: delivery.status === 'sent' ? 'DEMO_INVITATION_RESENT' : 'DEMO_INVITATION_RESET_NOT_SENT',
      entityType: 'DemoRequest',
      entityId: requestId,
      newValue: {
        recipientEmail,
        emailStatus: delivery.status,
        ...(delivery.status === 'sent' ? { emailId: delivery.id } : { reason: emailMessage }),
      },
    });
  } catch (error) {
    console.error('sendNewDemoInvitationAction audit update failed', error);
  }

  revalidatePath('/demo-requests');
  revalidatePath(`/demo-requests/${requestId}/create`);

  return {
    status: 'success',
    message: 'A new temporary password was generated. The previous password no longer works.',
    schoolName: school[0].name,
    username: admin[0].username,
    temporaryPassword,
    expiresAt: subscription.endDate.toISOString(),
    recipientEmail,
    emailStatus: delivery.status,
    emailMessage,
  };
}

export async function extendDemoAccessAction(formData: FormData) {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') return;

  const requestId = cleanText(formData.get('requestId'), 100);
  if (!requestId) return;

  const subscription = await findDemoSubscription(requestId);
  if (!subscription) return;

  const schoolUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.schoolId, subscription.schoolId));

  const base = subscription.endDate > new Date() ? subscription.endDate : new Date();
  const newExpiry = new Date(base.getTime() + DEMO_DAYS * DAY_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(schoolSubscriptions)
      .set({ endDate: newExpiry, status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(schoolSubscriptions.id, subscription.id));

    await tx
      .update(schools)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(schools.id, subscription.schoolId));

    if (schoolUsers.length) {
      await tx
        .update(users)
        .set({ temporaryPasswordExpiresAt: newExpiry, status: 'ACTIVE', updatedAt: new Date() })
        .where(inArray(users.id, schoolUsers.map((user) => user.id)));
    }
  });

  await audit({
    userId: actor.id,
    schoolId: subscription.schoolId,
    action: 'DEMO_ACCESS_EXTENDED',
    entityType: 'DemoRequest',
    entityId: requestId,
    newValue: { expiresAt: newExpiry.toISOString(), durationDaysAdded: DEMO_DAYS },
  });

  revalidatePath('/demo-requests');
  revalidatePath(`/demo-requests/${requestId}/create`);
}

export async function revokeDemoAccessAction(formData: FormData) {
  const actor = await requireUser();
  if (actor.role !== 'SUPER_ADMIN') return;

  const requestId = cleanText(formData.get('requestId'), 100);
  if (!requestId) return;

  const subscription = await findDemoSubscription(requestId);
  if (!subscription) return;

  const schoolUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.schoolId, subscription.schoolId));
  const userIds = schoolUsers.map((user) => user.id);

  await db.transaction(async (tx) => {
    await tx
      .update(schoolSubscriptions)
      .set({ status: 'SUSPENDED', updatedAt: new Date() })
      .where(eq(schoolSubscriptions.id, subscription.id));

    await tx
      .update(schools)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schools.id, subscription.schoolId));

    if (userIds.length) {
      await tx.delete(sessions).where(inArray(sessions.userId, userIds));
    }
  });

  await audit({
    userId: actor.id,
    schoolId: subscription.schoolId,
    action: 'DEMO_ACCESS_REVOKED',
    entityType: 'DemoRequest',
    entityId: requestId,
  });

  revalidatePath('/demo-requests');
  revalidatePath(`/demo-requests/${requestId}/create`);
}
