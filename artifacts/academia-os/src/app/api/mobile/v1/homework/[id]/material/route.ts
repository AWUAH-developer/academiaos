import { and, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { homework, learners } from "@/db/schema";
import {
  accessibleLearnerIds,
  authenticateMobileRequest,
  mobileError,
  resolveMobileSchoolId
} from "@/lib/mobile-api";
import { inTeachingScope, teachingScope } from "@/lib/access";
import { audit } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOMEWORK_ROLES = new Set<UserRole>([
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "PROPRIETOR",
  "HEADTEACHER",
  "ACADEMIC_ADMIN",
  "TEACHER",
  "PARENT",
  "LEARNER"
]);

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMobileRequest(request);
  if ("response" in auth) return auth.response;

  if (!HOMEWORK_ROLES.has(auth.context.user.role)) {
    return mobileError(
      403,
      "PERMISSION_DENIED",
      "This account cannot view homework material."
    );
  }

  const schoolId = await resolveMobileSchoolId(auth.context, request);
  if (!schoolId) {
    return mobileError(
      400,
      "SCHOOL_REQUIRED",
      "This account must select an active school."
    );
  }

  const { id } = await params;

  const row = (
    await db
      .select({
        id: homework.id,
        classId: homework.classId,
        subjectId: homework.subjectId,
        attachmentUrl: homework.attachmentUrl,
        attachmentName: homework.attachmentName,
        attachmentMimeType: homework.attachmentMimeType
      })
      .from(homework)
      .where(and(
        eq(homework.id, id),
        eq(homework.schoolId, schoolId),
        eq(homework.status, "PUBLISHED")
      ))
      .limit(1)
  )[0];

  if (!row) {
    return mobileError(
      404,
      "HOMEWORK_NOT_FOUND",
      "The homework was not found."
    );
  }

  // TEACHER and HEADTEACHER have no school-wide monitoring: material outside
  // their own class+subject assignments is denied with 403 + audit.
  if (
    auth.context.user.role === "TEACHER" ||
    auth.context.user.role === "HEADTEACHER"
  ) {
    const scope = await teachingScope(auth.context.user.id, schoolId);

    if (!inTeachingScope(scope, row.classId, row.subjectId)) {
      await audit({
        schoolId,
        userId: auth.context.user.id,
        action: "HOMEWORK_SCHOOLWIDE_ACCESS_DENIED",
        entityType: "Homework",
        entityId: row.id,
        newValue: {
          role: auth.context.user.role,
          classId: row.classId,
          subjectId: row.subjectId
        }
      });
      return mobileError(
        403,
        "PERMISSION_DENIED",
        "You may only view homework material for your own assigned classes and subjects."
      );
    }
  }

  if (
    auth.context.user.role === "PARENT" ||
    auth.context.user.role === "LEARNER"
  ) {
    const permittedLearners = await accessibleLearnerIds(
      auth.context,
      schoolId
    );

    if (!permittedLearners || permittedLearners.length === 0) {
      return mobileError(
        404,
        "HOMEWORK_NOT_FOUND",
        "The homework was not found."
      );
    }

    const linkedClass = (
      await db
        .select({ id: learners.id })
        .from(learners)
        .where(and(
          eq(learners.schoolId, schoolId),
          eq(learners.classId, row.classId),
          inArray(learners.id, permittedLearners)
        ))
        .limit(1)
    )[0];

    if (!linkedClass) {
      return mobileError(
        404,
        "HOMEWORK_NOT_FOUND",
        "The homework was not found."
      );
    }
  }

  if (!row.attachmentUrl) {
    return mobileError(
      404,
      "MATERIAL_NOT_FOUND",
      "This homework has no uploaded material."
    );
  }

  const match = /^data:([^;,]+);base64,(.+)$/.exec(row.attachmentUrl);

  if (!match) {
    return mobileError(
      404,
      "MATERIAL_NOT_AVAILABLE",
      "This attachment is not stored as mobile-downloadable material."
    );
  }

  const mimeType = match[1];
  if (
    !ALLOWED_TYPES.has(mimeType) ||
    (row.attachmentMimeType && row.attachmentMimeType !== mimeType)
  ) {
    return mobileError(
      415,
      "INVALID_MATERIAL_TYPE",
      "The homework material type is not supported."
    );
  }

  let bytes: Buffer;

  try {
    bytes = Buffer.from(match[2], "base64");
  } catch {
    return mobileError(
      500,
      "MATERIAL_READ_FAILED",
      "The homework material could not be read."
    );
  }

  const fileName = (row.attachmentName || "homework-material")
    .replace(/[\\/"\r\n]/g, "_")
    .slice(0, 180);

  return new Response(Uint8Array.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
