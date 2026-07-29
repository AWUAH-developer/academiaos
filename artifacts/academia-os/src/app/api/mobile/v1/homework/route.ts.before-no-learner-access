import { and, desc, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  academicYears,
  classes,
  curriculumTopics,
  homework,
  homeworkTopics,
  learners,
  subjects,
  terms,
  users
} from "@/db/schema";
import {
  accessibleLearnerIds,
  authenticateMobileRequest,
  mobileError,
  mobileJson,
  pagination,
  resolveMobileSchoolId
} from "@/lib/mobile-api";
import { cleanText } from "@/lib/validation";
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

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileRequest(request);
  if ("response" in auth) return auth.response;

  if (!HOMEWORK_ROLES.has(auth.context.user.role)) {
    return mobileError(
      403,
      "PERMISSION_DENIED",
      "This account cannot view homework."
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

  const classId = cleanText(
    request.nextUrl.searchParams.get("classId"),
    64
  );
  const termId = cleanText(
    request.nextUrl.searchParams.get("termId"),
    64
  );

  const conditions = [
    eq(homework.schoolId, schoolId),
    eq(homework.status, "PUBLISHED")
  ];

  if (
    auth.context.user.role === "PARENT" ||
    auth.context.user.role === "LEARNER"
  ) {
    const permittedLearners = await accessibleLearnerIds(
      auth.context,
      schoolId
    );

    if (!permittedLearners || permittedLearners.length === 0) {
      return mobileJson({
        data: {
          homework: [],
          pagination: { limit: 0, offset: 0 }
        }
      });
    }

    const learnerRows = await db
      .select({ classId: learners.classId })
      .from(learners)
      .where(and(
        eq(learners.schoolId, schoolId),
        inArray(learners.id, permittedLearners)
      ));

    const classIds = Array.from(
      new Set(
        learnerRows
          .map((row) => row.classId)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (classIds.length === 0) {
      return mobileJson({
        data: {
          homework: [],
          pagination: { limit: 0, offset: 0 }
        }
      });
    }

    conditions.push(inArray(homework.classId, classIds));
  }

  if (classId) conditions.push(eq(homework.classId, classId));
  if (termId) conditions.push(eq(homework.termId, termId));

  const { limit, offset } = pagination(request, 100);

  const rows = await db
    .select({
      id: homework.id,
      academicYearId: homework.academicYearId,
      academicYear: academicYears.name,
      termId: homework.termId,
      term: terms.name,
      classId: homework.classId,
      className: classes.name,
      stream: classes.stream,
      subjectId: homework.subjectId,
      subject: subjects.name,
      teacherId: homework.teacherId,
      teacherName: users.name,
      title: homework.title,
      instructions: homework.instructions,
      assignedOn: homework.assignedOn,
      dueAt: homework.dueAt,
      maximumScore: homework.maximumScore,
      sourceType: homework.sourceType,
      bookTitle: homework.bookTitle,
      pageReference: homework.pageReference,
      attachmentName: homework.attachmentName,
      attachmentMimeType: homework.attachmentMimeType,
      attachmentUrl: homework.attachmentUrl,
      status: homework.status
    })
    .from(homework)
    .innerJoin(classes, eq(homework.classId, classes.id))
    .innerJoin(subjects, eq(homework.subjectId, subjects.id))
    .innerJoin(users, eq(homework.teacherId, users.id))
    .innerJoin(
      academicYears,
      eq(homework.academicYearId, academicYears.id)
    )
    .innerJoin(terms, eq(homework.termId, terms.id))
    .where(and(...conditions))
    .orderBy(desc(homework.assignedOn))
    .limit(limit)
    .offset(offset);

  const topicRows = rows.length
    ? await db
        .select({
          homeworkId: homeworkTopics.homeworkId,
          id: curriculumTopics.id,
          name: curriculumTopics.name
        })
        .from(homeworkTopics)
        .innerJoin(
          curriculumTopics,
          eq(homeworkTopics.topicId, curriculumTopics.id)
        )
        .where(and(
          eq(homeworkTopics.schoolId, schoolId),
          inArray(
            homeworkTopics.homeworkId,
            rows.map((row) => row.id)
          )
        ))
    : [];

  const topicsByHomework = new Map<
    string,
    Array<{ id: string; name: string }>
  >();

  for (const topic of topicRows) {
    const current = topicsByHomework.get(topic.homeworkId) || [];
    current.push({ id: topic.id, name: topic.name });
    topicsByHomework.set(topic.homeworkId, current);
  }

  return mobileJson({
    data: {
      homework: rows.map(({ attachmentUrl, ...row }) => ({
        ...row,
        topics: topicsByHomework.get(row.id) || [],
        hasAttachment: Boolean(attachmentUrl),
        materialPath: attachmentUrl
          ? "/homework/" + row.id + "/material"
          : null
      })),
      pagination: { limit, offset }
    }
  });
}
