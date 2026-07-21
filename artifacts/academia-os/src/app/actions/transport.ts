'use server';
import { and, desc, eq, gte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { learners, transportAssignments, transportRoutes, transportScans, transportStops, vehicles } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';
import { notifyLearnerGuardians } from '@/lib/notifications';

function allowed(role: string) { return ['SUPER_ADMIN','SCHOOL_ADMIN','TRANSPORT','SECURITY'].includes(role); }

export async function createVehicleAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/transport?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const name = String(formData.get('name') || '').trim(); const registrationNo = String(formData.get('registrationNo') || '').trim().toUpperCase(); const capacity = Number(formData.get('capacity'));
  if (!name || !registrationNo || !Number.isInteger(capacity) || capacity < 1) redirect('/transport?error=Enter+valid+vehicle+details');
  try { await db.insert(vehicles).values({ schoolId, name, registrationNo, capacity, driverName: String(formData.get('driverName') || '').trim() || null, driverPhone: String(formData.get('driverPhone') || '').trim() || null, attendantName: String(formData.get('attendantName') || '').trim() || null }); } catch { redirect('/transport?error=Vehicle+registration+already+exists'); }
  revalidatePath('/transport'); redirect('/transport?success=Vehicle+created');
}

export async function createRouteAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/transport?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const name = String(formData.get('name') || '').trim(); if (!name) redirect('/transport?error=Route+name+is+required');
  const vehicleId = String(formData.get('vehicleId') || '') || null;
  if (vehicleId) { const vehicle = (await db.select({ id: vehicles.id }).from(vehicles).where(and(eq(vehicles.id, vehicleId), eq(vehicles.schoolId, schoolId))).limit(1))[0]; if (!vehicle) redirect('/transport?error=Vehicle+not+found'); }
  try { await db.insert(transportRoutes).values({ schoolId, name, vehicleId, morningStartTime: String(formData.get('morningStartTime') || '').trim() || null, afternoonStartTime: String(formData.get('afternoonStartTime') || '').trim() || null }); } catch { redirect('/transport?error=Route+already+exists'); }
  revalidatePath('/transport'); redirect('/transport?success=Route+created');
}

export async function createStopAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/transport?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const routeId = String(formData.get('routeId') || ''); const name = String(formData.get('name') || '').trim(); const sequence = Number(formData.get('sequence'));
  if (!routeId || !name || !Number.isInteger(sequence) || sequence < 1) redirect('/transport?error=Enter+valid+stop+details');
  const route = (await db.select({ id: transportRoutes.id }).from(transportRoutes).where(and(eq(transportRoutes.id, routeId), eq(transportRoutes.schoolId, schoolId))).limit(1))[0]; if (!route) redirect('/transport?error=Route+not+found');
  try { await db.insert(transportStops).values({ schoolId, routeId, name, sequence, pickupTime: String(formData.get('pickupTime') || '').trim() || null, dropOffTime: String(formData.get('dropOffTime') || '').trim() || null }); } catch { redirect('/transport?error=Stop+sequence+already+exists+for+that+route'); }
  revalidatePath('/transport'); redirect('/transport?success=Stop+created');
}

export async function assignTransportAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/transport?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || ''); const routeId = String(formData.get('routeId') || ''); const stopId = String(formData.get('stopId') || '') || null; const vehicleId = String(formData.get('vehicleId') || '') || null;
  if (!learnerId || !routeId) redirect('/transport?error=Learner+and+route+are+required');
  const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0];
  const route = (await db.select().from(transportRoutes).where(and(eq(transportRoutes.id, routeId), eq(transportRoutes.schoolId, schoolId))).limit(1))[0];
  if (!learner || !route) redirect('/transport?error=Learner+or+route+not+found');
  if (stopId) { const stop = (await db.select().from(transportStops).where(and(eq(transportStops.id, stopId), eq(transportStops.schoolId, schoolId), eq(transportStops.routeId, routeId))).limit(1))[0]; if (!stop) redirect('/transport?error=Selected+stop+does+not+belong+to+the+route'); }
  if (vehicleId) { const vehicle = (await db.select().from(vehicles).where(and(eq(vehicles.id, vehicleId), eq(vehicles.schoolId, schoolId))).limit(1))[0]; if (!vehicle) redirect('/transport?error=Vehicle+not+found'); }
  await db.insert(transportAssignments).values({ schoolId, learnerId, routeId, stopId, vehicleId }).onConflictDoUpdate({ target: [transportAssignments.learnerId, transportAssignments.routeId], set: { stopId, vehicleId, isActive: true, updatedAt: new Date() } });
  revalidatePath('/transport'); redirect('/transport?success=Learner+assigned+to+transport');
}

export async function recordTransportScanAction(formData: FormData) {
  const user = await requireUser(); if (!allowed(user.role)) redirect('/transport?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const badgeCode = String(formData.get('badgeCode') || '').trim(); const type = String(formData.get('type') || 'MORNING_BOARD');
  if (!badgeCode || !['MORNING_BOARD','ARRIVED_SCHOOL','AFTERNOON_BOARD','DROPPED_OFF'].includes(type)) redirect('/transport?error=Enter+a+valid+badge+and+scan+type');
  const learner = (await db.select().from(learners).where(and(eq(learners.schoolId, schoolId), eq(learners.badgeCode, badgeCode))).limit(1))[0]; if (!learner) redirect('/transport?error=Badge+not+recognised');
  const assignment = (await db.select().from(transportAssignments).where(and(eq(transportAssignments.learnerId, learner.id), eq(transportAssignments.isActive, true))).limit(1))[0]; if (!assignment) redirect('/transport?error=Learner+has+no+active+transport+assignment');
  const duplicate = (await db.select().from(transportScans).where(and(eq(transportScans.learnerId, learner.id), eq(transportScans.type, type), gte(transportScans.scannedAt, new Date(Date.now() - 3 * 60000)))).orderBy(desc(transportScans.scannedAt)).limit(1))[0]; if (duplicate) redirect('/transport?error=Duplicate+transport+scan+blocked');
  await db.insert(transportScans).values({ schoolId, learnerId: learner.id, routeId: assignment.routeId, stopId: assignment.stopId, vehicleId: assignment.vehicleId, recordedById: user.id, type });
  const route = (await db.select().from(transportRoutes).where(eq(transportRoutes.id, assignment.routeId)).limit(1))[0];
  const vehicle = assignment.vehicleId ? (await db.select().from(vehicles).where(eq(vehicles.id, assignment.vehicleId)).limit(1))[0] : null;
  const stop = assignment.stopId ? (await db.select().from(transportStops).where(eq(transportStops.id, assignment.stopId)).limit(1))[0] : null;
  const verb = type === 'MORNING_BOARD' ? `boarded ${vehicle?.name || 'the school vehicle'}` : type === 'ARRIVED_SCHOOL' ? 'arrived at school' : type === 'AFTERNOON_BOARD' ? `boarded ${vehicle?.name || 'the school vehicle'} after school` : `was dropped off${stop?.name ? ` at ${stop.name}` : ''}`;
  await notifyLearnerGuardians({ schoolId, learnerId: learner.id, type: 'TRANSPORT', title: `${learner.firstName} ${learner.lastName}: transport update`, body: `${learner.firstName} ${learner.lastName} ${verb} at ${new Date().toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}${route?.name ? ` on ${route.name}` : ''}.`, link: '/transport' });
  await audit({ schoolId, userId: user.id, action: `TRANSPORT_${type}`, entityType: 'Learner', entityId: learner.id }); revalidatePath('/transport'); redirect(`/transport?success=${encodeURIComponent(`${learner.firstName} ${learner.lastName} transport status recorded`)}`);
}
