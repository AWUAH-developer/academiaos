import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ATTENDANCE_CORRECTION_STATUSES,
  requestAttendanceCorrection,
} from "@/lib/attendance-correction";
import {
  authenticateMobileRequest,
  mobileError,
  mobileJson,
  resolveMobileSchoolId,
} from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  attendanceRecordId: z.string().uuid(),
  requestedStatus: z.enum(ATTENDANCE_CORRECTION_STATUSES),
  requestedAttendanceReason: z.string().trim().max(500).nullable().optional(),
  correctionReason: z.string().trim().min(10).max(1000),
});

function statusForFailure(code: string) {
  if (code === "PERMISSION_DENIED") return 403;

  if (
    code === "ATTENDANCE_NOT_SUBMITTED" ||
    code === "REGISTER_NOT_LOCKED"
  ) {
    return 404;
  }

  if (
    code === "STATUS_UNCHANGED" ||
    code === "CORRECTION_ALREADY_PENDING" ||
    code === "CORRECTION_PERIOD_CLOSED"
  ) {
    return 409;
  }

  return 400;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ("response" in auth) return auth.response;

  const schoolId = await resolveMobileSchoolId(
    auth.context,
    request,
  );

  if (!schoolId) {
    return mobileError(
      400,
      "SCHOOL_REQUIRED",
      "This account must select an active school.",
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return mobileError(
      400,
      "INVALID_JSON",
      "Send a valid JSON request body.",
    );
  }

  const parsed = schema.safeParse(body);

  if (parsed.success === false) {
    return mobileError(
      400,
      "INVALID_CORRECTION",
      "Enter a valid attendance correction and detailed reason.",
    );
  }

  const result = await requestAttendanceCorrection({
    schoolId,
    userId: auth.context.user.id,
    role: auth.context.user.role,
    attendanceRecordId: parsed.data.attendanceRecordId,
    requestedStatus: parsed.data.requestedStatus,
    requestedAttendanceReason:
      parsed.data.requestedAttendanceReason ?? null,
    correctionReason: parsed.data.correctionReason,
    source: "MOBILE",
  });

  if (result.ok === false) {
    return mobileError(
      statusForFailure(result.code),
      result.code,
      result.message,
    );
  }

  return mobileJson(
    {
      data: {
        correction: {
          id: result.requestId,
          attendanceRecordId: result.attendanceRecordId,
          registerId: result.registerId,
          classId: result.classId,
          date: result.date.toISOString().slice(0, 10),
          originalStatus: result.originalStatus,
          requestedStatus: result.requestedStatus,
          reviewRole: result.reviewRole,
          status: "PENDING",
        },
      },
    },
    201,
  );
}
