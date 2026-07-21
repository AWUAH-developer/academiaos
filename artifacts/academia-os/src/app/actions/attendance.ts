'use server';
import { and, desc, eq, gte, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { attendanceRecords, attendanceScans, feeCategories, feeCharges, feeStructures, learners } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { canRecordAttendance } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';
import { notifyLearnerGuardians } from '@/lib/notifications';

function schoolDate(value: string) { const d = new Date(`${value}T00:00:00.000Z`); return Number.isNaN(d.getTime()) ? null : d; }

async function createDailyCharges(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], schoolId: string, learner: typeof learners.$inferSelect, date: Date, status: string) {
  if (learner.paymentPlan !== 'DAILY' || !learner.classId) return;
  const structures = await tx.select({ structure: feeStructures, category: feeCategories }).from(feeStructures).innerJoin(feeCategories, eq(feeStructures.categoryId, feeCategories.id))
    .where(and(eq(feeStructures.schoolId, schoolId), eq(feeStructures.paymentPlan, 'DAILY'), eq(feeStructures.isActive, true), or(eq(feeStructures.classId, learner.classId), isNull(feeStructures.classId))));
  for (const row of structures) {
    const shouldCharge = status !== 'ABSENT' || row.structure.chargeOnAbsent;
    const existing = (await tx.select().from(feeCharges).where(and(eq(feeCharges.learnerId, learner.id), eq(feeCharges.categoryId, row.category.id), eq(feeCharges.attendanceDate, date))).limit(1))[0];
    const description = `${row.category.name} for ${date.toISOString().slice(0,10)}`;
    if (shouldCharge && !existing) {
      await tx.insert(feeCharges).values({ schoolId, learnerId: learner.id, categoryId: row.category.id, description, amount: row.structure.amount, attendanceDate: date, isAutomatic: true });
      continue;
    }
    if (shouldCharge && existing && existing.status === 'VOID' && existing.paidAmount === 0) {
      await tx.update(feeCharges).set({ description, amount: row.structure.amount, status: 'OPEN', updatedAt: new Date() }).where(eq(feeCharges.id, existing.id));
      continue;
    }
    if (!shouldCharge && existing && existing.isAutomatic && existing.paidAmount === 0 && existing.status !== 'VOID') {
      await tx.update(feeCharges).set({ amount: 0, status: 'VOID', updatedAt: new Date() }).where(eq(feeCharges.id, existing.id));
    }
  }
}

export async function recordAttendanceAction(formData: FormData) {
  const user = await requireUser(); if (!canRecordAttendance(user.role)) redirect('/attendance?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || ''); const status = String(formData.get('status') || 'PRESENT'); const date = schoolDate(String(formData.get('date') || ''));
  if (!date || !['PRESENT','ABSENT','LATE','EXCUSED','SICK','PARTIAL','HALF_DAY_MORNING','HALF_DAY_AFTERNOON','SCHOOL_ACTIVITY','SUSPENDED','HOLIDAY'].includes(status)) redirect('/attendance?error=Enter+valid+attendance+details');
  const learner = (await db.select().from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0]; if (!learner) redirect('/attendance?error=Learner+not+found');
  const checkInTime = ['PRESENT','LATE','PARTIAL','HALF_DAY_MORNING','HALF_DAY_AFTERNOON','SCHOOL_ACTIVITY'].includes(status) ? new Date() : null;
  await db.transaction(async (tx) => {
    await tx.insert(attendanceRecords).values({ schoolId, learnerId, date, status, checkInTime, reason: String(formData.get('reason') || '').trim() || null, recordedById: user.id })
      .onConflictDoUpdate({ target: [attendanceRecords.learnerId, attendanceRecords.date], set: { status, checkInTime, reason: String(formData.get('reason') || '').trim() || null, recordedById: user.id, updatedAt: new Date() } });
    await createDailyCharges(tx, schoolId, learner, date, status);
  });
  await notifyLearnerGuardians({ schoolId, learnerId, type: 'ATTENDANCE', title: `${learner.firstName} ${learner.lastName}: ${status.replaceAll('_', ' ')}`, body: `Attendance for ${date.toLocaleDateString('en-GH')} was recorded as ${status.replaceAll('_', ' ').toLowerCase()}.`, link: '/attendance' });
  await audit({ schoolId, userId: user.id, action: 'ATTENDANCE_RECORDED', entityType: 'AttendanceRecord', entityId: learnerId, newValue: { date: date.toISOString(), status } });
  revalidatePath('/attendance'); revalidatePath('/dashboard'); revalidatePath('/fees'); redirect(`/attendance?date=${date.toISOString().slice(0,10)}&success=Attendance+saved`);
}

export async function scanBadgeAction(formData: FormData) {
  const user = await requireUser(); if (!canRecordAttendance(user.role)) redirect('/attendance?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const badgeCode = String(formData.get('badgeCode') || '').trim(); const action = String(formData.get('action') || 'SCHOOL_ENTRY'); if (!['SCHOOL_ENTRY','SCHOOL_EXIT','CANTEEN_ACCESS','LIBRARY_ACCESS'].includes(action)) redirect('/attendance?error=Invalid+scan+action'); if (!badgeCode) redirect('/attendance?error=Scan+or+enter+a+badge+code');
  const learner = (await db.select().from(learners).where(and(eq(learners.schoolId, schoolId), eq(learners.badgeCode, badgeCode))).limit(1))[0]; if (!learner) redirect('/attendance?error=Badge+not+recognised');
  const cutoff = new Date(Date.now() - 3 * 60000); const recent = (await db.select().from(attendanceScans).where(and(eq(attendanceScans.badgeCode, badgeCode), eq(attendanceScans.action, action), gte(attendanceScans.scannedAt, cutoff))).orderBy(desc(attendanceScans.scannedAt)).limit(1))[0];
  if (recent) { await db.insert(attendanceScans).values({ schoolId, learnerId: learner.id, recordedById: user.id, badgeCode, action, location: String(formData.get('location') || '').trim() || null, device: String(formData.get('device') || '').trim() || null, wasDuplicate: true }); redirect('/attendance?error=Duplicate+scan+blocked+within+3+minutes'); }
  const today = new Date(); today.setUTCHours(0,0,0,0);
  await db.transaction(async (tx) => {
    await tx.insert(attendanceScans).values({ schoolId, learnerId: learner.id, recordedById: user.id, badgeCode, action, location: String(formData.get('location') || '').trim() || null, device: String(formData.get('device') || '').trim() || null });
    if (action === 'SCHOOL_ENTRY') { await tx.insert(attendanceRecords).values({ schoolId, learnerId: learner.id, date: today, status: 'PRESENT', checkInTime: new Date(), recordedById: user.id }).onConflictDoUpdate({ target: [attendanceRecords.learnerId, attendanceRecords.date], set: { status: 'PRESENT', checkInTime: new Date(), recordedById: user.id, updatedAt: new Date() } }); await createDailyCharges(tx, schoolId, learner, today, 'PRESENT'); }
    if (action === 'SCHOOL_EXIT') await tx.update(attendanceRecords).set({ checkOutTime: new Date(), updatedAt: new Date() }).where(and(eq(attendanceRecords.learnerId, learner.id), eq(attendanceRecords.date, today)));
  });
  if (['SCHOOL_ENTRY','SCHOOL_EXIT'].includes(action)) await notifyLearnerGuardians({ schoolId, learnerId: learner.id, type: 'ATTENDANCE', title: `${learner.firstName} ${learner.lastName} ${action === 'SCHOOL_ENTRY' ? 'arrived at school' : 'left school'}`, body: `${learner.firstName} ${learner.lastName} ${action === 'SCHOOL_ENTRY' ? 'checked in' : 'checked out'} at ${new Date().toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}.`, link: '/attendance' });
  await audit({ schoolId, userId: user.id, action: `BADGE_${action}`, entityType: 'Learner', entityId: learner.id, newValue: { badgeCode } });
  revalidatePath('/attendance'); revalidatePath('/dashboard'); redirect(`/attendance?success=${encodeURIComponent(`${learner.firstName} ${learner.lastName} scan recorded`)}`);
}
