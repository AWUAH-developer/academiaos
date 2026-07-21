'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { staffAttendanceRecords, staffMovementRequests, users } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';

const staffRoles = ['SCHOOL_ADMIN','PROPRIETOR','HEADTEACHER','ACADEMIC_ADMIN','TEACHER','ACCOUNTS','TRANSPORT','SECURITY','RECEPTIONIST','LIBRARIAN','CANTEEN'];
const supervisors = ['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR','HEADTEACHER'];
function todayUtc() { const date = new Date(); date.setUTCHours(0,0,0,0); return date; }
function validDateTime(value: FormDataEntryValue | null) { const date = new Date(String(value || '')); return Number.isNaN(date.getTime()) ? null : date; }

export async function recordOwnStaffScanAction(formData: FormData) {
  const user = await requireUser(); if (!staffRoles.includes(user.role) && user.role !== 'SUPER_ADMIN') redirect('/dashboard'); const schoolId = await getActiveSchoolId(user);
  const action = String(formData.get('action') || 'ARRIVAL'); if (!['ARRIVAL','DEPARTURE'].includes(action)) redirect('/staff-attendance?error=Invalid+staff+scan+action');
  const date = todayUtc(); const now = new Date();
  await db.insert(staffAttendanceRecords).values({ schoolId, staffId: user.id, date, status: 'PRESENT', arrivalTime: action === 'ARRIVAL' ? now : null, departureTime: action === 'DEPARTURE' ? now : null, recordedById: user.id })
    .onConflictDoUpdate({ target: [staffAttendanceRecords.staffId, staffAttendanceRecords.date], set: action === 'ARRIVAL' ? { arrivalTime: now, status: 'PRESENT', recordedById: user.id, updatedAt: now } : { departureTime: now, recordedById: user.id, updatedAt: now } });
  await audit({ schoolId, userId: user.id, action: `STAFF_${action}`, entityType: 'StaffAttendance', entityId: user.id, newValue: { time: now } }); revalidatePath('/staff-attendance'); redirect(`/staff-attendance?success=${action === 'ARRIVAL' ? 'Arrival' : 'Departure'}+recorded`);
}

export async function recordStaffAttendanceAction(formData: FormData) {
  const actor = await requireUser(); if (!supervisors.includes(actor.role)) redirect('/staff-attendance?error=Permission+denied'); const schoolId = await getActiveSchoolId(actor);
  const staffId = String(formData.get('staffId') || ''); const date = validDateTime(formData.get('date')); const status = String(formData.get('status') || 'PRESENT');
  if (!date || !['PRESENT','ABSENT','LATE','PARTIAL','SICK','EXCUSED'].includes(status)) redirect('/staff-attendance?error=Enter+valid+attendance+details'); date.setUTCHours(0,0,0,0);
  const staff = (await db.select().from(users).where(and(eq(users.id, staffId), eq(users.schoolId, schoolId))).limit(1))[0]; if (!staff || !staffRoles.includes(staff.role)) redirect('/staff-attendance?error=Staff+member+not+found');
  const arrivalTime = formData.get('arrivalTime') ? new Date(`${date.toISOString().slice(0,10)}T${String(formData.get('arrivalTime'))}:00`) : null;
  const departureTime = formData.get('departureTime') ? new Date(`${date.toISOString().slice(0,10)}T${String(formData.get('departureTime'))}:00`) : null;
  await db.insert(staffAttendanceRecords).values({ schoolId, staffId, date, status, arrivalTime, departureTime, lateArrival: formData.get('lateArrival') === 'on', earlyDeparture: formData.get('earlyDeparture') === 'on', reason: String(formData.get('reason') || '').trim() || null, recordedById: actor.id })
    .onConflictDoUpdate({ target: [staffAttendanceRecords.staffId, staffAttendanceRecords.date], set: { status, arrivalTime, departureTime, lateArrival: formData.get('lateArrival') === 'on', earlyDeparture: formData.get('earlyDeparture') === 'on', reason: String(formData.get('reason') || '').trim() || null, recordedById: actor.id, updatedAt: new Date() } });
  await audit({ schoolId, userId: actor.id, action: 'STAFF_ATTENDANCE_RECORDED', entityType: 'StaffAttendance', entityId: staffId, newValue: { date, status } }); revalidatePath('/staff-attendance'); redirect('/staff-attendance?success=Staff+attendance+saved');
}

export async function requestStaffMovementAction(formData: FormData) {
  const user = await requireUser(); if (!staffRoles.includes(user.role)) redirect('/staff-attendance?error=Only+school+staff+can+request+movement'); const schoolId = await getActiveSchoolId(user);
  const reason = String(formData.get('reason') || '').trim(); const departure = validDateTime(formData.get('requestedDepartureAt')); const expectedReturn = validDateTime(formData.get('expectedReturnAt'));
  if (!reason || !departure) redirect('/staff-attendance?error=Reason+and+departure+time+are+required'); if (expectedReturn && expectedReturn <= departure) redirect('/staff-attendance?error=Expected+return+must+be+after+departure');
  const [request] = await db.insert(staffMovementRequests).values({ schoolId, staffId: user.id, reason, requestedDepartureAt: departure, expectedReturnAt: expectedReturn }).returning();
  await audit({ schoolId, userId: user.id, action: 'STAFF_MOVEMENT_REQUESTED', entityType: 'StaffMovement', entityId: request.id, newValue: { reason, departure, expectedReturn } }); revalidatePath('/staff-attendance'); redirect('/staff-attendance?success=Movement+request+submitted');
}

export async function decideStaffMovementAction(formData: FormData) {
  const actor = await requireUser(); if (!supervisors.includes(actor.role)) redirect('/staff-attendance?error=Only+an+authorised+supervisor+can+decide'); const schoolId = await getActiveSchoolId(actor);
  const requestId = String(formData.get('requestId') || ''); const decision = String(formData.get('decision') || 'APPROVE'); const decisionReason = String(formData.get('decisionReason') || '').trim();
  if (!['APPROVE','REJECT'].includes(decision)) redirect('/staff-attendance?error=Invalid+decision'); if (decision === 'REJECT' && !decisionReason) redirect('/staff-attendance?error=A+rejection+reason+is+required');
  const request = (await db.select().from(staffMovementRequests).where(and(eq(staffMovementRequests.id, requestId), eq(staffMovementRequests.schoolId, schoolId))).limit(1))[0]; if (!request || request.status !== 'PENDING') redirect('/staff-attendance?error=Request+is+not+pending');
  await db.update(staffMovementRequests).set({ status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', approvedById: actor.id, decisionReason: decisionReason || null, decidedAt: new Date(), actualDepartureAt: decision === 'APPROVE' ? new Date() : null, updatedAt: new Date() }).where(eq(staffMovementRequests.id, requestId));
  await audit({ schoolId, userId: actor.id, action: `STAFF_MOVEMENT_${decision}D`, entityType: 'StaffMovement', entityId: requestId, newValue: { decisionReason } }); revalidatePath('/staff-attendance'); redirect('/staff-attendance?success=Movement+decision+recorded');
}

export async function recordStaffReturnAction(formData: FormData) {
  const user = await requireUser(); const schoolId = await getActiveSchoolId(user); const requestId = String(formData.get('requestId') || '');
  const request = (await db.select().from(staffMovementRequests).where(and(eq(staffMovementRequests.id, requestId), eq(staffMovementRequests.schoolId, schoolId))).limit(1))[0];
  if (!request || request.status !== 'APPROVED' || (request.staffId !== user.id && !supervisors.includes(user.role))) redirect('/staff-attendance?error=Movement+request+cannot+be+closed');
  await db.update(staffMovementRequests).set({ status: 'RETURNED', actualReturnAt: new Date(), updatedAt: new Date() }).where(eq(staffMovementRequests.id, requestId));
  await audit({ schoolId, userId: user.id, action: 'STAFF_RETURN_RECORDED', entityType: 'StaffMovement', entityId: requestId }); revalidatePath('/staff-attendance'); redirect('/staff-attendance?success=Staff+return+recorded');
}
