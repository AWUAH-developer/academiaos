import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { attendanceRecords, attendanceRegisters, classes, learners } from '@/db/schema';
import { canMarkClassAttendance } from '@/lib/attendance-access';
import { createDailyAttendanceCharges } from '@/lib/attendance-fees';
import { findAttendancePeriod } from '@/lib/attendance-period';
import type { UserRole } from '@/lib/types';

export type AttendanceSubmitInput = {
  schoolId: string;
  userId: string;
  role: UserRole;
  classId: string;
  date: Date;
  substitutionReason?: string | null;
};

export type AttendanceSubmitFailureCode =
  | 'INVALID_DATE'
  | 'CLASS_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'PERIOD_NOT_CONFIGURED'
  | 'REGISTER_NOT_FOUND'
  | 'REGISTER_LOCKED'
  | 'SUBSTITUTION_REASON_REQUIRED'
  | 'NO_ACTIVE_LEARNERS'
  | 'INCOMPLETE_REGISTER'
  | 'REGISTER_RACE_LOST';

export type AttendanceSubmitFailure = {
  ok: false;
  code: AttendanceSubmitFailureCode;
  message: string;
};

export type AttendanceSubmitLearner = {
  learnerId: string;
  firstName: string;
  lastName: string;
  status: string;
};

export type AttendanceSubmitSuccess = {
  ok: true;
  registerId: string;
  classId: string;
  className: string;
  academicYearId: string;
  termId: string;
  termName: string;
  date: Date;
  markedById: string;
  markedByRole: UserRole;
  officialClassTeacherId: string | null;
  substitutionReason: string | null;
  learners: AttendanceSubmitLearner[];
};

export type AttendanceSubmitResult =
  | AttendanceSubmitSuccess
  | AttendanceSubmitFailure;

function fail(
  code: AttendanceSubmitFailureCode,
  message: string,
): AttendanceSubmitFailure {
  return { ok: false, code, message };
}

export async function submitAttendanceRegister(
  input: AttendanceSubmitInput,
): Promise<AttendanceSubmitResult> {
  if (Number.isNaN(input.date.getTime())) {
    return fail('INVALID_DATE', 'Enter a valid attendance date.');
  }

  const classRecord = (
    await db
      .select({
        id: classes.id,
        name: classes.name,
        stream: classes.stream,
        classTeacherId: classes.classTeacherId,
      })
      .from(classes)
      .where(
        and(
          eq(classes.id, input.classId),
          eq(classes.schoolId, input.schoolId),
          eq(classes.isActive, true),
        ),
      )
      .limit(1)
  )[0];

  if (classRecord === undefined) {
    return fail("CLASS_NOT_FOUND", "Class not found.");
  }

  const mayMark = await canMarkClassAttendance({
    role: input.role,
    userId: input.userId,
    schoolId: input.schoolId,
    classId: classRecord.id,
  });

  if (mayMark === false) {
    return fail(
      "PERMISSION_DENIED",
      "You cannot submit attendance for this class.",
    );
  }

  const period = await findAttendancePeriod({
    schoolId: input.schoolId,
    date: input.date,
  });

  if (period === null) {
    return fail(
      "PERIOD_NOT_CONFIGURED",
      "Attendance date does not belong to a configured academic term.",
    );
  }

  const existingRegister = (
    await db
      .select({
        id: attendanceRegisters.id,
        status: attendanceRegisters.status,
      })
      .from(attendanceRegisters)
      .where(
        and(
          eq(attendanceRegisters.schoolId, input.schoolId),
          eq(attendanceRegisters.classId, classRecord.id),
          eq(attendanceRegisters.date, input.date),
        ),
      )
      .limit(1)
  )[0];

  if (existingRegister === undefined) {
    return fail(
      "REGISTER_NOT_FOUND",
      "Save the class attendance draft before submitting.",
    );
  }

  if (existingRegister.status !== "DRAFT") {
    return fail(
      "REGISTER_LOCKED",
      "This class attendance has already been submitted and locked.",
    );
  }

  const substitutionReason =
    input.substitutionReason?.trim().slice(0, 500) || null;

  const isOfficialClassTeacher =
    Boolean(classRecord.classTeacherId) &&
    classRecord.classTeacherId === input.userId;

  if (isOfficialClassTeacher === false && substitutionReason === null) {
    return fail(
      "SUBSTITUTION_REASON_REQUIRED",
      "Enter a reason for marking attendance on behalf of the Class Teacher.",
    );
  }

  const classLearners = await db
    .select()
    .from(learners)
    .where(
      and(
        eq(learners.schoolId, input.schoolId),
        eq(learners.classId, classRecord.id),
        eq(learners.status, "ACTIVE"),
      ),
    );

  if (classLearners.length === 0) {
    return fail(
      "NO_ACTIVE_LEARNERS",
      "There are no active learners in this class.",
    );
  }

  const draftRows = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.schoolId, input.schoolId),
        eq(attendanceRecords.date, input.date),
        eq(attendanceRecords.registerId, existingRegister.id),
      ),
    );

  const learnerIds = new Set(
    classLearners.map((learner) => learner.id),
  );

  const classAttendance = draftRows.filter((row) =>
    learnerIds.has(row.learnerId),
  );

  const markedLearnerIds = new Set(
    classAttendance.map((row) => row.learnerId),
  );

  const missingCount = classLearners.filter(
    (learner) => markedLearnerIds.has(learner.id) === false,
  ).length;

  if (missingCount > 0) {
    return fail(
      "INCOMPLETE_REGISTER",
      String(missingCount) +
        " learner(s) have not been marked. Complete the entire class register before submitting.",
    );
  }

  const now = new Date();

  const transactionResult = await db.transaction(async (tx) => {
    const lockedRegister = (
      await tx
        .update(attendanceRegisters)
        .set({
          academicYearId: period.academicYearId,
          termId: period.termId,
          officialClassTeacherId: classRecord.classTeacherId,
          markedById: input.userId,
          markedByRole: input.role,
          substitutionReason: isOfficialClassTeacher
            ? null
            : substitutionReason,
          status: "LOCKED",
          submittedAt: now,
          lockedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(attendanceRegisters.id, existingRegister.id),
            eq(attendanceRegisters.status, "DRAFT"),
          ),
        )
        .returning({ id: attendanceRegisters.id })
    )[0];

    if (lockedRegister === undefined) {
      return null;
    }

    const lockedRows = await tx
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.schoolId, input.schoolId),
          eq(attendanceRecords.date, input.date),
          eq(attendanceRecords.registerId, lockedRegister.id),
        ),
      );

    const submittedLearners: AttendanceSubmitLearner[] = [];

    for (const learner of classLearners) {
      const attendance = lockedRows.find(
        (row) => row.learnerId === learner.id,
      );

      if (attendance === undefined) {
        throw new Error(
          "Attendance register became incomplete during submission.",
        );
      }

      await createDailyAttendanceCharges(
        tx,
        input.schoolId,
        learner,
        input.date,
        attendance.status,
      );

      submittedLearners.push({
        learnerId: learner.id,
        firstName: learner.firstName,
        lastName: learner.lastName,
        status: attendance.status,
      });
    }

    return {
      registerId: lockedRegister.id,
      learners: submittedLearners,
    };
  });

  if (transactionResult === null) {
    return fail(
      "REGISTER_RACE_LOST",
      "This class attendance was already submitted and locked by another request.",
    );
  }

  return {
    ok: true,
    registerId: transactionResult.registerId,
    classId: classRecord.id,
    className: [classRecord.name, classRecord.stream]
      .filter(Boolean)
      .join(" ")
      .trim(),
    academicYearId: period.academicYearId,
    termId: period.termId,
    termName: period.termName,
    date: input.date,
    markedById: input.userId,
    markedByRole: input.role,
    officialClassTeacherId: classRecord.classTeacherId,
    substitutionReason: isOfficialClassTeacher
      ? null
      : substitutionReason,
    learners: transactionResult.learners,
  };
}
