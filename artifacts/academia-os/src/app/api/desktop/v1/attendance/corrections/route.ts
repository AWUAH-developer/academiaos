import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  attendanceCorrectionRequests,
  attendanceRecords,
  attendanceRegisters,
  learners,
  users,
} from "@/db/schema";
import {
  ATTENDANCE_CORRECTION_DECISIONS,
  reviewAttendanceCorrection,
} from "@/lib/attendance-correction-review";
import {
  authenticateDesktopRequest,
  desktopError,
  desktopJson,
  resolveDesktopSchoolId,
} from "@/lib/desktop-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(ATTENDANCE_CORRECTION_DECISIONS),
  decisionReason: z.string().trim().max(1000).nullable().optional(),
});

function failureStatus(code: string) {
  if (
    code === "SUPER_ADMIN_REQUIRED" ||
    code === "SELF_REVIEW_NOT_ALLOWED"
  ) return 403;

  if (
    code === "ATTENDANCE_NOT_FOUND" ||
    code === "REGISTER_NOT_LOCKED" ||
    code === "LEARNER_NOT_FOUND"
  ) return 404;

  if (
    code === "CORRECTION_NOT_PENDING" ||
    code === "CORRECTION_PERIOD_CLOSED" ||
    code === "STALE_CORRECTION" ||
    code === "REVIEW_CONFLICT"
  ) return 409;

  return 400;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request);
  if ("response" in auth) return auth.response;

  const schoolId = await resolveDesktopSchoolId(auth.context, request);
  if (!schoolId) {
    return desktopError(
      400,
      "SCHOOL_REQUIRED",
      "Select an active school.",
    );
  }

  if (
    auth.context.user.role !== "PROPRIETOR" &&
    auth.context.user.role !== "SUPER_ADMIN"
  ) {
    return desktopError(
      403,
      "PERMISSION_DENIED",
      "Only the Proprietor or SUPER_ADMIN may review attendance corrections.",
    );
  }

  const classId = request.nextUrl.searchParams.get("classId");
  const date = request.nextUrl.searchParams.get("date");

  const rows = await db
    .select({
      requestId: attendanceCorrectionRequests.id,
      attendanceRecordId: attendanceRecords.id,
      classId: attendanceRegisters.classId,
      date: attendanceRecords.date,
      learnerId: learners.id,
      learnerFirstName: learners.firstName,
      learnerLastName: learners.lastName,
      originalStatus: attendanceCorrectionRequests.originalStatus,
      requestedStatus: attendanceCorrectionRequests.requestedStatus,
      requestedAttendanceReason:
        attendanceCorrectionRequests.requestedAttendanceReason,
      correctionReason: attendanceCorrectionRequests.reason,
      requestedById: attendanceCorrectionRequests.requestedById,
      requesterName: users.name,
      requesterRole: users.role,
      markedByRole: attendanceRegisters.markedByRole,
      createdAt: attendanceCorrectionRequests.createdAt,
    })
    .from(attendanceCorrectionRequests)
    .innerJoin(
      attendanceRecords,
      eq(
        attendanceCorrectionRequests.attendanceRecordId,
        attendanceRecords.id,
      ),
    )
    .innerJoin(
      attendanceRegisters,
      eq(attendanceRecords.registerId, attendanceRegisters.id),
    )
    .innerJoin(
      learners,
      eq(attendanceRecords.learnerId, learners.id),
    )
    .innerJoin(
      users,
      eq(attendanceCorrectionRequests.requestedById, users.id),
    )
    .where(
      and(
        eq(attendanceCorrectionRequests.schoolId, schoolId),
        eq(attendanceRecords.schoolId, schoolId),
        eq(attendanceRegisters.schoolId, schoolId),
        eq(learners.schoolId, schoolId),
        eq(attendanceCorrectionRequests.status, "PENDING"),
      ),
    );

  const corrections = rows
    .filter((row) => {
      if (classId && row.classId !== classId) return false;

      const rowDate = row.date.toISOString().slice(0, 10);
      if (date && rowDate !== date) return false;

      const requiresSuperAdmin =
        row.markedByRole === "PROPRIETOR" ||
        row.markedByRole === "SUPER_ADMIN" ||
        row.requesterRole === "PROPRIETOR";

      if (auth.context.user.role === "SUPER_ADMIN") return true;

      return (
        requiresSuperAdmin === false &&
        row.requestedById !== auth.context.user.id
      );
    })
    .map((row) => ({
      id: row.requestId,
      attendanceRecordId: row.attendanceRecordId,
      classId: row.classId,
      date: row.date.toISOString().slice(0, 10),
      learnerId: row.learnerId,
      learnerName:
        row.learnerFirstName + " " + row.learnerLastName,
      originalStatus: row.originalStatus,
      requestedStatus: row.requestedStatus,
      requestedAttendanceReason:
        row.requestedAttendanceReason,
      correctionReason: row.correctionReason,
      requestedById: row.requestedById,
      requesterName: row.requesterName,
      requesterRole: row.requesterRole,
      createdAt: row.createdAt,
    }));

  return desktopJson({
    data: { corrections },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request);
  if ("response" in auth) return auth.response;

  const schoolId = await resolveDesktopSchoolId(auth.context, request);
  if (!schoolId) {
    return desktopError(
      400,
      "SCHOOL_REQUIRED",
      "Select an active school.",
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return desktopError(
      400,
      "INVALID_JSON",
      "Send a valid JSON request body.",
    );
  }

  const parsed = reviewSchema.safeParse(body);

  if (parsed.success === false) {
    return desktopError(
      400,
      "INVALID_CORRECTION_REVIEW",
      "Enter a valid correction decision.",
    );
  }

  const result = await reviewAttendanceCorrection({
    schoolId,
    userId: auth.context.user.id,
    role: auth.context.user.role,
    requestId: parsed.data.requestId,
    decision: parsed.data.decision,
    decisionReason: parsed.data.decisionReason ?? null,
    source: "DESKTOP",
  });

  if (result.ok === false) {
    return desktopError(
      failureStatus(result.code),
      result.code,
      result.message,
    );
  }

  return desktopJson({
    data: {
      correction: {
        id: result.requestId,
        attendanceRecordId: result.attendanceRecordId,
        registerId: result.registerId,
        classId: result.classId,
        date: result.date.toISOString().slice(0, 10),
        originalStatus: result.originalStatus,
        requestedStatus: result.requestedStatus,
        status: result.status,
        decisionReason: result.decisionReason,
      },
    },
  });
}
