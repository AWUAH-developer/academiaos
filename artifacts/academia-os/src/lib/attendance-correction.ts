import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceCorrectionRequests,
  attendanceRecords,
  attendanceRegisters,
  learners,
  notifications,
  users,
} from "@/db/schema";
import { audit } from "@/lib/auth";
import { canMarkClassAttendance } from "@/lib/attendance-access";
import { attendanceCorrectionDeadline } from "@/lib/attendance-correction-policy";
import type { UserRole } from "@/lib/types";

export const ATTENDANCE_CORRECTION_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
  "SICK",
  "PARTIAL",
  "HALF_DAY_MORNING",
  "HALF_DAY_AFTERNOON",
  "SCHOOL_ACTIVITY",
  "SUSPENDED",
  "HOLIDAY",
] as const;

export type AttendanceCorrectionStatus =
  (typeof ATTENDANCE_CORRECTION_STATUSES)[number];

export type AttendanceCorrectionSource = "WEB" | "MOBILE" | "DESKTOP";

type RequestAttendanceCorrectionInput = {
  schoolId: string;
  userId: string;
  role: UserRole;
  attendanceRecordId: string;
  requestedStatus: string;
  requestedAttendanceReason?: string | null;
  correctionReason: string;
  source: AttendanceCorrectionSource;
};

type CorrectionFailure = {
  ok: false;
  code: string;
  message: string;
};

function failure(code: string, message: string): CorrectionFailure {
  return { ok: false, code, message };
}

export async function requestAttendanceCorrection(
  input: RequestAttendanceCorrectionInput,
) {
  const attendanceRecordId = input.attendanceRecordId.trim();
  const requestedStatus = input.requestedStatus.trim();
  const requestedAttendanceReason =
    input.requestedAttendanceReason?.trim() || null;
  const correctionReason = input.correctionReason.trim();

  if (
    attendanceRecordId.length === 0 ||
    ATTENDANCE_CORRECTION_STATUSES.includes(
      requestedStatus as AttendanceCorrectionStatus,
    ) === false
  ) {
    return failure(
      "INVALID_CORRECTION",
      "Enter a valid attendance correction.",
    );
  }

  if (correctionReason.length < 10) {
    return failure(
      "CORRECTION_REASON_REQUIRED",
      "Explain the attendance mistake before requesting a correction.",
    );
  }

  const normalizedStatus =
    requestedStatus as AttendanceCorrectionStatus;

  const record = (
    await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.id, attendanceRecordId),
          eq(attendanceRecords.schoolId, input.schoolId),
        ),
      )
      .limit(1)
  )[0];

  if (!record || !record.registerId) {
    return failure(
      "ATTENDANCE_NOT_SUBMITTED",
      "Only submitted attendance can use the correction workflow.",
    );
  }

  const register = (
    await db
      .select()
      .from(attendanceRegisters)
      .where(
        and(
          eq(attendanceRegisters.id, record.registerId),
          eq(attendanceRegisters.schoolId, input.schoolId),
        ),
      )
      .limit(1)
  )[0];

  if (!register || register.status !== "LOCKED") {
    return failure(
      "REGISTER_NOT_LOCKED",
      "Attendance must be submitted and locked before requesting a correction.",
    );
  }

  const mayRequest = await canMarkClassAttendance({
    role: input.role,
    userId: input.userId,
    schoolId: input.schoolId,
    classId: register.classId,
  });

  if (!mayRequest) {
    return failure(
      "PERMISSION_DENIED",
      "You are not authorised to request a correction for this class.",
    );
  }

  if (record.status === normalizedStatus) {
    return failure(
      "STATUS_UNCHANGED",
      "Requested status is already the official attendance status.",
    );
  }

  const existingPending = (
    await db
      .select({ id: attendanceCorrectionRequests.id })
      .from(attendanceCorrectionRequests)
      .where(
        and(
          eq(
            attendanceCorrectionRequests.attendanceRecordId,
            record.id,
          ),
          eq(attendanceCorrectionRequests.status, "PENDING"),
        ),
      )
      .limit(1)
  )[0];

  if (existingPending) {
    return failure(
      "CORRECTION_ALREADY_PENDING",
      "A correction request is already waiting for review.",
    );
  }

  if (input.role !== "SUPER_ADMIN") {
    const deadline = await attendanceCorrectionDeadline({
      schoolId: input.schoolId,
      academicYearId: register.academicYearId,
      termId: register.termId,
    });

    if (deadline && new Date() > deadline) {
      return failure(
        "CORRECTION_PERIOD_CLOSED",
        "The normal attendance correction period has closed. SUPER_ADMIN intervention is required.",
      );
    }
  }

  const learner = (
    await db
      .select({
        firstName: learners.firstName,
        lastName: learners.lastName,
      })
      .from(learners)
      .where(
        and(
          eq(learners.id, record.learnerId),
          eq(learners.schoolId, input.schoolId),
        ),
      )
      .limit(1)
  )[0];

  const request = (
    await db
      .insert(attendanceCorrectionRequests)
      .values({
        schoolId: input.schoolId,
        attendanceRecordId: record.id,
        registerId: register.id,
        requestedById: input.userId,
        originalStatus: record.status,
        requestedStatus: normalizedStatus,
        originalAttendanceReason: record.reason,
        requestedAttendanceReason,
        reason: correctionReason,
        status: "PENDING",
      })
      .returning({ id: attendanceCorrectionRequests.id })
  )[0];

  if (!request) {
    return failure(
      "CORRECTION_CREATE_FAILED",
      "Attendance correction request could not be created.",
    );
  }

  const reviewRole: "SUPER_ADMIN" | "PROPRIETOR" =
    register.markedByRole === "PROPRIETOR" ||
    register.markedByRole === "SUPER_ADMIN" ||
    input.role === "PROPRIETOR"
      ? "SUPER_ADMIN"
      : "PROPRIETOR";

  const reviewers =
    reviewRole === "SUPER_ADMIN"
      ? await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.role, "SUPER_ADMIN"),
              eq(users.status, "ACTIVE"),
            ),
          )
      : await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.schoolId, input.schoolId),
              eq(users.role, "PROPRIETOR"),
              eq(users.status, "ACTIVE"),
            ),
          );

  const dateText = record.date.toISOString().slice(0, 10);
  const link =
    "/attendance?date=" + dateText + "&classId=" + register.classId;

  for (const reviewer of reviewers) {
    await db
      .insert(notifications)
      .values({
        schoolId: input.schoolId,
        userId: reviewer.id,
        type: "ATTENDANCE_CORRECTION",
        title: "Attendance correction requires review",
        body:
          (learner
            ? learner.firstName + " " + learner.lastName + ": "
            : "") +
          record.status.replaceAll("_", " ") +
          " → " +
          normalizedStatus.replaceAll("_", " ") +
          ". Reason: " +
          correctionReason,
        link,
      })
      .catch((error: unknown) => {
        console.error(
          "Attendance correction reviewer notification failed:",
          error,
        );
      });
  }

  await audit({
    schoolId: input.schoolId,
    userId: input.userId,
    action: "ATTENDANCE_CORRECTION_REQUESTED",
    entityType: "AttendanceCorrectionRequest",
    entityId: request.id,
    oldValue: {
      attendanceRecordId: record.id,
      status: record.status,
      reason: record.reason,
    },
    newValue: {
      requestedStatus: normalizedStatus,
      requestedAttendanceReason,
      correctionReason,
      reviewRole,
      source: input.source,
    },
  }).catch((error: unknown) => {
    console.error("Attendance correction audit write failed:", error);
  });

  return {
    ok: true as const,
    requestId: request.id,
    attendanceRecordId: record.id,
    registerId: register.id,
    classId: register.classId,
    date: record.date,
    originalStatus: record.status,
    requestedStatus: normalizedStatus,
    reviewRole,
  };
}
