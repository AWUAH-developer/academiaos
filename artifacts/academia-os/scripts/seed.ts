import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { db, pool } from '../src/db';
import {
  academicSubmissions, academicYears, attendanceRecords, classes, feeCategories, feeCharges,
  feeStructures, guardians, homework, learnerGuardians, learners, payments, schools, subjects,
  supportTickets, teacherAssignments, terms, transportAssignments, transportRoutes, transportStops,
  users, vehicles
} from '../src/db/schema';


async function main() {
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed blocked. Set ALLOW_DEMO_SEED=true only for an isolated demonstration database.');
  }

  const now = new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

  const [school] = await db.insert(schools).values({
    name: 'Paul Lawrence Academy', code: 'PLA', address: 'Kwadaso, Kumasi, Ghana', phone: '0598015255',
    email: 'admin@paullawrenceacademy.edu.gh', logoUrl: '/icon.svg', currency: 'GHS', proprietorApprovalRequired: true
  }).onConflictDoUpdate({ target: schools.code, set: { name: 'Paul Lawrence Academy', updatedAt: now } }).returning();

  const userSeed = [
    ['System Super Admin', 'superadmin', 'SUPER_ADMIN', null],
    ['School Administrator', 'admin', 'SCHOOL_ADMIN', school.id],
    ['Mr Lawrence', 'proprietor', 'PROPRIETOR', school.id],
    ['Headteacher', 'headteacher', 'HEADTEACHER', school.id],
    ['Academic Administrator', 'academic', 'ACADEMIC_ADMIN', school.id],
    ['Ama Mensah', 'teacher', 'TEACHER', school.id],
    ['Kwesi Addo', 'teacher2', 'TEACHER', school.id],
    ['Esi Boadu', 'teacher3', 'TEACHER', school.id],
    ['Accounts Officer', 'accounts', 'ACCOUNTS', school.id],
    ['Transport Officer', 'transport', 'TRANSPORT', school.id],
    ['Security Officer', 'security', 'SECURITY', school.id],
    ['Eric Boateng Parent', 'parent1', 'PARENT', school.id],
    ['Akosua Owusu Parent', 'parent2', 'PARENT', school.id],
    ['Eric Boateng', 'learner1', 'LEARNER', school.id]
  ] as const;

  const seededUsers = new Map<string, typeof users.$inferSelect>();
  for (const [index, [name, username, role, schoolId]] of userSeed.entries()) {
    const email = `${username}@academiaos.demo`;
    const phone = `020000${String(index + 1).padStart(4, '0')}`;
    const photoUrl = role === 'LEARNER' ? '/learner-placeholder.svg' : role === 'PARENT' ? null : '/staff-placeholder.svg';
    const [user] = await db.insert(users).values({ name, username, role, schoolId, email, phone, photoUrl, passwordHash, mustChangePassword: false })
      .onConflictDoUpdate({ target: users.username, set: { name, role, schoolId, email, phone, photoUrl, passwordHash, status: 'ACTIVE', updatedAt: now } }).returning();
    seededUsers.set(username, user);
  }

  const [year] = await db.insert(academicYears).values({ schoolId: school.id, name: '2026/2027', startsOn: new Date('2026-09-01'), endsOn: new Date('2027-07-31'), isCurrent: true })
    .onConflictDoUpdate({ target: [academicYears.schoolId, academicYears.name], set: { isCurrent: true, updatedAt: now } }).returning();
  const [term] = await db.insert(terms).values({ schoolId: school.id, academicYearId: year.id, name: 'Term 1', startsOn: new Date('2026-09-01'), endsOn: new Date('2026-12-18'), reopeningDate: new Date('2027-01-11'), isCurrent: true })
    .onConflictDoUpdate({ target: [terms.academicYearId, terms.name], set: { isCurrent: true, updatedAt: now } }).returning();

  const classRows = [];
  for (const value of [
    { name: 'Primary 5', stream: 'A', level: 'Primary' },
    { name: 'Primary 5', stream: 'B', level: 'Primary' },
    { name: 'JHS 1', stream: 'A', level: 'JHS' }
  ]) {
    const [row] = await db.insert(classes).values({ schoolId: school.id, ...value })
      .onConflictDoUpdate({ target: [classes.schoolId, classes.name, classes.stream], set: { level: value.level, isActive: true, updatedAt: now } }).returning();
    classRows.push(row);
  }

  const subjectRows = [];
  for (const value of [
    { name: 'Mathematics', code: 'MATH' }, { name: 'English Language', code: 'ENG' },
    { name: 'Science', code: 'SCI' }, { name: 'Social Studies', code: 'SOC' }, { name: 'Computing', code: 'ICT' }
  ]) {
    const [row] = await db.insert(subjects).values({ schoolId: school.id, ...value })
      .onConflictDoUpdate({ target: [subjects.schoolId, subjects.code], set: { name: value.name, isActive: true, updatedAt: now } }).returning();
    subjectRows.push(row);
  }

  const teacher = seededUsers.get('teacher')!;
  for (const subject of subjectRows.slice(0, 3)) {
    await db.insert(teacherAssignments).values({ schoolId: school.id, teacherId: teacher.id, classId: classRows[0].id, subjectId: subject.id }).onConflictDoNothing();
  }

  const learnerSeed = [
    ['PLA-001', 'Eric', 'Boateng', classRows[0].id, 'DAILY', '0240000001'],
    ['PLA-002', 'Akosua', 'Owusu', classRows[0].id, 'TERM', '0240000002'],
    ['PLA-003', 'Kwame', 'Asare', classRows[1].id, 'TERM', '0240000003'],
    ['PLA-004', 'Adwoa', 'Nyarko', classRows[2].id, 'INSTALLMENT', '0240000004'],
    ['PLA-005', 'Kofi', 'Adu', classRows[2].id, 'TERM', '0240000005']
  ] as const;
  const learnerRows = [];
  for (const [index, [admissionNo, firstName, lastName, classId, paymentPlan, phone]] of learnerSeed.entries()) {
    const [learner] = await db.insert(learners).values({
      schoolId: school.id, admissionNo, firstName, lastName, classId, paymentPlan, userId: index === 0 ? seededUsers.get('learner1')!.id : null,
      badgeCode: `${school.code}-${admissionNo}-QR`, photoUrl: '/learner-placeholder.svg', status: 'ACTIVE'
    }).onConflictDoUpdate({ target: [learners.schoolId, learners.admissionNo], set: { firstName, lastName, classId, paymentPlan, updatedAt: now } }).returning();
    learnerRows.push(learner);
    let guardian = (await db.select().from(guardians).where(and(eq(guardians.schoolId, school.id), eq(guardians.phone, phone))).limit(1))[0];
    const parentUserId = index === 0 ? seededUsers.get('parent1')!.id : index === 1 ? seededUsers.get('parent2')!.id : null;
    if (!guardian) [guardian] = await db.insert(guardians).values({ schoolId: school.id, name: `${lastName} Guardian`, phone, email: `${lastName.toLowerCase()}@parent.demo`, userId: parentUserId }).returning();
    else if (parentUserId && guardian.userId !== parentUserId) [guardian] = await db.update(guardians).set({ userId: parentUserId, updatedAt: now }).where(eq(guardians.id, guardian.id)).returning();
    await db.insert(learnerGuardians).values({ learnerId: learner.id, guardianId: guardian.id, relationship: 'Guardian', isPrimary: true }).onConflictDoNothing();
  }

  for (let i = 0; i < learnerRows.length; i++) {
    await db.insert(attendanceRecords).values({ schoolId: school.id, learnerId: learnerRows[i].id, date: today, status: i === 3 ? 'ABSENT' : 'PRESENT', checkInTime: i === 3 ? null : now, recordedById: seededUsers.get('admin')!.id })
      .onConflictDoUpdate({ target: [attendanceRecords.learnerId, attendanceRecords.date], set: { status: i === 3 ? 'ABSENT' : 'PRESENT', updatedAt: now } });
  }

  const categories = [];
  for (const value of [
    { name: 'Tuition', code: 'TUITION', isDailyTuition: true },
    { name: 'Canteen', code: 'CANTEEN', isCanteen: true },
    { name: 'Transport', code: 'TRANSPORT' }, { name: 'Examination', code: 'EXAM' }
  ]) {
    const [row] = await db.insert(feeCategories).values({ schoolId: school.id, ...value })
      .onConflictDoUpdate({ target: [feeCategories.schoolId, feeCategories.code], set: { name: value.name, updatedAt: now } }).returning();
    categories.push(row);
  }
  await db.insert(feeStructures).values([
    { schoolId: school.id, categoryId: categories[0].id, classId: classRows[0].id, paymentPlan: 'DAILY', amount: 10, chargeOnAbsent: true },
    { schoolId: school.id, categoryId: categories[1].id, classId: classRows[0].id, paymentPlan: 'DAILY', amount: 5, chargeOnAbsent: false },
    { schoolId: school.id, categoryId: categories[0].id, classId: classRows[0].id, paymentPlan: 'TERM', amount: 850, chargeOnAbsent: true }
  ]).onConflictDoNothing();

  for (const learner of learnerRows) {
    const exists = await db.select({ id: feeCharges.id }).from(feeCharges).where(and(eq(feeCharges.learnerId, learner.id), eq(feeCharges.description, 'Term tuition'))).limit(1);
    if (!exists.length) await db.insert(feeCharges).values({ schoolId: school.id, learnerId: learner.id, categoryId: categories[0].id, description: 'Term tuition', amount: 850 });
  }
  await db.insert(payments).values({ schoolId: school.id, learnerId: learnerRows[0].id, amount: 350, method: 'MOBILE_MONEY', reference: 'MOMO-DEMO-001', receiptNo: 'PLA-000001', recordedById: seededUsers.get('accounts')!.id }).onConflictDoNothing();

  await db.insert(academicSubmissions).values({
    schoolId: school.id, learnerId: learnerRows[0].id, teacherId: teacher.id, academicYearId: year.id, termId: term.id,
    classId: classRows[0].id, subjectId: subjectRows[0].id, classworkScore: 8, homeworkScore: 9, testScore: 17, examScore: 54,
    totalScore: 88, grade: 'A', teacherRemark: 'Excellent work. Maintain the standard.', status: 'SUBMITTED', submittedAt: now
  }).onConflictDoNothing();

  const hwExists = await db.select({ id: homework.id }).from(homework).where(and(eq(homework.schoolId, school.id), eq(homework.title, 'Fractions practice'))).limit(1);
  if (!hwExists.length) await db.insert(homework).values({ schoolId: school.id, teacherId: teacher.id, academicYearId: year.id, termId: term.id, classId: classRows[0].id, subjectId: subjectRows[0].id, title: 'Fractions practice', instructions: 'Complete questions 1 to 10 in the exercise book.', dueAt: new Date(Date.now() + 3 * 86400000), maximumScore: 10 });

  const [vehicle] = await db.insert(vehicles).values({ schoolId: school.id, name: 'Bus 2', registrationNo: 'AS-2026-24', capacity: 35, driverName: 'Yaw Mensah', driverPhone: '0241112233', attendantName: 'Comfort Owusu' })
    .onConflictDoUpdate({ target: [vehicles.schoolId, vehicles.registrationNo], set: { name: 'Bus 2', updatedAt: now } }).returning();
  const [route] = await db.insert(transportRoutes).values({ schoolId: school.id, vehicleId: vehicle.id, name: 'Kwadaso Route', morningStartTime: '06:30', afternoonStartTime: '15:15' })
    .onConflictDoUpdate({ target: [transportRoutes.schoolId, transportRoutes.name], set: { vehicleId: vehicle.id, updatedAt: now } }).returning();
  let stop = (await db.select().from(transportStops).where(and(eq(transportStops.routeId, route.id), eq(transportStops.sequence, 1))).limit(1))[0];
  if (!stop) [stop] = await db.insert(transportStops).values({ schoolId: school.id, routeId: route.id, name: 'Kwadaso', sequence: 1, pickupTime: '06:45', dropOffTime: '16:05' }).returning();
  await db.insert(transportAssignments).values({ schoolId: school.id, learnerId: learnerRows[0].id, routeId: route.id, stopId: stop.id, vehicleId: vehicle.id }).onConflictDoNothing();

  const ticketExists = await db.select({ id: supportTickets.id }).from(supportTickets).where(and(eq(supportTickets.schoolId, school.id), eq(supportTickets.subject, 'Demo support request'))).limit(1);
  if (!ticketExists.length) await db.insert(supportTickets).values({ schoolId: school.id, createdById: seededUsers.get('admin')!.id, subject: 'Demo support request', description: 'Confirm that the attendance scanner is connected.', priority: 'NORMAL' });

  console.log('AcademiaOS demo data seeded.');
  console.log('Demo password for every account: ChangeMe123!');
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
