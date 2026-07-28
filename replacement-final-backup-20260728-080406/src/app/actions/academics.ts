'use server';
import crypto from 'crypto';
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import {
  academicSubmissions, academicYears, approvalEvents, attendanceRecords, attendanceRegisters, classes, feeCharges, financialAdjustments, homework, learnerGuardians,
  learners, notifications, payments, subjects, teacherAssignments, terminalReports, terms, guardians
} from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { calculateFinancialBalance } from '@/lib/financial-balance';
import { canApproveAcademics, canReviewAcademics } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';
import { notifyClassGuardians } from '@/lib/notifications';
import { homeworkMaterialToDataUrl, HomeworkMaterialUploadError } from '@/lib/homework-material';

function gradeFor(total: number) { if (total >= 80) return 'A'; if (total >= 70) return 'B'; if (total >= 60) return 'C'; if (total >= 50) return 'D'; return 'F'; }
function refresh() { for (const path of ['/academics','/approvals','/reports','/dashboard']) revalidatePath(path); }

async function teacherMayEnter(schoolId: string, userId: string, role: string, classId: string, subjectId: string) {
  if (['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN'].includes(role)) return true;
  if (role !== 'TEACHER') return false;
  return Boolean((await db.select({ id: teacherAssignments.id }).from(teacherAssignments).where(and(eq(teacherAssignments.schoolId, schoolId), eq(teacherAssignments.teacherId, userId), eq(teacherAssignments.classId, classId), eq(teacherAssignments.subjectId, subjectId))).limit(1))[0]);
}

export async function saveAcademicAction(formData: FormData) {
  const user = await requireUser(); const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || ''); const classId = String(formData.get('classId') || ''); const subjectId = String(formData.get('subjectId') || '');
  const academicYearId = String(formData.get('academicYearId') || ''); const termId = String(formData.get('termId') || '');
  const scores = ['classworkScore','homeworkScore','testScore','examScore'].map((key) => Number(formData.get(key)));
  if (!learnerId || !classId || !subjectId || !academicYearId || !termId || scores.some((s) => !Number.isFinite(s) || s < 0)) redirect('/academics?error=Enter+valid+result+details');
  const [classRecord, subjectRecord, yearRecord, termRecord] = await Promise.all([
    db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId))).limit(1).then((r) => r[0]),
    db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId))).limit(1).then((r) => r[0]),
    db.select({ id: academicYears.id }).from(academicYears).where(and(eq(academicYears.id, academicYearId), eq(academicYears.schoolId, schoolId))).limit(1).then((r) => r[0]),
    db.select().from(terms).where(and(eq(terms.id, termId), eq(terms.schoolId, schoolId), eq(terms.academicYearId, academicYearId))).limit(1).then((r) => r[0])
  ]);
  if (!classRecord || !subjectRecord || !yearRecord || !termRecord) redirect('/academics?error=Academic+year,+term,+class+or+subject+is+invalid');
  const total = scores.reduce((sum, n) => sum + n, 0); if (total > 100) redirect('/academics?error=Total+score+cannot+exceed+100');
  if (!(await teacherMayEnter(schoolId, user.id, user.role, classId, subjectId))) redirect('/academics?error=You+are+not+assigned+to+that+class+and+subject');
  const learner = (await db.select().from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId), eq(learners.classId, classId))).limit(1))[0]; if (!learner) redirect('/academics?error=Learner+does+not+belong+to+the+selected+class');
  const existing = (await db.select().from(academicSubmissions).where(and(eq(academicSubmissions.learnerId, learnerId), eq(academicSubmissions.academicYearId, academicYearId), eq(academicSubmissions.termId, termId), eq(academicSubmissions.subjectId, subjectId))).limit(1))[0];
  if (existing && user.role === 'TEACHER' && existing.teacherId !== user.id) redirect('/academics?error=Another+teacher+owns+this+result+record');
  if (existing && !['DRAFT','RETURNED','REJECTED','REOPENED'].includes(existing.status)) redirect('/academics?error=This+result+is+already+in+the+approval+workflow');
  const status = formData.get('mode') === 'DRAFT' ? 'DRAFT' : 'SUBMITTED';
  const data = { schoolId, learnerId, teacherId: user.id, academicYearId, termId, classId, subjectId, classworkScore: scores[0], homeworkScore: scores[1], testScore: scores[2], examScore: scores[3], totalScore: total, grade: gradeFor(total), teacherRemark: String(formData.get('teacherRemark') || '').trim() || null, conductRemark: String(formData.get('conductRemark') || '').trim() || null, classTeacherRemark: String(formData.get('classTeacherRemark') || '').trim() || null, status, rejectionReason: null, submittedAt: status === 'SUBMITTED' ? new Date() : null, updatedAt: new Date() };
  let record;
  if (existing) [record] = await db.update(academicSubmissions).set(data).where(eq(academicSubmissions.id, existing.id)).returning();
  else [record] = await db.insert(academicSubmissions).values(data).returning();
  await db.insert(approvalEvents).values({ schoolId, submissionId: record.id, actorId: user.id, decision: existing ? (status === 'SUBMITTED' ? 'RESUBMITTED' : 'SUBMITTED') : 'SUBMITTED', oldValue: existing ? { totalScore: existing.totalScore, status: existing.status } : null, newValue: { totalScore: total, status } });
  await audit({ schoolId, userId: user.id, action: status === 'DRAFT' ? 'ACADEMIC_DRAFT_SAVED' : 'ACADEMIC_SUBMITTED', entityType: 'AcademicSubmission', entityId: record.id, newValue: { learnerId, subjectId, total, status } });
  refresh(); redirect(`/academics?success=${status === 'DRAFT' ? 'Draft+saved' : 'Result+submitted+for+review'}`);
}

export async function academicReviewAction(formData: FormData) {
  const user = await requireUser(); if (!canReviewAcademics(user.role)) redirect('/approvals?error=Only+an+academic+reviewer+can+perform+this+action'); const schoolId = await getActiveSchoolId(user);
  const submissionId = String(formData.get('submissionId') || ''); const decision = String(formData.get('decision') || 'FORWARD'); const reason = String(formData.get('reason') || '').trim();
  const record = (await db.select().from(academicSubmissions).where(and(eq(academicSubmissions.id, submissionId), eq(academicSubmissions.schoolId, schoolId))).limit(1))[0]; if (!record || record.status !== 'SUBMITTED') redirect('/approvals?error=Only+submitted+records+can+be+reviewed');
  if (decision === 'RETURN' && !reason) redirect('/approvals?error=A+reason+is+required'); const next = decision === 'RETURN' ? 'RETURNED' : 'UNDER_REVIEW';
  await db.transaction(async (tx) => {
    await tx.update(academicSubmissions).set({ status: next, reviewerId: user.id, reviewedAt: new Date(), rejectionReason: reason || null, updatedAt: new Date() }).where(eq(academicSubmissions.id, submissionId));
    await tx.insert(approvalEvents).values({ schoolId, submissionId, actorId: user.id, decision: decision === 'RETURN' ? 'RETURNED' : 'FORWARDED', reason: reason || null, oldValue: { status: record.status }, newValue: { status: next } });
    if (decision === 'RETURN') await tx.insert(notifications).values({ schoolId, userId: record.teacherId, type: 'APPROVAL', title: 'Academic record returned', body: reason, link: '/academics' });
  });
  await audit({ schoolId, userId: user.id, action: decision === 'RETURN' ? 'ACADEMIC_RETURNED_BY_REVIEWER' : 'ACADEMIC_FORWARDED_TO_PROPRIETOR', entityType: 'AcademicSubmission', entityId: submissionId, newValue: { reason, status: next } }); refresh(); redirect('/approvals?success=Academic+review+recorded');
}

async function recalculatePositions(record: typeof academicSubmissions.$inferSelect) {
  const rows = await db.select({ id: academicSubmissions.id, total: academicSubmissions.totalScore }).from(academicSubmissions).where(and(eq(academicSubmissions.schoolId, record.schoolId), eq(academicSubmissions.classId, record.classId), eq(academicSubmissions.subjectId, record.subjectId), eq(academicSubmissions.termId, record.termId), inArray(academicSubmissions.status, ['APPROVED','LOCKED']))).orderBy(desc(academicSubmissions.totalScore));
  let lastScore: number | null = null; let lastPosition = 0;
  for (let i = 0; i < rows.length; i++) { if (lastScore === null || rows[i].total < lastScore) lastPosition = i + 1; lastScore = rows[i].total; await db.update(academicSubmissions).set({ position: lastPosition }).where(eq(academicSubmissions.id, rows[i].id)); }
}

export async function proprietorDecisionAction(formData: FormData) {
  const user = await requireUser(); if (!canApproveAcademics(user.role)) redirect('/approvals?error=Only+the+proprietor+can+give+final+approval'); const schoolId = await getActiveSchoolId(user);
  const submissionId = String(formData.get('submissionId') || ''); const decision = String(formData.get('decision') || 'APPROVE'); const reason = String(formData.get('reason') || '').trim();
  const record = (await db.select().from(academicSubmissions).where(and(eq(academicSubmissions.id, submissionId), eq(academicSubmissions.schoolId, schoolId))).limit(1))[0]; if (!record || record.status !== 'UNDER_REVIEW') redirect('/approvals?error=Record+is+not+ready+for+final+approval');
  if (decision !== 'APPROVE' && !reason) redirect('/approvals?error=A+reason+is+required+when+returning+or+rejecting');
  const next = decision === 'APPROVE' ? 'LOCKED' : decision === 'REJECT' ? 'REJECTED' : 'RETURNED';
  await db.transaction(async (tx) => {
    await tx.update(academicSubmissions).set({ status: next, proprietorId: user.id, approvedAt: decision === 'APPROVE' ? new Date() : null, lockedAt: decision === 'APPROVE' ? new Date() : null, rejectionReason: reason || null, updatedAt: new Date() }).where(eq(academicSubmissions.id, submissionId));
    await tx.insert(approvalEvents).values({ schoolId, submissionId, actorId: user.id, decision: decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'RETURNED', reason: reason || null, oldValue: { status: record.status }, newValue: { status: next } });
    if (decision !== 'APPROVE') await tx.insert(notifications).values({ schoolId, userId: record.teacherId, type: 'APPROVAL', title: `Academic record ${decision === 'REJECT' ? 'rejected' : 'returned'}`, body: reason, link: '/academics' });
  });
  if (decision === 'APPROVE') await recalculatePositions({ ...record, status: next });
  await audit({ schoolId, userId: user.id, action: `ACADEMIC_${next}`, entityType: 'AcademicSubmission', entityId: submissionId, newValue: { reason, status: next } }); refresh(); redirect('/approvals?success=Proprietor+decision+recorded');
}

export async function reopenAcademicAction(formData: FormData) {
  const user = await requireUser(); if (user.role !== 'SUPER_ADMIN') redirect('/approvals?error=Only+SUPER_ADMIN+can+reopen+approved+results'); const schoolId = await getActiveSchoolId(user);
  const submissionId = String(formData.get('submissionId') || ''); const reason = String(formData.get('reason') || '').trim(); if (!reason) redirect('/approvals?error=A+reopening+reason+is+required');
  const record = (await db.select().from(academicSubmissions).where(and(eq(academicSubmissions.id, submissionId), eq(academicSubmissions.schoolId, schoolId))).limit(1))[0]; if (!record || !['LOCKED','APPROVED'].includes(record.status)) redirect('/approvals?error=Only+approved+records+can+be+reopened');
  await db.transaction(async (tx) => { await tx.update(academicSubmissions).set({ status: 'REOPENED', rejectionReason: reason, lockedAt: null, updatedAt: new Date() }).where(eq(academicSubmissions.id, submissionId)); await tx.insert(approvalEvents).values({ schoolId, submissionId, actorId: user.id, decision: 'REOPENED', reason, oldValue: { totalScore: record.totalScore, teacherRemark: record.teacherRemark, status: record.status }, newValue: { status: 'REOPENED' } }); await tx.insert(notifications).values({ schoolId, userId: record.teacherId, type: 'APPROVAL', title: 'Approved result reopened', body: reason, link: '/academics' }); });
  await audit({ schoolId, userId: user.id, action: 'ACADEMIC_REOPENED', entityType: 'AcademicSubmission', entityId: submissionId, oldValue: { totalScore: record.totalScore, status: record.status }, newValue: { reason, status: 'REOPENED' } }); refresh(); redirect('/approvals?success=Result+reopened+for+correction');
}

export async function createHomeworkAction(formData: FormData) {
  const user = await requireUser();

  if (!["SUPER_ADMIN","SCHOOL_ADMIN","HEADTEACHER","ACADEMIC_ADMIN","TEACHER"].includes(user.role)) {
    redirect("/homework?error=Permission+denied");
  }

  const schoolId = await getActiveSchoolId(user);
  const academicYearId = String(formData.get("academicYearId") || "");
  const termId = String(formData.get("termId") || "");
  const classId = String(formData.get("classId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  const title = String(formData.get("title") || "").trim();
  const instructions = String(formData.get("instructions") || "").trim();
  const sourceType = String(formData.get("sourceType") || "WRITTEN").toUpperCase();
  const bookTitle = String(formData.get("bookTitle") || "").trim() || null;
  const pageReference = String(formData.get("pageReference") || "").trim() || null;

  const dueDate = String(formData.get("dueDate") || "").trim();
  const dueTime = String(formData.get("dueTime") || "").trim();
  const match = dueDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = dueTime.match(/^(\d{2}):(\d{2})$/);
  let dueAt = new Date(NaN);

  if (match && timeMatch) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (
      candidate.getUTCFullYear() === year &&
      candidate.getUTCMonth() === month - 1 &&
      candidate.getUTCDate() === day &&
      hour >= 0 && hour <= 23 &&
      minute >= 0 && minute <= 59
    ) {
      dueAt = candidate;
    }
  }

  if (
    !title ||
    !instructions ||
    !academicYearId ||
    !termId ||
    !classId ||
    !subjectId ||
    Number.isNaN(dueAt.getTime()) ||
    !["WRITTEN","BOOK","UPLOAD","BOOK_AND_UPLOAD"].includes(sourceType)
  ) {
    redirect("/homework?error=Enter+valid+homework+details+using+DD/MM/YYYY+for+the+date");
  }

  if (
    (sourceType === "BOOK" || sourceType === "BOOK_AND_UPLOAD") &&
    (!bookTitle || !pageReference)
  ) {
    redirect("/homework?error=Book+title+and+page+reference+are+required");
  }

  const [classRecord, subjectRecord, yearRecord, termRecord] = await Promise.all([
    db.select({ id: classes.id }).from(classes)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
      .limit(1).then((rows) => rows[0]),

    db.select({ id: subjects.id, name: subjects.name }).from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId)))
      .limit(1).then((rows) => rows[0]),

    db.select({ id: academicYears.id }).from(academicYears)
      .where(and(eq(academicYears.id, academicYearId), eq(academicYears.schoolId, schoolId)))
      .limit(1).then((rows) => rows[0]),

    db.select({ id: terms.id }).from(terms)
      .where(and(
        eq(terms.id, termId),
        eq(terms.schoolId, schoolId),
        eq(terms.academicYearId, academicYearId)
      ))
      .limit(1).then((rows) => rows[0])
  ]);

  if (!classRecord || !subjectRecord || !yearRecord || !termRecord) {
    redirect("/homework?error=Academic+year,+term,+class+or+subject+is+invalid");
  }

  if (!(await teacherMayEnter(schoolId, user.id, user.role, classId, subjectId))) {
    redirect("/homework?error=You+are+not+assigned+to+that+class+and+subject");
  }

  let material: Awaited<ReturnType<typeof homeworkMaterialToDataUrl>> = null;

  try {
    material = await homeworkMaterialToDataUrl(formData.get("material"));
  } catch (error) {
    redirect(
      "/homework?error=" +
        encodeURIComponent(
          error instanceof HomeworkMaterialUploadError
            ? error.message
            : "Homework material could not be processed."
        )
    );
  }

  if ((sourceType === "UPLOAD" || sourceType === "BOOK_AND_UPLOAD") && !material) {
    redirect("/homework?error=Upload+the+homework+file+or+image");
  }

  const [record] = await db.insert(homework).values({
    schoolId,
    teacherId: user.id,
    academicYearId,
    termId,
    classId,
    subjectId,
    title,
    instructions,
    dueAt,
    maximumScore: formData.get("maximumScore")
      ? Number(formData.get("maximumScore"))
      : null,
    sourceType,
    bookTitle,
    pageReference,
    attachmentUrl: material?.dataUrl || null,
    attachmentName: material?.fileName || null,
    attachmentMimeType: material?.mimeType || null
  }).returning();

  await notifyClassGuardians({
    schoolId,
    classId,
    type: "HOMEWORK",
    title: "New " + subjectRecord.name + " homework",
    body: title + " is due " + dueAt.toLocaleString("en-GB", {
      timeZone: "Africa/Accra",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }) + ".",
    link: "/homework"
  });

  await audit({
    schoolId,
    userId: user.id,
    action: "HOMEWORK_PUBLISHED",
    entityType: "Homework",
    entityId: record.id,
    newValue: {
      title,
      classId,
      subjectId,
      dueAt,
      sourceType,
      bookTitle,
      pageReference,
      attachmentName: material?.fileName || null
    }
  });

  revalidatePath("/homework");
  redirect("/homework?success=Homework+published");
}

export async function generateTerminalReportAction(formData: FormData) {
  const user = await requireUser(); if (!['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','PROPRIETOR'].includes(user.role)) redirect('/reports?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const learnerId = String(formData.get('learnerId') || ''); const academicYearId = String(formData.get('academicYearId') || ''); const termId = String(formData.get('termId') || '');
  const period = (await db.select({ yearName: academicYears.name, termName: terms.name, termStart: terms.startsOn, termEnd: terms.endsOn, reopeningDate: terms.reopeningDate }).from(terms).innerJoin(academicYears, eq(terms.academicYearId, academicYears.id)).where(and(eq(terms.id, termId), eq(terms.schoolId, schoolId), eq(terms.academicYearId, academicYearId), eq(academicYears.schoolId, schoolId))).limit(1))[0];
  if (!period) redirect('/reports?error=Academic+year+or+term+is+invalid');
  const learnerRows = await db.select({ learner: learners, className: classes.name, stream: classes.stream }).from(learners).leftJoin(classes, eq(learners.classId, classes.id)).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1); const learnerRow = learnerRows[0]; if (!learnerRow || !learnerRow.learner.classId) redirect('/reports?error=Learner+or+class+not+found');
  const results = await db.select({ result: academicSubmissions, subjectName: subjects.name }).from(academicSubmissions).innerJoin(subjects, eq(academicSubmissions.subjectId, subjects.id)).where(and(eq(academicSubmissions.learnerId, learnerId), eq(academicSubmissions.academicYearId, academicYearId), eq(academicSubmissions.termId, termId), eq(academicSubmissions.status, 'LOCKED'))).orderBy(asc(subjects.name));
  if (!results.length) redirect('/reports?error=No+proprietor-approved+results+are+available');
  const attendance = await db
    .select({ status: attendanceRecords.status })
    .from(attendanceRecords)
    .leftJoin(
      attendanceRegisters,
      eq(attendanceRecords.registerId, attendanceRegisters.id),
    )
    .where(
      and(
        eq(attendanceRecords.learnerId, learnerId),
        eq(attendanceRecords.schoolId, schoolId),
        gte(attendanceRecords.date, period.termStart),
        lte(attendanceRecords.date, period.termEnd),
        or(
          isNull(attendanceRecords.registerId),
          eq(attendanceRegisters.status, 'LOCKED'),
        ),
      ),
    );
  const [charges, paymentRows, adjustments] = await Promise.all([
    db
      .select({ amount: feeCharges.amount })
      .from(feeCharges)
      .where(
        and(
          eq(feeCharges.learnerId, learnerId),
          eq(feeCharges.schoolId, schoolId),
        ),
      ),
    db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.learnerId, learnerId),
          eq(payments.schoolId, schoolId),
        ),
      ),
    db
      .select({
        type: financialAdjustments.type,
        amount: financialAdjustments.amount,
      })
      .from(financialAdjustments)
      .where(
        and(
          eq(financialAdjustments.learnerId, learnerId),
          eq(financialAdjustments.schoolId, schoolId),
          isNotNull(financialAdjustments.approvedAt),
        ),
      ),
  ]);

  const trueBalance = calculateFinancialBalance({
    totalCharges: charges.reduce(
      (sum, charge) => sum + Number(charge.amount || 0),
      0,
    ),
    totalPayments: paymentRows.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    ),
    adjustments,
  });

  const outstandingBalance = Math.max(0, trueBalance);
  const creditCarryForward = Math.max(0, -trueBalance);

  const snapshot = { learner: { admissionNo: learnerRow.learner.admissionNo, name: `${learnerRow.learner.firstName} ${learnerRow.learner.lastName}`, className: `${learnerRow.className || ''}${learnerRow.stream ? ` ${learnerRow.stream}` : ''}` }, academicYear: period.yearName, term: period.termName, reopeningDate: period.reopeningDate, subjects: results.map(({ result, subjectName }) => ({ subject: subjectName, classwork: result.classworkScore, homework: result.homeworkScore, test: result.testScore, exam: result.examScore, total: result.totalScore, grade: result.grade, position: result.position, remark: result.teacherRemark })), attendance: { opened: attendance.length, present: attendance.filter((a) => ['PRESENT','LATE','PARTIAL','SCHOOL_ACTIVITY'].includes(a.status)).length, absent: attendance.filter((a) => a.status === 'ABSENT').length, late: attendance.filter((a) => a.status === 'LATE').length }, outstandingBalance, creditCarryForward, classTeacherComment: results.find(({ result }) => result.classTeacherRemark)?.result.classTeacherRemark || null, generatedAt: new Date().toISOString() };
  const verificationCode = `${user.school?.code || 'SCH'}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  await db.insert(terminalReports).values({ schoolId, learnerId, academicYearId, termId, classId: learnerRow.learner.classId, snapshot, verificationCode, status: 'READY_FOR_APPROVAL' }).onConflictDoUpdate({ target: [terminalReports.learnerId, terminalReports.academicYearId, terminalReports.termId], set: { snapshot, verificationCode, status: 'READY_FOR_APPROVAL', approvedById: null, approvedAt: null, publishedAt: null, updatedAt: new Date() } });
  await audit({ schoolId, userId: user.id, action: 'TERMINAL_REPORT_GENERATED', entityType: 'TerminalReport', entityId: learnerId, newValue: { academicYearId, termId } }); revalidatePath('/reports'); redirect('/reports?success=Terminal+report+generated+for+proprietor+approval');
}

export async function approveTerminalReportAction(formData: FormData) {
  const user = await requireUser(); if (!canApproveAcademics(user.role)) redirect('/reports?error=Only+the+proprietor+can+publish+terminal+reports'); const schoolId = await getActiveSchoolId(user);
  const reportId = String(formData.get('reportId') || ''); const report = (await db.select().from(terminalReports).where(and(eq(terminalReports.id, reportId), eq(terminalReports.schoolId, schoolId))).limit(1))[0]; if (!report || report.status !== 'READY_FOR_APPROVAL') redirect('/reports?error=Report+is+not+ready+for+approval');
  await db.update(terminalReports).set({ status: 'PUBLISHED', approvedById: user.id, approvedAt: new Date(), publishedAt: new Date(), updatedAt: new Date() }).where(eq(terminalReports.id, reportId));
  const linked = await db.select({ guardianUserId: guardians.userId }).from(learnerGuardians).innerJoin(guardians, eq(learnerGuardians.guardianId, guardians.id)).where(eq(learnerGuardians.learnerId, report.learnerId));
  for (const item of linked) if (item.guardianUserId) await db.insert(notifications).values({ schoolId, userId: item.guardianUserId, type: 'RESULT', title: 'Terminal report published', body: 'A new terminal report is available.', link: `/reports/${report.id}` });
  await audit({ schoolId, userId: user.id, action: 'TERMINAL_REPORT_PUBLISHED', entityType: 'TerminalReport', entityId: reportId }); revalidatePath('/reports'); redirect('/reports?success=Terminal+report+approved+and+published');
}

export async function bulkProprietorApproveAction(formData: FormData) {
  const user = await requireUser();
  if (!canApproveAcademics(user.role)) redirect('/approvals?error=Only+the+proprietor+can+give+final+approval');
  const schoolId = await getActiveSchoolId(user);
  const ids = formData.getAll('submissionIds').map(String).filter(Boolean);
  if (!ids.length) redirect('/approvals?error=Select+at+least+one+record');
  const records = await db.select().from(academicSubmissions).where(and(eq(academicSubmissions.schoolId, schoolId), inArray(academicSubmissions.id, ids), eq(academicSubmissions.status, 'UNDER_REVIEW')));
  if (!records.length) redirect('/approvals?error=No+selected+records+are+ready+for+approval');
  await db.transaction(async (tx) => {
    for (const record of records) {
      await tx.update(academicSubmissions).set({ status: 'LOCKED', proprietorId: user.id, approvedAt: new Date(), lockedAt: new Date(), rejectionReason: null, updatedAt: new Date() }).where(eq(academicSubmissions.id, record.id));
      await tx.insert(approvalEvents).values({ schoolId, submissionId: record.id, actorId: user.id, decision: 'APPROVED', oldValue: { status: record.status }, newValue: { status: 'LOCKED' } });
    }
  });
  for (const record of records) await recalculatePositions({ ...record, status: 'LOCKED' });
  await audit({ schoolId, userId: user.id, action: 'ACADEMIC_BULK_APPROVED', entityType: 'AcademicSubmission', newValue: { ids: records.map((r) => r.id), count: records.length } });
  refresh();
  redirect(`/approvals?success=${records.length}+record(s)+approved+and+locked`);
}
