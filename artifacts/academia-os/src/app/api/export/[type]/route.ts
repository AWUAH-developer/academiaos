import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  academicSubmissions,
  academicYears,
  attendanceRecords,
  attendanceRegisters,
  auditLogs,
  classes,
  feeCharges,
  financialAdjustments,
  learners,
  payments,
  staffAttendanceRecords,
  subjects,
  terms,
  transportRoutes,
  transportScans,
  users,
  vehicles
} from '@/db/schema';
import { visibleLearnerIds } from '@/lib/access';
import { calculateFinancialBalance } from '@/lib/financial-balance';
import { currentUser } from '@/lib/auth';
import { canAccess } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  // Prevent spreadsheet formula injection when exported data is opened in Excel or similar tools.
  const safeText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return /[",\r\n]/.test(safeText) ? `"${safeText.replaceAll('"', '""')}"` : safeText;
}

function makeCsv(headers: string[], rows: unknown[][]) {
  const body = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  return `\uFEFF${body}`;
}

function csvResponse(type: string, headers: string[], rows: unknown[][]) {
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(makeCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="academiaos-${type}-${stamp}.csv"`,
      'Cache-Control': 'private, no-store'
    }
  });
}

export async function GET(_request: Request, context: { params: Promise<{ type: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { type } = await context.params;
  const schoolId = await getActiveSchoolId(user);
  const learnerScope = await visibleLearnerIds(user);
  const learnerFilter = learnerScope === null
    ? undefined
    : learnerScope.length
      ? inArray(learners.id, learnerScope)
      : eq(learners.id, '__none__');

  if (type === 'learners') {
    if (!canAccess(user.role, 'learners')) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    const rows = await db.select({ learner: learners, className: classes.name, stream: classes.stream })
      .from(learners).leftJoin(classes, eq(learners.classId, classes.id))
      .where(and(eq(learners.schoolId, schoolId), learnerFilter)).orderBy(learners.admissionNo);
    return csvResponse(type,
      ['Admission number','First name','Last name','Class','Stream','Gender','Payment plan','Badge code','Status','Admission date'],
      rows.map(({ learner, className, stream }) => [learner.admissionNo, learner.firstName, learner.lastName, className, stream, learner.gender, learner.paymentPlan, learner.badgeCode, learner.status, learner.admissionDate])
    );
  }

  if (type === 'attendance') {
    if (!canAccess(user.role, 'attendance')) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    const rows = await db.select({ attendance: attendanceRecords, learner: learners, className: classes.name, stream: classes.stream, recorder: users.name })
      .from(attendanceRecords)
      .innerJoin(learners, eq(attendanceRecords.learnerId, learners.id))
      .leftJoin(classes, eq(learners.classId, classes.id))
      .leftJoin(users, eq(attendanceRecords.recordedById, users.id))
      .leftJoin(attendanceRegisters, eq(attendanceRecords.registerId, attendanceRegisters.id))
      .where(and(eq(attendanceRecords.schoolId, schoolId), learnerFilter, or(isNull(attendanceRecords.registerId), eq(attendanceRegisters.status, "LOCKED"))))
      .orderBy(desc(attendanceRecords.date)).limit(10000);
    return csvResponse(type,
      ['Date','Admission number','Learner','Class','Stream','Status','Check-in','Check-out','Reason','Recorded by'],
      rows.map(({ attendance, learner, className, stream, recorder }) => [attendance.date, learner.admissionNo, `${learner.firstName} ${learner.lastName}`, className, stream, attendance.status, attendance.checkInTime, attendance.checkOutTime, attendance.reason, recorder])
    );
  }

  if (type === 'fees') {
    if (!canAccess(user.role, 'fees')) {
      return NextResponse.json(
        { error: 'Permission denied.' },
        { status: 403 },
      );
    }

    const rows = await db
      .select({
        payment: payments,
        learner: learners,
        recorder: users.name,
      })
      .from(payments)
      .innerJoin(
        learners,
        eq(payments.learnerId, learners.id),
      )
      .leftJoin(
        users,
        eq(payments.recordedById, users.id),
      )
      .where(
        and(
          eq(payments.schoolId, schoolId),
          learnerFilter,
        ),
      )
      .orderBy(desc(payments.createdAt))
      .limit(10000);

    const learnerIds = Array.from(
      new Set(
        rows.map(({ payment }) => payment.learnerId),
      ),
    );

    const chargeTotals = learnerIds.length
      ? await db
          .select({
            learnerId: feeCharges.learnerId,
            total: sql<number>`coalesce(sum(${feeCharges.amount}), 0)::numeric`,
          })
          .from(feeCharges)
          .where(
            and(
              eq(feeCharges.schoolId, schoolId),
              inArray(
                feeCharges.learnerId,
                learnerIds,
              ),
            ),
          )
          .groupBy(feeCharges.learnerId)
      : [];

    const paymentTotals = learnerIds.length
      ? await db
          .select({
            learnerId: payments.learnerId,
            total: sql<number>`coalesce(sum(${payments.amount}), 0)::numeric`,
          })
          .from(payments)
          .where(
            and(
              eq(payments.schoolId, schoolId),
              inArray(
                payments.learnerId,
                learnerIds,
              ),
            ),
          )
          .groupBy(payments.learnerId)
      : [];

    const adjustments = learnerIds.length
      ? await db
          .select({
            learnerId: financialAdjustments.learnerId,
            paymentId: financialAdjustments.paymentId,
            type: financialAdjustments.type,
            amount: financialAdjustments.amount,
          })
          .from(financialAdjustments)
          .where(
            and(
              eq(
                financialAdjustments.schoolId,
                schoolId,
              ),
              inArray(
                financialAdjustments.learnerId,
                learnerIds,
              ),
              isNotNull(financialAdjustments.approvedAt),
            ),
          )
      : [];

    const chargeTotalByLearner = new Map(
      chargeTotals.map((row) => [
        row.learnerId,
        Number(row.total || 0),
      ]),
    );

    const paymentTotalByLearner = new Map(
      paymentTotals.map((row) => [
        row.learnerId,
        Number(row.total || 0),
      ]),
    );

    const balanceByLearner = new Map(
      learnerIds.map((learnerId) => {
        const learnerAdjustments = adjustments
          .filter(
            (adjustment) =>
              adjustment.learnerId === learnerId,
          )
          .map((adjustment) => ({
            type: adjustment.type,
            amount: Number(adjustment.amount || 0),
          }));

        const balance = calculateFinancialBalance({
          totalCharges:
            chargeTotalByLearner.get(learnerId) || 0,
          totalPayments:
            paymentTotalByLearner.get(learnerId) || 0,
          adjustments: learnerAdjustments,
        });

        return [learnerId, balance] as const;
      }),
    );

    return csvResponse(
      type,
      [
        'Receipt number',
        'Date',
        'Admission number',
        'Learner',
        'Amount received',
        'Payment status',
        'Effective payment',
        'Method',
        'Reference',
        'Notes',
        'Recorded by',
        'Outstanding balance',
        'Credit / carry-forward',
      ],
      rows.map(({ payment, learner, recorder }) => {
        const reversed = adjustments.some(
          (adjustment) =>
            adjustment.type === 'PAYMENT_REVERSAL' &&
            adjustment.paymentId === payment.id,
        );

        const trueBalance =
          balanceByLearner.get(payment.learnerId) || 0;

        return [
          payment.receiptNo,
          payment.createdAt,
          learner.admissionNo,
          `${learner.firstName} ${learner.lastName}`,
          payment.amount,
          reversed ? 'REVERSED' : 'VALID',
          reversed ? 0 : payment.amount,
          payment.method,
          payment.reference,
          payment.notes,
          recorder,
          Math.max(0, trueBalance),
          Math.max(0, -trueBalance),
        ];
      }),
    );
  }

  if (type === 'academics') {
    if (!canAccess(user.role, 'academics') && !canAccess(user.role, 'reports')) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    const visibility = learnerScope === null ? undefined : inArray(academicSubmissions.status, ['LOCKED']);
    const rows = await db.select({ result: academicSubmissions, learner: learners, className: classes.name, stream: classes.stream, subjectName: subjects.name, yearName: academicYears.name, termName: terms.name, teacherName: users.name })
      .from(academicSubmissions)
      .innerJoin(learners, eq(academicSubmissions.learnerId, learners.id))
      .innerJoin(classes, eq(academicSubmissions.classId, classes.id))
      .innerJoin(subjects, eq(academicSubmissions.subjectId, subjects.id))
      .innerJoin(academicYears, eq(academicSubmissions.academicYearId, academicYears.id))
      .innerJoin(terms, eq(academicSubmissions.termId, terms.id))
      .leftJoin(users, eq(academicSubmissions.teacherId, users.id))
      .where(and(eq(academicSubmissions.schoolId, schoolId), learnerFilter, visibility))
      .orderBy(desc(academicSubmissions.updatedAt)).limit(10000);
    return csvResponse(type,
      ['Academic year','Term','Admission number','Learner','Class','Stream','Subject','Classwork','Homework','Test','Examination','Total','Grade','Position','Teacher remark','Conduct remark','Status','Teacher'],
      rows.map(({ result, learner, className, stream, subjectName, yearName, termName, teacherName }) => [yearName, termName, learner.admissionNo, `${learner.firstName} ${learner.lastName}`, className, stream, subjectName, result.classworkScore, result.homeworkScore, result.testScore, result.examScore, result.totalScore, result.grade, result.position, result.teacherRemark, result.conductRemark, result.status, teacherName])
    );
  }

  if (type === 'staff-attendance') {
    if (!canAccess(user.role, 'staff-attendance')) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    const supervisor = ['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR','HEADTEACHER'].includes(user.role);
    const rows = await db.select({ attendance: staffAttendanceRecords, staffName: users.name, staffRole: users.role })
      .from(staffAttendanceRecords).innerJoin(users, eq(staffAttendanceRecords.staffId, users.id))
      .where(and(eq(staffAttendanceRecords.schoolId, schoolId), supervisor ? undefined : eq(staffAttendanceRecords.staffId, user.id)))
      .orderBy(desc(staffAttendanceRecords.date)).limit(10000);
    return csvResponse(type,
      ['Date','Staff member','Role','Status','Arrival','Departure','Late arrival','Early departure','Reason'],
      rows.map(({ attendance, staffName, staffRole }) => [attendance.date, staffName, staffRole, attendance.status, attendance.arrivalTime, attendance.departureTime, attendance.lateArrival, attendance.earlyDeparture, attendance.reason])
    );
  }

  if (type === 'transport') {
    if (!canAccess(user.role, 'transport')) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    const rows = await db.select({ scan: transportScans, learner: learners, routeName: transportRoutes.name, vehicleName: vehicles.name, recorder: users.name })
      .from(transportScans)
      .innerJoin(learners, eq(transportScans.learnerId, learners.id))
      .leftJoin(transportRoutes, eq(transportScans.routeId, transportRoutes.id))
      .leftJoin(vehicles, eq(transportScans.vehicleId, vehicles.id))
      .leftJoin(users, eq(transportScans.recordedById, users.id))
      .where(eq(transportScans.schoolId, schoolId)).orderBy(desc(transportScans.scannedAt)).limit(10000);
    return csvResponse(type,
      ['Date and time','Admission number','Learner','Event','Route','Vehicle','Notification status','Recorded by'],
      rows.map(({ scan, learner, routeName, vehicleName, recorder }) => [scan.scannedAt, learner.admissionNo, `${learner.firstName} ${learner.lastName}`, scan.type, routeName, vehicleName, scan.notificationStatus, recorder])
    );
  }

  if (type === 'audit') {
    if (!canAccess(user.role, 'audit')) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    const rows = await db.select({ log: auditLogs, actor: users.name })
      .from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.schoolId, schoolId)).orderBy(desc(auditLogs.createdAt)).limit(10000);
    return csvResponse(type,
      ['Date and time','Actor','Action','Entity type','Entity ID','IP address','User agent','Previous value','New value'],
      rows.map(({ log, actor }) => [log.createdAt, actor, log.action, log.entityType, log.entityId, log.ipAddress, log.userAgent, JSON.stringify(log.oldValue ?? ''), JSON.stringify(log.newValue ?? '')])
    );
  }

  if (type === 'fee-arrears') {
    if (!canAccess(user.role, 'fee-arrears')) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    const { feeFollowUps } = await import('@/db/schema');
    const { calculateFinancialBalance } = await import('@/lib/financial-balance');
    const { computePaymentStatus } = await import('@/lib/fees');
    const { guardians, learnerGuardians } = await import('@/db/schema');
    const [learnerRows, chargeRows, paymentRows, adjustmentRows, guardianLinks, followUpRows] = await Promise.all([
      db.select({ learner: learners, className: classes.name, stream: classes.stream }).from(learners).leftJoin(classes, eq(learners.classId, classes.id)).where(and(eq(learners.schoolId, schoolId), eq(learners.status, 'ACTIVE'))).orderBy(learners.admissionNo),
      db.select({ learnerId: feeCharges.learnerId, amount: feeCharges.amount, dueDate: feeCharges.dueDate, status: feeCharges.status }).from(feeCharges).where(eq(feeCharges.schoolId, schoolId)),
      db.select({ learnerId: payments.learnerId, amount: payments.amount, createdAt: payments.createdAt }).from(payments).where(eq(payments.schoolId, schoolId)).orderBy(desc(payments.createdAt)),
      db.select({ learnerId: financialAdjustments.learnerId, type: financialAdjustments.type, amount: financialAdjustments.amount }).from(financialAdjustments).where(and(eq(financialAdjustments.schoolId, schoolId), isNotNull(financialAdjustments.approvedAt))),
      db.select({ learnerId: learnerGuardians.learnerId, name: guardians.name, phone: guardians.phone, isPrimary: learnerGuardians.isPrimary }).from(learnerGuardians).innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id)).where(eq(guardians.schoolId, schoolId)),
      db.select({ learnerId: feeFollowUps.learnerId, outcome: feeFollowUps.outcome, createdAt: feeFollowUps.createdAt, nextFollowUpDate: feeFollowUps.nextFollowUpDate }).from(feeFollowUps).where(eq(feeFollowUps.schoolId, schoolId)).orderBy(desc(feeFollowUps.createdAt)),
    ]);
    const cm = new Map<string, typeof chargeRows>(); for (const c of chargeRows) { const l = cm.get(c.learnerId) ?? []; l.push(c); cm.set(c.learnerId, l); }
    const pm = new Map<string, typeof paymentRows>(); for (const p of paymentRows) { const l = pm.get(p.learnerId) ?? []; l.push(p); pm.set(p.learnerId, l); }
    const am = new Map<string, typeof adjustmentRows>(); for (const a of adjustmentRows) { const l = am.get(a.learnerId) ?? []; l.push(a); am.set(a.learnerId, l); }
    const gm = new Map<string, typeof guardianLinks>(); for (const g of guardianLinks) { const l = gm.get(g.learnerId) ?? []; l.push(g); gm.set(g.learnerId, l); }
    const fm = new Map<string, typeof followUpRows>(); for (const f of followUpRows) { const l = fm.get(f.learnerId) ?? []; l.push(f); fm.set(f.learnerId, l); }
    const exportRows = learnerRows.map(({ learner, className, stream }) => {
      const charges = cm.get(learner.id) ?? []; const pays = pm.get(learner.id) ?? []; const adjs = am.get(learner.id) ?? [];
      const totalCharges = charges.reduce((s, c) => s + Number(c.amount), 0);
      const totalPayments = pays.reduce((s, p) => s + Number(p.amount), 0);
      const trueBalance = calculateFinancialBalance({ totalCharges, totalPayments, adjustments: adjs.map((a) => ({ type: a.type, amount: a.amount })) });
      const outstanding = Math.max(0, trueBalance); const carryForward = Math.max(0, -trueBalance);
      const status = computePaymentStatus({ trueBalance, totalCharges, totalPayments });
      const lastPay = pays[0]?.createdAt ?? null;
      const guardian = (gm.get(learner.id) ?? []).find((g) => g.isPrimary) ?? (gm.get(learner.id) ?? [])[0] ?? null;
      const latestFu = (fm.get(learner.id) ?? [])[0] ?? null;
      return [learner.admissionNo, `${learner.firstName} ${learner.lastName}`, `${className ?? ''}${stream ? ` ${stream}` : ''}`, learner.paymentPlan, totalCharges.toFixed(2), totalPayments.toFixed(2), outstanding.toFixed(2), carryForward.toFixed(2), status, lastPay?.toISOString() ?? '', guardian?.name ?? '', guardian?.phone ?? '', latestFu?.outcome ?? '', latestFu?.createdAt?.toISOString() ?? '', latestFu?.nextFollowUpDate?.toISOString() ?? ''];
    }).filter((r) => Number(r[6]) > 0 || Number(r[7]) > 0);
    return csvResponse('fee-arrears', ['Admission No','Learner','Class','Fee Plan','Total Charged','Total Paid','Outstanding','Credit Balance','Payment Status','Last Payment','Guardian Name','Guardian Phone','Last Follow-up Outcome','Last Follow-up Date','Next Follow-up Date'], exportRows);
  }

  return NextResponse.json({ error: 'Unknown export type.' }, { status: 404 });
}
