import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ATTENDANCE_CORRECTION_DECISIONS,
  reviewAttendanceCorrection,
} from "@/lib/attendance-correction-review";
import {
  authenticateMobileRequest,
  mobileError,
  mobileJson,
  resolveMobileSchoolId,
} from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(
    ATTENDANCE_CORRECTION_DECISIONS,
  ),
  decisionReason:
    z.string().trim().max(1000).nullable().optional(),
});

function statusForFailure(code: string) {
  if (
    code === "SUPER_ADMIN_REQUIRED" ||
    code === "SELF_REVIEW_NOT_ALLOWED"
  ) {
    return 403;
  }

  if (
    code === "ATTENDANCE_NOT_FOUND" ||
    code === "REGISTER_NOT_LOCKED" ||
    code === "LEARNER_NOT_FOUND"
  ) {
    return 404;
  }

  if (
    code === "CORRECTION_NOT_PENDING" ||
    code === "CORRECTION_PERIOD_CLOSED" ||
    code === "STALE_CORRECTION" ||
    code === "REVIEW_CONFLICT"
  ) {
    return 409;
  }

  return 400;
}

export async function POST(
  request: NextRequest,
) {
  const auth =
    await authenticateMobileRequest(request);

  if ("response" in auth) {
    return auth.response;
  }

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
      "INVALID_CORRECTION_REVIEW",
      "Enter a valid correction decision.",
    );
  }

  const result =
    await reviewAttendanceCorrection({
      schoolId,
      userId: auth.context.user.id,
      role: auth.context.user.role,
      requestId: parsed.data.requestId,
      decision: parsed.data.decision,
      decisionReason:
        parsed.data.decisionReason ?? null,
      source: "MOBILE",
    });

  if (result.ok === false) {
    return mobileError(
      statusForFailure(result.code),
      result.code,
      result.message,
    );
  }

  return mobileJson({
    data: {
      correction: {
        id: result.requestId,
        attendanceRecordId:
          result.attendanceRecordId,
        registerId: result.registerId,
        classId: result.classId,
        date:
          result.date
            .toISOString()
            .slice(0, 10),
        originalStatus:
          result.originalStatus,
        requestedStatus:
          result.requestedStatus,
        status: result.status,
        reviewedById:
          result.reviewedById,
        decisionReason:
          result.decisionReason,
      },
    },
  });
}
