import bcrypt from 'bcryptjs';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  academicSubmissions,
  academicYears,
  attendanceRecords,
  classes,
  feeCategories,
  feeCharges,
  feeStructures,
  guardians,
  homework,
  learnerGuardians,
  learners,
  payments,
  schools,
  staffAttendanceRecords,
  subjects,
  teacherAssignments,
  terms,
  transportAssignments,
  transportRoutes,
  transportStops,
  users,
  vehicles,
} from '@/db/schema';

const DAY = 86_400_000;

function normalise(value: string) {
  return value.trim().toLowerCase();
}

function dateOnly(daysAgo = 0) {
  const value = new Date(Date.now() - daysAgo * DAY);
  value.setHours(0, 0, 0, 0);
  return value;
}

function weekdayDates(count: number) {
  const dates: Date[] = [];
  let cursor = 0;

  while (dates.length < count) {
    const value = dateOnly(cursor);
    const day = value.getDay();

    if (day !== 0 && day !== 6) {
      dates.push(value);
    }

    cursor++;
  }

  return dates.reverse();
}

export type SeedDemoTenantOptions = {
  schoolId?: string;
  targetEmail?: string;
  demoPassword?: string;
  database?: any;
  requireAuthorization?: boolean;
};

export async function seedDemoTenant(
  options: SeedDemoTenantOptions = {},
) {
  const database = options.database ?? db;
  const allowed = process.env.ALLOW_DEMO_SEED;
  const targetEmail = normalise(
    options.targetEmail ??
      process.env.DEMO_TARGET_EMAIL ??
      "",
  );
  const demoPassword =
    options.demoPassword ??
    process.env.DEMO_PASSWORD ??
    "AcademiaDemo2026!";

  if (
    (options.requireAuthorization ?? true) &&
    allowed !== "YES"
  ) {
    throw new Error(
      "Set ALLOW_DEMO_SEED=YES to authorise demo data.",
    );
  }

  if (!options.schoolId && !targetEmail) {
    throw new Error(
      "schoolId or DEMO_TARGET_EMAIL is required.",
    );
  }

  let school = options.schoolId
    ? (
        await database
          .select()
          .from(schools)
          .where(eq(schools.id, options.schoolId))
          .limit(1)
      )[0]
    : (
        await database
          .select()
          .from(schools)
          .where(
            sql`lower(${schools.email}) = ${targetEmail}`,
          )
          .limit(1)
      )[0];

  if (!school && !options.schoolId) {
    const account = (
      await database
        .select()
        .from(users)
        .where(
          sql`lower(${users.email}) = ${targetEmail}`,
        )
        .limit(1)
    )[0];

    if (account?.schoolId) {
      school = (
        await database
          .select()
          .from(schools)
          .where(eq(schools.id, account.schoolId))
          .limit(1)
      )[0];
    }
  }

  if (!school) {
    throw new Error(
      options.schoolId
        ? `No school was found for ID ${options.schoolId}.`
        : `No demo tenant was found for ${targetEmail}.`,
    );
  }

  if (
    school.code.toUpperCase() === 'PLA' ||
    school.name.toLowerCase().includes(
      'paul lawrence academy',
    )
  ) {
    throw new Error(
      'Safety stop: Paul Lawrence Academy cannot be demo-seeded.',
    );
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const prefix =
    school.code
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10) || 'demo';

  console.log('');
  console.log('Target demo school');
  console.log(`Name:  ${school.name}`);
  console.log(`Code:  ${school.code}`);
  console.log(`Email: ${targetEmail}`);
  console.log('');

  const staffSeed = [
    ['Demo Proprietor', `${prefix}.proprietor`, 'PROPRIETOR'],
    ['Demo Headteacher', `${prefix}.headteacher`, 'HEADTEACHER'],
    ['Demo Academic Administrator', `${prefix}.academic`, 'ACADEMIC_ADMIN'],
    ['Ama Mensah', `${prefix}.teacher1`, 'TEACHER'],
    ['Kwesi Addo', `${prefix}.teacher2`, 'TEACHER'],
    ['Esi Boadu', `${prefix}.teacher3`, 'TEACHER'],
    ['Demo Accounts Officer', `${prefix}.accounts`, 'ACCOUNTS'],
    ['Demo Attendance Officer', `${prefix}.attendance`, 'RECEPTIONIST'],
    ['Demo Transport Officer', `${prefix}.transport`, 'TRANSPORT'],
    ['Demo Security Officer', `${prefix}.security`, 'SECURITY'],
  ] as const;

  const staff = new Map<string, typeof users.$inferSelect>();

  for (const [name, username, role] of staffSeed) {
    const [user] = await db
      .insert(users)
      .values({
        schoolId: school.id,
        name,
        username,
        email: `${username}@academiaos.demo`,
        passwordHash,
        role,
        status: 'ACTIVE',
        mustChangePassword: false,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          schoolId: school.id,
          name,
          role,
          passwordHash,
          status: 'ACTIVE',
          mustChangePassword: false,
          updatedAt: now,
        },
      })
      .returning();

    staff.set(username, user);
  }

  let year = (
    await db
      .select()
      .from(academicYears)
      .where(
        and(
          eq(academicYears.schoolId, school.id),
          eq(academicYears.isCurrent, true),
        ),
      )
      .limit(1)
  )[0];

  if (!year) {
    [year] = await db
      .insert(academicYears)
      .values({
        schoolId: school.id,
        name: '2025/2026',
        startsOn: new Date('2025-09-02'),
        endsOn: new Date('2026-08-14'),
        isCurrent: true,
      })
      .onConflictDoUpdate({
        target: [
          academicYears.schoolId,
          academicYears.name,
        ],
        set: {
          isCurrent: true,
          updatedAt: now,
        },
      })
      .returning();
  }

  let term = (
    await db
      .select()
      .from(terms)
      .where(
        and(
          eq(terms.schoolId, school.id),
          eq(terms.isCurrent, true),
        ),
      )
      .limit(1)
  )[0];

  if (!term) {
    [term] = await db
      .insert(terms)
      .values({
        schoolId: school.id,
        academicYearId: year.id,
        name: 'Term 3',
        startsOn: new Date('2026-05-04'),
        endsOn: new Date('2026-08-07'),
        reopeningDate: new Date('2026-09-01'),
        isCurrent: true,
      })
      .onConflictDoUpdate({
        target: [terms.academicYearId, terms.name],
        set: {
          isCurrent: true,
          updatedAt: now,
        },
      })
      .returning();
  }

  const teachers = [
    staff.get(`${prefix}.teacher1`)!,
    staff.get(`${prefix}.teacher2`)!,
    staff.get(`${prefix}.teacher3`)!,
  ];

  const classSeed = [
    {
      name: 'Primary 3',
      stream: 'A',
      level: 'Primary',
      classTeacherId: teachers[0].id,
    },
    {
      name: 'Primary 5',
      stream: 'A',
      level: 'Primary',
      classTeacherId: teachers[1].id,
    },
    {
      name: 'JHS 1',
      stream: 'A',
      level: 'JHS',
      classTeacherId: teachers[2].id,
    },
    {
      name: 'JHS 2',
      stream: 'A',
      level: 'JHS',
      classTeacherId: teachers[0].id,
    },
  ];

  const classRows: typeof classes.$inferSelect[] = [];

  for (const value of classSeed) {
    const [row] = await db
      .insert(classes)
      .values({
        schoolId: school.id,
        ...value,
      })
      .onConflictDoUpdate({
        target: [
          classes.schoolId,
          classes.name,
          classes.stream,
        ],
        set: {
          level: value.level,
          classTeacherId: value.classTeacherId,
          isActive: true,
          updatedAt: now,
        },
      })
      .returning();

    classRows.push(row);
  }

  const subjectSeed = [
    ['Mathematics', 'MATH'],
    ['English Language', 'ENG'],
    ['Science', 'SCI'],
    ['Social Studies', 'SOC'],
    ['Computing', 'ICT'],
    ['Religious and Moral Education', 'RME'],
  ] as const;

  const subjectRows: typeof subjects.$inferSelect[] = [];

  for (const [name, code] of subjectSeed) {
    const [subject] = await db
      .insert(subjects)
      .values({
        schoolId: school.id,
        name,
        code,
      })
      .onConflictDoUpdate({
        target: [subjects.schoolId, subjects.code],
        set: {
          name,
          isActive: true,
          updatedAt: now,
        },
      })
      .returning();

    subjectRows.push(subject);
  }

  for (let classIndex = 0; classIndex < classRows.length; classIndex++) {
    for (
      let subjectIndex = 0;
      subjectIndex < subjectRows.length;
      subjectIndex++
    ) {
      await db
        .insert(teacherAssignments)
        .values({
          schoolId: school.id,
          teacherId:
            teachers[
              (classIndex + subjectIndex) %
                teachers.length
            ].id,
          classId: classRows[classIndex].id,
          subjectId: subjectRows[subjectIndex].id,
        })
        .onConflictDoNothing();
    }
  }

  const parentNames = [
    'Abena Owusu',
    'Kofi Asare',
    'Akosua Mensah',
    'Yaw Boateng',
    'Adwoa Nyarko',
    'Kwame Adu',
    'Esi Antwi',
    'Kojo Frimpong',
    'Ama Osei',
    'Nana Appiah',
  ];

  const parentUsers: typeof users.$inferSelect[] = [];

  for (let index = 0; index < parentNames.length; index++) {
    const username = `${prefix}.parent${index + 1}`;

    const [parent] = await db
      .insert(users)
      .values({
        schoolId: school.id,
        name: parentNames[index],
        username,
        email: `${username}@academiaos.demo`,
        phone: `024500${String(index + 1).padStart(4, '0')}`,
        passwordHash,
        role: 'PARENT',
        status: 'ACTIVE',
        mustChangePassword: false,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          schoolId: school.id,
          name: parentNames[index],
          passwordHash,
          status: 'ACTIVE',
          mustChangePassword: false,
          updatedAt: now,
        },
      })
      .returning();

    parentUsers.push(parent);
  }

  const learnerNames = [
    ['Daniel', 'Owusu'],
    ['Grace', 'Owusu'],
    ['Michael', 'Asare'],
    ['Priscilla', 'Asare'],
    ['Samuel', 'Mensah'],
    ['Esther', 'Mensah'],
    ['Joseph', 'Boateng'],
    ['Linda', 'Boateng'],
    ['Emmanuel', 'Nyarko'],
    ['Gifty', 'Nyarko'],
    ['David', 'Adu'],
    ['Ruth', 'Adu'],
    ['Isaac', 'Antwi'],
    ['Mary', 'Antwi'],
    ['Joshua', 'Frimpong'],
    ['Mabel', 'Frimpong'],
    ['Benjamin', 'Osei'],
    ['Deborah', 'Osei'],
    ['Nathaniel', 'Appiah'],
    ['Victoria', 'Appiah'],
  ] as const;

  const learnerRows: typeof learners.$inferSelect[] = [];

  for (let index = 0; index < learnerNames.length; index++) {
    const [firstName, lastName] = learnerNames[index];
    const admissionNo =
      `${school.code}-D${String(index + 1).padStart(3, '0')}`;
    const learnerUsername =
      `${prefix}.student${index + 1}`;

    const [learnerUser] = await db
      .insert(users)
      .values({
        schoolId: school.id,
        name: `${firstName} ${lastName}`,
        username: learnerUsername,
        email: `${learnerUsername}@academiaos.demo`,
        passwordHash,
        role: 'LEARNER',
        status: 'ACTIVE',
        mustChangePassword: false,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          schoolId: school.id,
          name: `${firstName} ${lastName}`,
          passwordHash,
          status: 'ACTIVE',
          mustChangePassword: false,
          updatedAt: now,
        },
      })
      .returning();

    const [learner] = await db
      .insert(learners)
      .values({
        schoolId: school.id,
        userId: learnerUser.id,
        classId: classRows[index % classRows.length].id,
        admissionNo,
        firstName,
        lastName,
        gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
        dateOfBirth: new Date(
          `${2012 + (index % 4)}-${String(
            (index % 9) + 1,
          ).padStart(2, '0')}-15`,
        ),
        address: 'Kumasi, Ashanti Region',
        emergencyContact:
          parentUsers[Math.floor(index / 2)].phone,
        paymentPlan:
          index % 3 === 0
            ? 'INSTALLMENT'
            : index % 3 === 1
              ? 'TERM'
              : 'DAILY',
        badgeCode:
          `${school.code}-DEMO-${String(index + 1).padStart(3, '0')}`,
        status: 'ACTIVE',
      })
      .onConflictDoUpdate({
        target: [
          learners.schoolId,
          learners.admissionNo,
        ],
        set: {
          userId: learnerUser.id,
          classId: classRows[index % classRows.length].id,
          firstName,
          lastName,
          status: 'ACTIVE',
          updatedAt: now,
        },
      })
      .returning();

    learnerRows.push(learner);

    const parentIndex = Math.floor(index / 2);
    const parent = parentUsers[parentIndex];
    const phone =
      parent.phone ??
      `024500${String(parentIndex + 1).padStart(4, '0')}`;

    let guardian = (
      await db
        .select()
        .from(guardians)
        .where(
          and(
            eq(guardians.schoolId, school.id),
            eq(guardians.phone, phone),
          ),
        )
        .limit(1)
    )[0];

    if (!guardian) {
      [guardian] = await db
        .insert(guardians)
        .values({
          schoolId: school.id,
          userId: parent.id,
          name: parent.name,
          phone,
          email: parent.email,
          address: 'Kumasi, Ashanti Region',
        })
        .returning();
    } else if (guardian.userId !== parent.id) {
      [guardian] = await db
        .update(guardians)
        .set({
          userId: parent.id,
          name: parent.name,
          email: parent.email,
          updatedAt: now,
        })
        .where(eq(guardians.id, guardian.id))
        .returning();
    }

    await db
      .insert(learnerGuardians)
      .values({
        learnerId: learner.id,
        guardianId: guardian.id,
        relationship:
          index % 2 === 0 ? 'Father/Mother' : 'Guardian',
        isPrimary: true,
      })
      .onConflictDoNothing();
  }

  const attendanceOfficer =
    staff.get(`${prefix}.attendance`)!;
  const attendanceDates = weekdayDates(12);

  for (
    let dayIndex = 0;
    dayIndex < attendanceDates.length;
    dayIndex++
  ) {
    for (
      let learnerIndex = 0;
      learnerIndex < learnerRows.length;
      learnerIndex++
    ) {
      const absent =
        (dayIndex + learnerIndex) % 13 === 0;
      const late =
        !absent &&
        (dayIndex + learnerIndex) % 9 === 0;

      const checkIn = absent
        ? null
        : new Date(
            attendanceDates[dayIndex].getTime() +
              (late ? 8.25 : 7.75) * 60 * 60 * 1000,
          );

      await db
        .insert(attendanceRecords)
        .values({
          schoolId: school.id,
          learnerId: learnerRows[learnerIndex].id,
          date: attendanceDates[dayIndex],
          status: absent
            ? 'ABSENT'
            : late
              ? 'LATE'
              : 'PRESENT',
          checkInTime: checkIn,
          recordedById: attendanceOfficer.id,
        })
        .onConflictDoUpdate({
          target: [
            attendanceRecords.learnerId,
            attendanceRecords.date,
          ],
          set: {
            status: absent
              ? 'ABSENT'
              : late
                ? 'LATE'
                : 'PRESENT',
            checkInTime: checkIn,
            recordedById: attendanceOfficer.id,
            updatedAt: now,
          },
        });
    }
  }

  const staffDates = weekdayDates(8);

  for (const date of staffDates) {
    for (let index = 0; index < staffSeed.length; index++) {
      const staffUser =
        staff.get(staffSeed[index][1])!;
      const late = (index + date.getDate()) % 7 === 0;

      await db
        .insert(staffAttendanceRecords)
        .values({
          schoolId: school.id,
          staffId: staffUser.id,
          date,
          status: 'PRESENT',
          arrivalTime: new Date(
            date.getTime() +
              (late ? 8.2 : 7.5) * 60 * 60 * 1000,
          ),
          departureTime: new Date(
            date.getTime() + 16 * 60 * 60 * 1000,
          ),
          lateArrival: late,
          recordedById: attendanceOfficer.id,
        })
        .onConflictDoUpdate({
          target: [
            staffAttendanceRecords.staffId,
            staffAttendanceRecords.date,
          ],
          set: {
            status: 'PRESENT',
            lateArrival: late,
            recordedById: attendanceOfficer.id,
            updatedAt: now,
          },
        });
    }
  }

  const categorySeed = [
    {
      name: 'Tuition',
      code: 'TUITION',
      isDailyTuition: true,
      isCanteen: false,
    },
    {
      name: 'Canteen',
      code: 'CANTEEN',
      isDailyTuition: false,
      isCanteen: true,
    },
    {
      name: 'Transport',
      code: 'TRANSPORT',
      isDailyTuition: false,
      isCanteen: false,
    },
    {
      name: 'Examination',
      code: 'EXAM',
      isDailyTuition: false,
      isCanteen: false,
    },
  ];

  const categories: typeof feeCategories.$inferSelect[] = [];

  for (const value of categorySeed) {
    const [category] = await db
      .insert(feeCategories)
      .values({
        schoolId: school.id,
        ...value,
      })
      .onConflictDoUpdate({
        target: [
          feeCategories.schoolId,
          feeCategories.code,
        ],
        set: {
          name: value.name,
          isActive: true,
          updatedAt: now,
        },
      })
      .returning();

    categories.push(category);
  }

  for (const classRow of classRows) {
    await db
      .insert(feeStructures)
      .values([
        {
          schoolId: school.id,
          categoryId: categories[0].id,
          classId: classRow.id,
          paymentPlan: 'TERM',
          amount: classRow.level === 'JHS' ? 1050 : 850,
          chargeOnAbsent: true,
        },
        {
          schoolId: school.id,
          categoryId: categories[0].id,
          classId: classRow.id,
          paymentPlan: 'DAILY',
          amount: 10,
          chargeOnAbsent: true,
        },
        {
          schoolId: school.id,
          categoryId: categories[1].id,
          classId: classRow.id,
          paymentPlan: 'DAILY',
          amount: 5,
          chargeOnAbsent: false,
        },
      ])
      .onConflictDoNothing();
  }

  const accounts = staff.get(`${prefix}.accounts`)!;

  for (let index = 0; index < learnerRows.length; index++) {
    const amount =
      classRows[index % classRows.length].level === 'JHS'
        ? 1050
        : 850;
    const paidAmount =
      index % 4 === 0
        ? amount
        : index % 4 === 1
          ? 500
          : index % 4 === 2
            ? 250
            : 0;
    const status =
      paidAmount >= amount
        ? 'PAID'
        : paidAmount > 0
          ? 'PARTIAL'
          : 'OPEN';

    const description = 'Term 3 tuition';

    const existingCharge = (
      await db
        .select()
        .from(feeCharges)
        .where(
          and(
            eq(feeCharges.learnerId, learnerRows[index].id),
            eq(feeCharges.description, description),
          ),
        )
        .limit(1)
    )[0];

    if (!existingCharge) {
      await database.insert(feeCharges).values({
        schoolId: school.id,
        learnerId: learnerRows[index].id,
        categoryId: categories[0].id,
        description,
        amount,
        paidAmount,
        status,
        dueDate: new Date('2026-08-07'),
      });
    } else {
      await db
        .update(feeCharges)
        .set({
          amount,
          paidAmount,
          status,
          updatedAt: now,
        })
        .where(eq(feeCharges.id, existingCharge.id));
    }

    if (paidAmount > 0) {
      await db
        .insert(payments)
        .values({
          schoolId: school.id,
          learnerId: learnerRows[index].id,
          amount: paidAmount,
          method:
            index % 2 === 0
              ? 'MOBILE_MONEY'
              : 'CASH',
          reference:
            `DEMO-PAY-${String(index + 1).padStart(3, '0')}`,
          receiptNo:
            `${school.code}-DEMO-${String(index + 1).padStart(5, '0')}`,
          notes: 'Demonstration payment',
          recordedById: accounts.id,
        })
        .onConflictDoNothing();
    }
  }

  const academicAdmin =
    staff.get(`${prefix}.academic`)!;
  const proprietor =
    staff.get(`${prefix}.proprietor`)!;

  for (
    let learnerIndex = 0;
    learnerIndex < Math.min(12, learnerRows.length);
    learnerIndex++
  ) {
    for (let subjectIndex = 0; subjectIndex < 3; subjectIndex++) {
      const classworkScore =
        6 + ((learnerIndex + subjectIndex) % 5);
      const homeworkScore =
        6 + ((learnerIndex * 2 + subjectIndex) % 5);
      const testScore =
        12 + ((learnerIndex + subjectIndex * 3) % 9);
      const examScore =
        38 + ((learnerIndex * 4 + subjectIndex) % 23);
      const totalScore =
        classworkScore +
        homeworkScore +
        testScore +
        examScore;

      const grade =
        totalScore >= 80
          ? 'A'
          : totalScore >= 70
            ? 'B'
            : totalScore >= 60
              ? 'C'
              : totalScore >= 50
                ? 'D'
                : 'E';

      const mode = learnerIndex % 3;
      const status =
        mode === 0
          ? 'APPROVED'
          : mode === 1
            ? 'SUBMITTED'
            : 'DRAFT';

      const teacher =
        teachers[
          (learnerIndex + subjectIndex) %
            teachers.length
        ];

      await db
        .insert(academicSubmissions)
        .values({
          schoolId: school.id,
          learnerId: learnerRows[learnerIndex].id,
          teacherId: teacher.id,
          reviewerId:
            status === 'APPROVED'
              ? academicAdmin.id
              : null,
          proprietorId:
            status === 'APPROVED'
              ? proprietor.id
              : null,
          academicYearId: year.id,
          termId: term.id,
          classId: learnerRows[learnerIndex].classId!,
          subjectId: subjectRows[subjectIndex].id,
          classworkScore,
          homeworkScore,
          testScore,
          examScore,
          totalScore,
          grade,
          teacherRemark:
            totalScore >= 70
              ? 'Very good performance. Keep improving.'
              : 'Good effort. More practice is recommended.',
          conductRemark: 'Respectful and cooperative.',
          classTeacherRemark:
            'Shows steady progress throughout the term.',
          status,
          submittedAt:
            status === 'DRAFT' ? null : now,
          reviewedAt:
            status === 'APPROVED' ? now : null,
          approvedAt:
            status === 'APPROVED' ? now : null,
          lockedAt:
            status === 'APPROVED' ? now : null,
        })
        .onConflictDoUpdate({
          target: [
            academicSubmissions.learnerId,
            academicSubmissions.academicYearId,
            academicSubmissions.termId,
            academicSubmissions.subjectId,
          ],
          set: {
            teacherId: teacher.id,
            classworkScore,
            homeworkScore,
            testScore,
            examScore,
            totalScore,
            grade,
            status,
            updatedAt: now,
          },
        });
    }
  }

  const homeworkSeed = [
    {
      title: 'Fractions and decimals',
      instructions:
        'Complete exercises 1 to 15 and show all working.',
      subjectIndex: 0,
      classIndex: 1,
      days: 3,
    },
    {
      title: 'Creative writing',
      instructions:
        'Write a 250-word composition about your community.',
      subjectIndex: 1,
      classIndex: 2,
      days: 5,
    },
    {
      title: 'The human digestive system',
      instructions:
        'Draw and label the digestive system in your exercise book.',
      subjectIndex: 2,
      classIndex: 3,
      days: 7,
    },
  ];

  for (let index = 0; index < homeworkSeed.length; index++) {
    const value = homeworkSeed[index];

    const exists = await db
      .select({ id: homework.id })
      .from(homework)
      .where(
        and(
          eq(homework.schoolId, school.id),
          eq(homework.title, value.title),
        ),
      )
      .limit(1);

    if (!exists.length) {
      await database.insert(homework).values({
        schoolId: school.id,
        teacherId: teachers[index].id,
        academicYearId: year.id,
        termId: term.id,
        classId: classRows[value.classIndex].id,
        subjectId: subjectRows[value.subjectIndex].id,
        title: value.title,
        instructions: value.instructions,
        dueAt: new Date(Date.now() + value.days * DAY),
        maximumScore: 10,
        status: 'PUBLISHED',
      });
    }
  }

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      schoolId: school.id,
      name: 'Demo School Bus',
      registrationNo: `${school.code}-DEMO-BUS`,
      capacity: 35,
      driverName: 'Yaw Mensah',
      driverPhone: '0241112233',
      attendantName: 'Comfort Owusu',
    })
    .onConflictDoUpdate({
      target: [
        vehicles.schoolId,
        vehicles.registrationNo,
      ],
      set: {
        name: 'Demo School Bus',
        isActive: true,
        updatedAt: now,
      },
    })
    .returning();

  const [route] = await db
    .insert(transportRoutes)
    .values({
      schoolId: school.id,
      vehicleId: vehicle.id,
      name: 'Main Demo Route',
      morningStartTime: '06:30',
      afternoonStartTime: '15:15',
    })
    .onConflictDoUpdate({
      target: [
        transportRoutes.schoolId,
        transportRoutes.name,
      ],
      set: {
        vehicleId: vehicle.id,
        isActive: true,
        updatedAt: now,
      },
    })
    .returning();

  let stop = (
    await db
      .select()
      .from(transportStops)
      .where(
        and(
          eq(transportStops.routeId, route.id),
          eq(transportStops.sequence, 1),
        ),
      )
      .limit(1)
  )[0];

  if (!stop) {
    [stop] = await db
      .insert(transportStops)
      .values({
        schoolId: school.id,
        routeId: route.id,
        name: 'Central Pickup Point',
        sequence: 1,
        pickupTime: '06:45',
        dropOffTime: '16:00',
      })
      .returning();
  }

  for (const learner of learnerRows.slice(0, 8)) {
    await db
      .insert(transportAssignments)
      .values({
        schoolId: school.id,
        learnerId: learner.id,
        routeId: route.id,
        stopId: stop.id,
        vehicleId: vehicle.id,
      })
      .onConflictDoNothing();
  }

  console.log('');
  console.log('===== DEMO DATA READY =====');
  console.log(`School: ${school.name}`);
  console.log('Students: 20');
  console.log('Parents: 10');
  console.log('Staff: 10');
  console.log('Attendance: 12 school days');
  console.log('Staff attendance: 8 school days');
  console.log('Fees, payments, results, homework and transport added');
  console.log('');
  console.log('Example usernames:');
  console.log(`${prefix}.proprietor`);
  console.log(`${prefix}.teacher1`);
  console.log(`${prefix}.accounts`);
  console.log(`${prefix}.parent1`);
  console.log(`${prefix}.student1`);
}
