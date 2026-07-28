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
import {
  attendanceCorrectionDeadline,
  reconcileAttendanceCorrectionFees,
} from "@/lib/attendance-correction-policy";
import { notifyLearnerGuardians } from "@/lib/notifications";
import type { UserRole } from "@/lib/types";

export const ATTENDANCE_CORRECTION_DECISIONS = [
  "APPROVE",
  "REJECT",
] as const;

export type AttendanceCorrectionDecision =
  (typeof ATTENDANCE_CORRECTION_DECISIONS)[number];

type ReviewSource = "WEB" | "MOBILE" | "DESKTOP";

type ReviewInput = {
  schoolId: string;
  userId: string;
  role: UserRole;
  requestId: string;
  decision: string;
  decisionReason?: string | null;
  source: ReviewSource;
};

type ReviewFailure = {
  ok: false;
  code: string;
  message: string;
};

function fail(code: string, message: string): ReviewFailure {
  return { ok: false, code, message };
}

export async function reviewAttendanceCorrection(
  input: ReviewInput,
) {
  const decision = input.decision.trim().toUpperCase();
  const decisionReason = input.decisionReason?.trim() ?? "";

  if (
    decision !== "APPROVE" &&
    decision !== "REJECT"
  ) {
    return fail(
      "INVALID_DECISION",
      "Select APPROVE or REJECT for the attendance correction.",
    );
  }

  if (
    decision === "REJECT" &&
    decisionReason.length < 5
  ) {
    return fail(
      "REJECTION_REASON_REQUIRED",
      "Enter a reason of at least 5 characters for rejecting the correction.",
    );
  }

  const request = (
    await db
      .select()
      .from(attendanceCorrectionRequests)
      .where(
        and(
          eq(attendanceCorrectionRequests.id, input.requestId),
          eq(attendanceCorrectionRequests.schoolId, input.schoolId),
        ),
      )
      .limit(1)
  )[0];

  if (!request || request.status !== "PENDING") {
    return fail(
      "CORRECTION_NOT_PENDING",
      "Attendance correction request is not pending.",
    );
  }

  const record = (
    await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.id, request.attendanceRecordId),
          eq(attendanceRecords.schoolId, input.schoolId),
        ),
      )
      .limit(1)
  )[0];

  if (!record || !record.registerId) {
    return fail(
      "ATTENDANCE_NOT_FOUND",
      "Attendance record was not found.",
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
    return fail(
      "REGISTER_NOT_LOCKED",
      "The locked attendance register was not found.",
    );
  }

  const requester = (
    await db
      .select({
        id: users.id,
        role: users.role,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, request.requestedById))
      .limit(1)
  )[0];

  const requiresSuperAdmin =
    register.markedByRole === "PROPRIETOR" ||
    register.markedByRole === "SUPER_ADMIN" ||
    requester?.role === "PROPRIETOR";

  if (input.role !== "SUPER_ADMIN") {
    if (
      input.role !== "PROPRIETOR" ||
      requiresSuperAdmin
    ) {
      return fail(
        "SUPER_ADMIN_REQUIRED",
        "SUPER_ADMIN approval is required for this attendance correction.",
      );
    }

    if (input.userId === request.requestedById) {
      return fail(
        "SELF_REVIEW_NOT_ALLOWED",
        "You cannot review your own attendance correction request.",
      );
    }

    const deadline = await attendanceCorrectionDeadline({
      schoolId: input.schoolId,
      academicYearId: register.academicYearId,
      termId: register.termId,
    });

    if (deadline && new Date() > deadline) {
      return fail(
        "CORRECTION_PERIOD_CLOSED",
        "The normal correction period has closed. SUPER_ADMIN approval is required.",
      );
    }
  }

  if (record.status !== request.originalStatus) {
    return fail(
      "STALE_CORRECTION",
      "Official attendance has changed since this request was created.",
    );
  }

  const learner = (
    await db
      .select()
      .from(learners)
      .where(
        and(
          eq(learners.id, record.learnerId),
          eq(learners.schoolId, input.schoolId),
        ),
      )
      .limit(1)
  )[0];

  if (!learner) {
    return fail(
      "LEARNER_NOT_FOUND",
      "Learner was not found.",
    );
  }

  const now = new Date();

  if (decision === "REJECT") {
    const claimed = await db
      .update(attendanceCorrectionRequests)
      .set({
        status: "REJECTED",
        reviewedById: input.userId,
        decisionReason,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(attendanceCorrectionRequests.id, request.id),
          eq(attendanceCorrectionRequests.schoolId, input.schoolId),
          eq(attendanceCorrectionRequests.status, "PENDING"),
        ),
      )
      .returning({
        id: attendanceCorrectionRequests.id,
      });

    if (!claimed[0]) {
      return fail(
        "REVIEW_CONFLICT",
        "This correction request has already been reviewed.",
      );
    }

    try {
      await db.insert(notifications).values({
        schoolId: input.schoolId,
        userId: request.requestedById,
        type: "ATTENDANCE_CORRECTION",
        title: "Attendance correction rejected",
        body:
          decisionReason ||
          "The attendance correction request was rejected.",
        link:
          "/attendance?date=" +
          record.date.toISOString().slice(0, 10) +
          "&classId=" +
          register.classId,
      });
    } catch (error) {
      console.error(
        "Attendance correction rejection notification failed:",
        error,
      );
    }

    try {
      await audit({
        schoolId: input.schoolId,
        userId: input.userId,
        action: "ATTENDANCE_CORRECTION_REJECTED",
        entityType: "AttendanceCorrectionRequest",
        entityId: request.id,
        oldValue: {
          status: request.originalStatus,
        },
        newValue: {
          requestedStatus: request.requestedStatus,
          decisionReason,
          source: input.source,
        },
      });
    } catch (error) {
      console.error(
        "Attendance correction rejection audit failed:",
        error,
      );
    }

    return {
      ok: true as const,
      requestId: request.id,
      attendanceRecordId: record.id,
      registerId: register.id,
      classId: register.classId,
      date: record.date,
      originalStatus: request.originalStatus,
      requestedStatus: request.requestedStatus,
      status: "REJECTED" as const,
      reviewedById: input.userId,
      decisionReason,
    };
  }

  try {
    await db.transaction(async (tx) => {
      const claimed = await tx
        .update(attendanceCorrectionRequests)
        .set({
          status: "APPROVED",
          reviewedById: input.userId,
          decisionReason: decisionReason || null,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(attendanceCorrectionRequests.id, request.id),
            eq(attendanceCorrectionRequests.schoolId, input.schoolId),
            eq(attendanceCorrectionRequests.status, "PENDING"),
          ),
        )
        .returning({
          id: attendanceCorrectionRequests.id,
        });

      if (!claimed[0]) {
        throw new Error(
          "ATTENDANCE_CORRECTION_REVIEW_CONFLICT",
        );
      }

      const currentRecord = (
        await tx
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.id, record.id),
              eq(attendanceRecords.schoolId, input.schoolId),
            ),
          )
          .limit(1)
      )[0];

      if (
        !currentRecord ||
        currentRecord.status !== request.originalStatus
      ) {
        throw new Error(
          "ATTENDANCE_CORRECTION_STALE",
        );
      }

      await reconcileAttendanceCorrectionFees(tx, {
        schoolId: input.schoolId,
        learner,
        date: record.date,
        newStatus: request.requestedStatus,
        requestId: request.id,
        actorId: input.userId,
        reason: request.reason,
      });

      await tx
        .update(attendanceRecords)
        .set({
          status: request.requestedStatus,
          reason: request.requestedAttendanceReason,
          updatedAt: now,
        })
        .where(
          and(
            eq(attendanceRecords.id, record.id),
            eq(attendanceRecords.schoolId, input.schoolId),
          ),
        );
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "ATTENDANCE_CORRECTION_REVIEW_CONFLICT"
    ) {
      return fail(
        "REVIEW_CONFLICT",
        "This correction request has already been reviewed.",
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "ATTENDANCE_CORRECTION_STALE"
    ) {
      return fail(
        "STALE_CORRECTION",
        "Official attendance has changed since this request was created.",
      );
    }

    throw error;
  }

  try {
    await notifyLearnerGuardians({
      schoolId: input.schoolId,
      learnerId: learner.id,
      type: "ATTENDANCE",
      title:
        learner.firstName +
        " " +
        learner.lastName +
        ": attendance corrected",
      body:
        "Attendance for " +
        record.date.toLocaleDateString("en-GH") +
        " was corrected from " +
        request.originalStatus
          .replaceAll("_", " ")
          .toLowerCase() +
        " to " +
        request.requestedStatus
          .replaceAll("_", " ")
          .toLowerCase() +
        ".",
      link: "/attendance",
    });
  } catch (error) {
    console.error(
      "Guardian correction notification failed:",
      error,
    );
  }

  try {
    await db.insert(notifications).values({
      schoolId: input.schoolId,
      userId: request.requestedById,
      type: "ATTENDANCE_CORRECTION",
      title: "Attendance correction approved",
      body:
        request.originalStatus.replaceAll("_", " ") +
        " → " +
        request.requestedStatus.replaceAll("_", " ") +
        " approved.",
      link:
        "/attendance?date=" +
        record.date.toISOString().slice(0, 10) +
        "&classId=" +
        register.classId,
    });
  } catch (error) {
    console.error(
      "Attendance correction approval notification failed:",
      error,
    );
  }

  try {
    await audit({
      schoolId: input.schoolId,
      userId: input.userId,
      action: "ATTENDANCE_CORRECTION_APPROVED",
      entityType: "AttendanceCorrectionRequest",
      entityId: request.id,
      oldValue: {
        attendanceRecordId: record.id,
        status: request.originalStatus,
        attendanceReason:
          request.originalAttendanceReason,
      },
      newValue: {
        status: request.requestedStatus,
        attendanceReason:
          request.requestedAttendanceReason,
        requestedById: request.requestedById,
        reviewedById: input.userId,
        decisionReason: decisionReason || null,
        source: input.source,
      },
    });
  } catch (error) {
    console.error(
      "Attendance correction approval audit failed:",
      error,
    );
  }

  return {
    ok: true as const,
    requestId: request.id,
    attendanceRecordId: record.id,
    registerId: register.id,
    classId: register.classId,
    date: record.date,
    originalStatus: request.originalStatus,
    requestedStatus: request.requestedStatus,
    status: "APPROVED" as const,
    reviewedById: input.userId,
    decisionReason: decisionReason || null,
  };
}
