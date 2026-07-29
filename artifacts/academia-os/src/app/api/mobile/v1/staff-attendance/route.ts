import {
  and,
  asc,
  desc,
  eq,
  inArray
} from 'drizzle-orm';
import {
  NextRequest
} from 'next/server';
import {
  z
} from 'zod';
import {
  db
} from '@/db';
import {
  notifications,
  schoolManagementControls,
  staffAttendanceRecords,
  staffMovementRequests,
  users
} from '@/db/schema';
import {
  audit
} from '@/lib/auth';
import {
  authenticateMobileRequest,
  mobileError,
  mobileJson,
  resolveMobileSchoolId
} from '@/lib/mobile-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STAFF_ROLES = [
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER',
  'ACADEMIC_ADMIN',
  'TEACHER',
  'ACCOUNTS',
  'TRANSPORT',
  'SECURITY',
  'RECEPTIONIST',
  'LIBRARIAN',
  'CANTEEN'
] as const;

const SUPERVISOR_ROLES = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER'
] as const;

const postSchema = z.discriminatedUnion(
  'action',
  [
    z.object({
      action: z.literal(
        'RECORD_ATTENDANCE'
      ),
      staffId: z.string().uuid(),
      scanAction: z.enum([
        'ARRIVAL',
        'DEPARTURE'
      ])
    }),

    z.object({
      action: z.literal(
        'REQUEST_MOVEMENT'
      ),
      reason: z
        .string()
        .trim()
        .min(5)
        .max(1000),
      requestedDepartureAt:
        z.string().datetime(),
      expectedReturnAt:
        z.string().datetime().nullable()
    }),

    z.object({
      action: z.literal(
        'DECIDE_MOVEMENT'
      ),
      requestId: z.string().uuid(),
      decision: z.enum([
        'APPROVE',
        'REJECT'
      ]),
      decisionReason:
        z.string().trim().max(1000)
    }),

    z.object({
      action: z.literal(
        'RECORD_MOVEMENT'
      ),
      requestId: z.string().uuid(),
      movementAction: z.enum([
        'LEAVE',
        'RETURN'
      ])
    })
  ]
);

function todayUtc() {
  const date = new Date();

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function selectedDate(
  request: NextRequest
) {
  const value =
    request.nextUrl.searchParams.get(
      'date'
    );

  if (
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const parsed = new Date(
      `${value}T00:00:00.000Z`
    );

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return todayUtc();
}

async function accessFlags(
  schoolId: string,
  userId: string,
  role: string
) {
  const controls = (
    await db
      .select({
        officerId:
          schoolManagementControls.staffAttendanceOfficerId
      })
      .from(schoolManagementControls)
      .where(eq(
        schoolManagementControls.schoolId,
        schoolId
      ))
      .limit(1)
  )[0];

  return {
    canRecord:
      role === 'SECURITY' ||
      controls?.officerId === userId,

    isSupervisor:
      SUPERVISOR_ROLES.includes(
        role as typeof SUPERVISOR_ROLES[number]
      )
  };
}

async function findStaff(
  schoolId: string,
  staffId: string
) {
  return (
    await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, staffId),
        eq(users.schoolId, schoolId),
        eq(users.status, 'ACTIVE'),
        inArray(
          users.role,
          [...STAFF_ROLES]
        )
      ))
      .limit(1)
  )[0] || null;
}

async function notifyUser(input: {
  schoolId: string;
  userId: string;
  title: string;
  body: string;
}) {
  await db.insert(notifications).values({
    schoolId: input.schoolId,
    userId: input.userId,
    type: 'STAFF_MOVEMENT',
    title: input.title,
    body: input.body,
    link: '/staff-attendance'
  });
}

async function notifySupervisors(input: {
  schoolId: string;
  requesterId: string;
  requesterName: string;
  reason: string;
}) {
  const rows = await db
    .select({
      id: users.id
    })
    .from(users)
    .where(and(
      eq(users.schoolId, input.schoolId),
      eq(users.status, 'ACTIVE'),
      inArray(
        users.role,
        [
          'SCHOOL_ADMIN',
          'PROPRIETOR',
          'HEADTEACHER'
        ]
      )
    ));

  const recipients = rows
    .map((row) => row.id)
    .filter(
      (id) => id !== input.requesterId
    );

  if (!recipients.length) {
    return;
  }

  await db.insert(notifications).values(
    recipients.map((userId) => ({
      schoolId: input.schoolId,
      userId,
      type: 'STAFF_MOVEMENT',
      title:
        `${input.requesterName} requested permission to leave`,
      body: input.reason,
      link: '/staff-attendance'
    }))
  );
}

export async function GET(
  request: NextRequest
) {
  const auth =
    await authenticateMobileRequest(
      request
    );

  if ('response' in auth) {
    return auth.response;
  }

  const role =
    auth.context.user.role;

  if (
    role !== 'SUPER_ADMIN' &&
    !STAFF_ROLES.includes(
      role as typeof STAFF_ROLES[number]
    )
  ) {
    return mobileError(
      403,
      'PERMISSION_DENIED',
      'This account cannot use staff attendance.'
    );
  }

  const schoolId =
    await resolveMobileSchoolId(
      auth.context,
      request
    );

  if (!schoolId) {
    return mobileError(
      400,
      'SCHOOL_REQUIRED',
      'This account must select an active school.'
    );
  }

  const flags = await accessFlags(
    schoolId,
    auth.context.user.id,
    role
  );

  const wideView =
    flags.canRecord ||
    flags.isSupervisor;

  const date =
    selectedDate(request);

  const attendanceConditions = [
    eq(
      staffAttendanceRecords.schoolId,
      schoolId
    ),
    eq(
      staffAttendanceRecords.date,
      date
    )
  ];

  const movementConditions = [
    eq(
      staffMovementRequests.schoolId,
      schoolId
    )
  ];

  if (!wideView) {
    attendanceConditions.push(
      eq(
        staffAttendanceRecords.staffId,
        auth.context.user.id
      )
    );

    movementConditions.push(
      eq(
        staffMovementRequests.staffId,
        auth.context.user.id
      )
    );
  }

  const [
    staff,
    attendance,
    movements
  ] = await Promise.all([
    flags.canRecord
      ? db
          .select({
            id: users.id,
            name: users.name,
            role: users.role,
            photoUrl: users.photoUrl
          })
          .from(users)
          .where(and(
            eq(users.schoolId, schoolId),
            eq(users.status, 'ACTIVE'),
            inArray(
              users.role,
              [...STAFF_ROLES]
            )
          ))
          .orderBy(asc(users.name))
      : Promise.resolve([]),

    db
      .select({
        id: staffAttendanceRecords.id,
        staffId:
          staffAttendanceRecords.staffId,
        staffName: users.name,
        staffRole: users.role,
        date: staffAttendanceRecords.date,
        status:
          staffAttendanceRecords.status,
        arrivalTime:
          staffAttendanceRecords.arrivalTime,
        departureTime:
          staffAttendanceRecords.departureTime,
        lateArrival:
          staffAttendanceRecords.lateArrival,
        earlyDeparture:
          staffAttendanceRecords.earlyDeparture,
        reason:
          staffAttendanceRecords.reason,
        recordedById:
          staffAttendanceRecords.recordedById
      })
      .from(staffAttendanceRecords)
      .innerJoin(
        users,
        eq(
          staffAttendanceRecords.staffId,
          users.id
        )
      )
      .where(and(
        ...attendanceConditions
      ))
      .orderBy(asc(users.name)),

    db
      .select({
        id: staffMovementRequests.id,
        staffId:
          staffMovementRequests.staffId,
        staffName: users.name,
        staffRole: users.role,
        reason:
          staffMovementRequests.reason,
        requestedDepartureAt:
          staffMovementRequests
            .requestedDepartureAt,
        expectedReturnAt:
          staffMovementRequests
            .expectedReturnAt,
        actualDepartureAt:
          staffMovementRequests
            .actualDepartureAt,
        actualReturnAt:
          staffMovementRequests
            .actualReturnAt,
        status:
          staffMovementRequests.status,
        approvedById:
          staffMovementRequests
            .approvedById,
        decisionReason:
          staffMovementRequests
            .decisionReason,
        decidedAt:
          staffMovementRequests.decidedAt,
        createdAt:
          staffMovementRequests.createdAt
      })
      .from(staffMovementRequests)
      .innerJoin(
        users,
        eq(
          staffMovementRequests.staffId,
          users.id
        )
      )
      .where(and(
        ...movementConditions
      ))
      .orderBy(desc(
        staffMovementRequests.createdAt
      ))
      .limit(100)
  ]);

  return mobileJson({
    data: {
      canRecord: flags.canRecord,
      isSupervisor: flags.isSupervisor,
      selectedDate:
        date.toISOString().slice(0, 10),
      staff,
      attendance,
      movements
    }
  });
}

export async function POST(
  request: NextRequest
) {
  const auth =
    await authenticateMobileRequest(
      request
    );

  if ('response' in auth) {
    return auth.response;
  }

  const role =
    auth.context.user.role;

  if (
    role !== 'SUPER_ADMIN' &&
    !STAFF_ROLES.includes(
      role as typeof STAFF_ROLES[number]
    )
  ) {
    return mobileError(
      403,
      'PERMISSION_DENIED',
      'This account cannot use staff attendance.'
    );
  }

  const schoolId =
    await resolveMobileSchoolId(
      auth.context,
      request
    );

  if (!schoolId) {
    return mobileError(
      400,
      'SCHOOL_REQUIRED',
      'This account must select an active school.'
    );
  }

  const flags = await accessFlags(
    schoolId,
    auth.context.user.id,
    role
  );

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return mobileError(
      400,
      'INVALID_JSON',
      'Send a valid JSON request body.'
    );
  }

  const parsed =
    postSchema.safeParse(body);

  if (!parsed.success) {
    return mobileError(
      400,
      'INVALID_STAFF_ATTENDANCE_ACTION',
      'Enter valid staff attendance information.'
    );
  }

  if (
    parsed.data.action ===
    'RECORD_ATTENDANCE'
  ) {
    if (!flags.canRecord) {
      return mobileError(
        403,
        'RECORDER_REQUIRED',
        'Only Security or the selected attendance officer can record staff attendance.'
      );
    }

    if (
      parsed.data.staffId ===
      auth.context.user.id
    ) {
      return mobileError(
        403,
        'SELF_RECORDING_NOT_ALLOWED',
        'You cannot record your own attendance.'
      );
    }

    const staff = await findStaff(
      schoolId,
      parsed.data.staffId
    );

    if (!staff) {
      return mobileError(
        404,
        'STAFF_NOT_FOUND',
        'The staff member was not found.'
      );
    }

    const date = todayUtc();
    const now = new Date();

    await db
      .insert(staffAttendanceRecords)
      .values({
        schoolId,
        staffId: staff.id,
        date,
        status: 'PRESENT',
        arrivalTime:
          parsed.data.scanAction ===
          'ARRIVAL'
            ? now
            : null,
        departureTime:
          parsed.data.scanAction ===
          'DEPARTURE'
            ? now
            : null,
        recordedById:
          auth.context.user.id
      })
      .onConflictDoUpdate({
        target: [
          staffAttendanceRecords.staffId,
          staffAttendanceRecords.date
        ],
        set:
          parsed.data.scanAction ===
          'ARRIVAL'
            ? {
                arrivalTime: now,
                status: 'PRESENT',
                recordedById:
                  auth.context.user.id,
                updatedAt: now
              }
            : {
                departureTime: now,
                recordedById:
                  auth.context.user.id,
                updatedAt: now
              }
      });

    await audit({
      schoolId,
      userId: auth.context.user.id,
      action:
        `STAFF_${parsed.data.scanAction}_RECORDED`,
      entityType: 'StaffAttendance',
      entityId: staff.id,
      newValue: {
        source: 'MOBILE',
        staffName: staff.name,
        recordedById:
          auth.context.user.id,
        time: now
      }
    });

    return mobileJson(
      {
        data: {
          recorded: true,
          staffId: staff.id,
          staffName: staff.name,
          scanAction:
            parsed.data.scanAction,
          recordedAt: now
        }
      },
      201
    );
  }

  if (
    parsed.data.action ===
    'REQUEST_MOVEMENT'
  ) {
    if (
      !STAFF_ROLES.includes(
        role as typeof STAFF_ROLES[number]
      )
    ) {
      return mobileError(
        403,
        'STAFF_REQUIRED',
        'Only school staff can request movement permission.'
      );
    }

    const departure = new Date(
      parsed.data.requestedDepartureAt
    );

    const expectedReturn =
      parsed.data.expectedReturnAt
        ? new Date(
            parsed.data.expectedReturnAt
          )
        : null;

    if (
      Number.isNaN(departure.getTime()) ||
      (
        expectedReturn &&
        (
          Number.isNaN(
            expectedReturn.getTime()
          ) ||
          expectedReturn <= departure
        )
      )
    ) {
      return mobileError(
        400,
        'INVALID_MOVEMENT_TIME',
        'Enter valid departure and return times.'
      );
    }

    const [movement] = await db
      .insert(staffMovementRequests)
      .values({
        schoolId,
        staffId:
          auth.context.user.id,
        reason: parsed.data.reason,
        requestedDepartureAt:
          departure,
        expectedReturnAt:
          expectedReturn
      })
      .returning({
        id: staffMovementRequests.id
      });

    await notifySupervisors({
      schoolId,
      requesterId:
        auth.context.user.id,
      requesterName:
        auth.context.user.name,
      reason: parsed.data.reason
    });

    await audit({
      schoolId,
      userId: auth.context.user.id,
      action:
        'STAFF_MOVEMENT_REQUESTED',
      entityType: 'StaffMovement',
      entityId: movement.id,
      newValue: {
        source: 'MOBILE',
        reason: parsed.data.reason,
        departure,
        expectedReturn
      }
    });

    return mobileJson(
      {
        data: {
          requested: true,
          requestId: movement.id
        }
      },
      201
    );
  }

  if (
    parsed.data.action ===
    'DECIDE_MOVEMENT'
  ) {
    if (!flags.isSupervisor) {
      return mobileError(
        403,
        'SUPERVISOR_REQUIRED',
        'Only an authorised supervisor can decide movement requests.'
      );
    }

    if (
      parsed.data.decision ===
        'REJECT' &&
      !parsed.data.decisionReason
    ) {
      return mobileError(
        400,
        'REJECTION_REASON_REQUIRED',
        'A rejection reason is required.'
      );
    }

    const movement = (
      await db
        .select()
        .from(staffMovementRequests)
        .where(and(
          eq(
            staffMovementRequests.id,
            parsed.data.requestId
          ),
          eq(
            staffMovementRequests.schoolId,
            schoolId
          )
        ))
        .limit(1)
    )[0];

    if (
      !movement ||
      movement.status !== 'PENDING'
    ) {
      return mobileError(
        409,
        'MOVEMENT_NOT_PENDING',
        'This movement request is no longer pending.'
      );
    }

    const now = new Date();

    const status =
      parsed.data.decision ===
      'APPROVE'
        ? 'APPROVED'
        : 'REJECTED';

    await db
      .update(staffMovementRequests)
      .set({
        status,
        approvedById:
          auth.context.user.id,
        decisionReason:
          parsed.data.decisionReason ||
          null,
        decidedAt: now,
        updatedAt: now
      })
      .where(eq(
        staffMovementRequests.id,
        movement.id
      ));

    await notifyUser({
      schoolId,
      userId: movement.staffId,
      title:
        status === 'APPROVED'
          ? 'Movement request approved'
          : 'Movement request rejected',
      body:
        parsed.data.decisionReason ||
        (
          status === 'APPROVED'
            ? 'Report to Security or the authorised attendance officer before leaving.'
            : 'Your movement request was rejected.'
        )
    });

    await audit({
      schoolId,
      userId: auth.context.user.id,
      action:
        `STAFF_MOVEMENT_${parsed.data.decision}D`,
      entityType: 'StaffMovement',
      entityId: movement.id,
      newValue: {
        source: 'MOBILE',
        status,
        decisionReason:
          parsed.data.decisionReason
      }
    });

    return mobileJson({
      data: {
        decided: true,
        status
      }
    });
  }

  if (!flags.canRecord) {
    return mobileError(
      403,
      'RECORDER_REQUIRED',
      'Only Security or the selected attendance officer can record actual staff movement.'
    );
  }

  const movement = (
    await db
      .select()
      .from(staffMovementRequests)
      .where(and(
        eq(
          staffMovementRequests.id,
          parsed.data.requestId
        ),
        eq(
          staffMovementRequests.schoolId,
          schoolId
        )
      ))
      .limit(1)
  )[0];

  if (!movement) {
    return mobileError(
      404,
      'MOVEMENT_NOT_FOUND',
      'The movement request was not found.'
    );
  }

  if (
    movement.staffId ===
    auth.context.user.id
  ) {
    return mobileError(
      403,
      'SELF_RECORDING_NOT_ALLOWED',
      'You cannot record your own movement.'
    );
  }

  const staff = await findStaff(
    schoolId,
    movement.staffId
  );

  if (!staff) {
    return mobileError(
      404,
      'STAFF_NOT_FOUND',
      'The staff member was not found.'
    );
  }

  const now = new Date();

  if (
    parsed.data.movementAction ===
    'LEAVE'
  ) {
    if (
      movement.status !== 'APPROVED' ||
      movement.actualDepartureAt
    ) {
      return mobileError(
        409,
        'DEPARTURE_NOT_ALLOWED',
        'This staff member cannot currently be recorded as leaving.'
      );
    }

    await db
      .update(staffMovementRequests)
      .set({
        actualDepartureAt: now,
        updatedAt: now
      })
      .where(eq(
        staffMovementRequests.id,
        movement.id
      ));
  } else {
    if (
      movement.status !== 'APPROVED' ||
      !movement.actualDepartureAt ||
      movement.actualReturnAt
    ) {
      return mobileError(
        409,
        'RETURN_NOT_ALLOWED',
        'This staff member cannot currently be recorded as returned.'
      );
    }

    await db
      .update(staffMovementRequests)
      .set({
        status: 'RETURNED',
        actualReturnAt: now,
        updatedAt: now
      })
      .where(eq(
        staffMovementRequests.id,
        movement.id
      ));
  }

  await notifyUser({
    schoolId,
    userId: movement.staffId,
    title:
      parsed.data.movementAction ===
      'LEAVE'
        ? 'Departure recorded'
        : 'Return recorded',
    body:
      `${staff.name} was recorded by the authorised gate officer at ${now.toLocaleTimeString(
        'en-GH',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      )}.`
  });

  await audit({
    schoolId,
    userId: auth.context.user.id,
    action:
      parsed.data.movementAction ===
      'LEAVE'
        ? 'STAFF_ACTUAL_DEPARTURE_RECORDED'
        : 'STAFF_ACTUAL_RETURN_RECORDED',
    entityType: 'StaffMovement',
    entityId: movement.id,
    newValue: {
      source: 'MOBILE',
      staffId: movement.staffId,
      recordedById:
        auth.context.user.id,
      recordedAt: now
    }
  });

  return mobileJson({
    data: {
      recorded: true,
      movementAction:
        parsed.data.movementAction,
      recordedAt: now
    }
  });
}
