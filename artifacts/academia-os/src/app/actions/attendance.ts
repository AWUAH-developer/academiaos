'use server';
import { and, asc, desc, eq, gt, gte, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { academicYears, attendanceCorrectionRequests, attendanceRecords, attendanceRegisters, attendanceScans, classes, feeCategories, feeCharges, feeStructures, financialAdjustments, learners, notifications, terms, users } from '@/db/schema';
import { audit, requireUser } from '@/lib/auth';
import { canRecordAttendance } from '@/lib/permissions';
import { canMarkClassAttendance } from '@/lib/attendance-access';
import { saveAttendanceDraft } from '@/lib/attendance-draft';
import { submitAttendanceRegister } from '@/lib/attendance-submit';
import { getActiveSchoolId } from '@/lib/tenant';
import { notifyLearnerGuardians } from '@/lib/notifications';
import { requestAttendanceCorrection } from "@/lib/attendance-correction";
import { reviewAttendanceCorrection } from "@/lib/attendance-correction-review";

function schoolDate(value: string) { const d = new Date(`${value}T00:00:00.000Z`); return Number.isNaN(d.getTime()) ? null : d; }

export async function recordAttendanceAction(formData: FormData) {
  const user = await requireUser();
  const schoolId = await getActiveSchoolId(user);

  const learnerId = String(formData.get('learnerId') || '');
  const status = String(formData.get('status') || 'PRESENT');
  const date = schoolDate(String(formData.get('date') || '') );

  if (!date) {
    redirect('/attendance?error=Enter+valid+attendance+details');
  }

  const result = await saveAttendanceDraft({
    schoolId,
    userId: user.id,
    role: user.role,
    learnerId,
    date,
    status,
    reason: String(formData.get('reason') || '') || null,
  });

  if (!result.ok) {
    redirect(
      '/attendance?date=' +
        date.toISOString().slice(0, 10) +
        '&error=' +
        encodeURIComponent(result.message),
    );
  }

  await audit({
    schoolId,
    userId: user.id,
    action: 'ATTENDANCE_DRAFT_SAVED',
    entityType: 'AttendanceRecord',
    entityId: result.record.id,
    newValue: {
      learnerId,
      date: date.toISOString(),
      status,
      classId: result.classId,
      registerId: result.registerId,
    },
  });

  revalidatePath('/attendance');
  revalidatePath('/dashboard');

  redirect(
    '/attendance?date=' +
      date.toISOString().slice(0, 10) +
      '&success=Attendance+draft+saved',
  );
}

export async function reviewAttendanceCorrectionAction(
  formData: FormData,
) {
  const actor = await requireUser();
  const schoolId = await getActiveSchoolId(actor);

  const result = await reviewAttendanceCorrection({
    schoolId,
    userId: actor.id,
    role: actor.role,
    requestId: String(formData.get("requestId") || ""),
    decision: String(formData.get("decision") || ""),
    decisionReason:
      String(formData.get("decisionReason") || "").trim() ||
      null,
    source: "WEB",
  });

  if (result.ok === false) {
    redirect(
      "/attendance?error=" +
        encodeURIComponent(result.message),
    );
  }

  revalidatePath("/attendance");
  revalidatePath("/fees");
  revalidatePath("/dashboard");

  const success =
    result.status === "APPROVED"
      ? "Attendance+correction+approved"
      : "Attendance+correction+rejected";

  redirect(
    "/attendance?date=" +
      result.date.toISOString().slice(0, 10) +
      "&classId=" +
      encodeURIComponent(result.classId) +
      "&success=" +
      success,
  );
}

export async function requestAttendanceCorrectionAction(formData: FormData) {
  const user = await requireUser();
  const schoolId = await getActiveSchoolId(user);

  const result = await requestAttendanceCorrection({
    schoolId,
    userId: user.id,
    role: user.role,
    attendanceRecordId: String(
      formData.get("attendanceRecordId") || "",
    ),
    requestedStatus: String(
      formData.get("requestedStatus") || "",
    ),
    requestedAttendanceReason:
      String(
        formData.get("requestedAttendanceReason") || "",
      ).trim() || null,
    correctionReason: String(
      formData.get("correctionReason") || "",
    ).trim(),
    source: "WEB",
  });

  if (result.ok === false) {
    redirect(
      "/attendance?error=" +
        encodeURIComponent(result.message),
    );
  }

  revalidatePath("/attendance");

  redirect(
    "/attendance?date=" +
      result.date.toISOString().slice(0, 10) +
      "&classId=" +
      result.classId +
      "&success=Attendance+correction+request+submitted",
  );
}

export async function submitAttendanceRegisterAction(formData: FormData) {
  const user = await requireUser();
  const schoolId = await getActiveSchoolId(user);

  const classId = String(formData.get("classId") || "");
  const date = schoolDate(String(formData.get("date") || ""));
  const substitutionReason =
    String(formData.get("substitutionReason") || "").trim() || null;

  if (classId === "" || date === null) {
    redirect("/attendance?error=Select+a+valid+class+and+attendance+date");
  }

  const result = await submitAttendanceRegister({
    schoolId,
    userId: user.id,
    role: user.role,
    classId,
    date,
    substitutionReason,
  });

  if (result.ok === false) {
    redirect(
      "/attendance?date=" +
        date.toISOString().slice(0, 10) +
        "&classId=" +
        encodeURIComponent(classId) +
        "&error=" +
        encodeURIComponent(result.message),
    );
  }

  for (const learner of result.learners) {
    const statusLabel = learner.status.replaceAll("_", " ");

    await notifyLearnerGuardians({
      schoolId,
      learnerId: learner.learnerId,
      type: "ATTENDANCE",
      title: learner.firstName + " " + learner.lastName + ": " + statusLabel,
      body:
        "Attendance for " +
        result.date.toLocaleDateString("en-GH") +
        " was submitted as " +
        statusLabel.toLowerCase() +
        ".",
      link: "/attendance",
    });
  }

  await audit({
    schoolId,
    userId: user.id,
    action: "ATTENDANCE_REGISTER_SUBMITTED",
    entityType: "AttendanceRegister",
    entityId: result.registerId,
    newValue: {
      classId: result.classId,
      className: result.className,
      academicYearId: result.academicYearId,
      termId: result.termId,
      termName: result.termName,
      date: result.date.toISOString(),
      markedById: result.markedById,
      markedByRole: result.markedByRole,
      officialClassTeacherId: result.officialClassTeacherId,
      substitutionReason: result.substitutionReason,
      learnerCount: result.learners.length,
      status: "LOCKED",
    },
  });

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/fees");

  redirect(
    "/attendance?date=" +
      result.date.toISOString().slice(0, 10) +
      "&classId=" +
      encodeURIComponent(result.classId) +
      "&success=Class+attendance+submitted+and+locked",
  );
}

export async function scanBadgeAction(formData: FormData) {
  const user = await requireUser(); if (!canRecordAttendance(user.role)) redirect('/attendance?error=Permission+denied'); const schoolId = await getActiveSchoolId(user);
  const badgeCode = String(formData.get('badgeCode') || '').trim(); const action = String(formData.get('action') || 'SCHOOL_ENTRY'); if (!['SCHOOL_ENTRY','SCHOOL_EXIT','CANTEEN_ACCESS','LIBRARY_ACCESS'].includes(action)) redirect('/attendance?error=Invalid+scan+action'); if (!badgeCode) redirect('/attendance?error=Scan+or+enter+a+badge+code');
  const learner = (await db.select().from(learners).where(and(eq(learners.schoolId, schoolId), eq(learners.badgeCode, badgeCode))).limit(1))[0]; if (!learner) redirect('/attendance?error=Badge+not+recognised');
  const cutoff = new Date(Date.now() - 3 * 60000); const recent = (await db.select().from(attendanceScans).where(and(eq(attendanceScans.badgeCode, badgeCode), eq(attendanceScans.action, action), gte(attendanceScans.scannedAt, cutoff))).orderBy(desc(attendanceScans.scannedAt)).limit(1))[0];
  if (recent) { await db.insert(attendanceScans).values({ schoolId, learnerId: learner.id, recordedById: user.id, badgeCode, action, location: String(formData.get('location') || '').trim() || null, device: String(formData.get('device') || '').trim() || null, wasDuplicate: true }); redirect('/attendance?error=Duplicate+scan+blocked+within+3+minutes'); }
  await db.insert(attendanceScans).values({
    schoolId,
    learnerId: learner.id,
    recordedById: user.id,
    badgeCode,
    action,
    location: String(formData.get('location') || '').trim() || null,
    device: String(formData.get('device') || '').trim() || null,
  });
  if (['SCHOOL_ENTRY','SCHOOL_EXIT'].includes(action)) await notifyLearnerGuardians({ schoolId, learnerId: learner.id, type: 'ATTENDANCE', title: `${learner.firstName} ${learner.lastName} ${action === 'SCHOOL_ENTRY' ? 'arrived at school' : 'left school'}`, body: `${learner.firstName} ${learner.lastName} ${action === 'SCHOOL_ENTRY' ? 'checked in' : 'checked out'} at ${new Date().toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}.`, link: '/attendance' });
  await audit({ schoolId, userId: user.id, action: `BADGE_${action}`, entityType: 'Learner', entityId: learner.id, newValue: { badgeCode } });
  revalidatePath('/attendance'); revalidatePath('/dashboard'); redirect(`/attendance?success=${encodeURIComponent(`${learner.firstName} ${learner.lastName} scan recorded`)}`);
}
