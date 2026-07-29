'use server';

import {
  and,
  eq,
  inArray
} from 'drizzle-orm';
import {
  revalidatePath
} from 'next/cache';
import {
  redirect
} from 'next/navigation';
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
  audit,
  requireUser
} from '@/lib/auth';
import {
  getActiveSchoolId
} from '@/lib/tenant';

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
];

const SUPERVISORS = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER'
];

function todayUtc() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function parseDate(
  value: FormDataEntryValue | null
) {
  const raw = String(value || '').trim();

  const gh =
    raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (gh) {
    const day = Number(gh[1]);
    const month = Number(gh[2]);
    const year = Number(gh[3]);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);

  return date;
}

function parseDateTime(
  value: FormDataEntryValue | null
) {
  const date =
    new Date(String(value || ''));

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

async function isAuthorisedRecorder(
  userId: string,
  role: string,
  schoolId: string
) {
  if (role === 'SECURITY') {
    return true;
  }

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

  return controls?.officerId === userId;
}

async function requireRecorder(
  userId: string,
  role: string,
  schoolId: string
) {
  if (
    !(await isAuthorisedRecorder(
      userId,
      role,
      schoolId
    ))
  ) {
    redirect(
      '/staff-attendance?error=Only+Security+or+the+authorised+attendance+officer+can+record+staff+movement'
    );
  }
}

async function findStaff(
  staffId: string,
  schoolId: string
) {
  const staff = (
    await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, staffId),
        eq(users.schoolId, schoolId),
        eq(users.status, 'ACTIVE'),
        inArray(users.role, STAFF_ROLES)
      ))
      .limit(1)
  )[0];

  return staff || null;
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

  const recipientIds = rows
    .map((row) => row.id)
    .filter(
      (id) => id !== input.requesterId
    );

  if (!recipientIds.length) {
    return;
  }

  await db.insert(notifications).values(
    recipientIds.map((userId) => ({
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

export async function recordStaffGateAction(
  formData: FormData
) {
  const actor = await requireUser();
  const schoolId =
    await getActiveSchoolId(actor);

  await requireRecorder(
    actor.id,
    actor.role,
    schoolId
  );

  const staffId =
    String(formData.get('staffId') || '');

  const action =
    String(formData.get('action') || '');

  if (
    !staffId ||
    !['ARRIVAL', 'DEPARTURE'].includes(action)
  ) {
    redirect(
      '/staff-attendance?error=Select+a+staff+member+and+valid+gate+action'
    );
  }

  if (staffId === actor.id) {
    redirect(
      '/staff-attendance?error=You+cannot+record+your+own+attendance'
    );
  }

  const staff =
    await findStaff(staffId, schoolId);

  if (!staff) {
    redirect(
      '/staff-attendance?error=Staff+member+not+found'
    );
  }

  const date = todayUtc();
  const now = new Date();

  await db
    .insert(staffAttendanceRecords)
    .values({
      schoolId,
      staffId,
      date,
      status: 'PRESENT',
      arrivalTime:
        action === 'ARRIVAL'
          ? now
          : null,
      departureTime:
        action === 'DEPARTURE'
          ? now
          : null,
      recordedById: actor.id
    })
    .onConflictDoUpdate({
      target: [
        staffAttendanceRecords.staffId,
        staffAttendanceRecords.date
      ],
      set:
        action === 'ARRIVAL'
          ? {
              arrivalTime: now,
              status: 'PRESENT',
              recordedById: actor.id,
              updatedAt: now
            }
          : {
              departureTime: now,
              recordedById: actor.id,
              updatedAt: now
            }
    });

  await audit({
    schoolId,
    userId: actor.id,
    action: `STAFF_${action}_RECORDED`,
    entityType: 'StaffAttendance',
    entityId: staffId,
    newValue: {
      staffName: staff.name,
      time: now,
      source: 'WEB',
      recordedById: actor.id
    }
  });

  revalidatePath('/staff-attendance');

  redirect(
    `/staff-attendance?success=${encodeURIComponent(
      `${staff.name} ${action.toLowerCase()} recorded`
    )}`
  );
}

export async function recordStaffAttendanceAction(
  formData: FormData
) {
  const actor = await requireUser();
  const schoolId =
    await getActiveSchoolId(actor);

  await requireRecorder(
    actor.id,
    actor.role,
    schoolId
  );

  const staffId =
    String(formData.get('staffId') || '');

  if (staffId === actor.id) {
    redirect(
      '/staff-attendance?error=You+cannot+record+your+own+attendance'
    );
  }

  const date =
    parseDate(formData.get('date'));

  const status =
    String(
      formData.get('status') || 'PRESENT'
    );

  if (
    !date ||
    ![
      'PRESENT',
      'ABSENT',
      'LATE',
      'PARTIAL',
      'SICK',
      'EXCUSED'
    ].includes(status)
  ) {
    redirect(
      '/staff-attendance?error=Enter+valid+attendance+details'
    );
  }

  const staff =
    await findStaff(staffId, schoolId);

  if (!staff) {
    redirect(
      '/staff-attendance?error=Staff+member+not+found'
    );
  }

  const sourceDate =
    date.toISOString().slice(0, 10);

  const arrivalValue =
    String(
      formData.get('arrivalTime') || ''
    );

  const departureValue =
    String(
      formData.get('departureTime') || ''
    );

  const arrivalTime = arrivalValue
    ? new Date(
        `${sourceDate}T${arrivalValue}:00`
      )
    : null;

  const departureTime = departureValue
    ? new Date(
        `${sourceDate}T${departureValue}:00`
      )
    : null;

  await db
    .insert(staffAttendanceRecords)
    .values({
      schoolId,
      staffId,
      date,
      status,
      arrivalTime,
      departureTime,
      lateArrival:
        formData.get('lateArrival') === 'on',
      earlyDeparture:
        formData.get('earlyDeparture') === 'on',
      reason:
        String(
          formData.get('reason') || ''
        ).trim() || null,
      recordedById: actor.id
    })
    .onConflictDoUpdate({
      target: [
        staffAttendanceRecords.staffId,
        staffAttendanceRecords.date
      ],
      set: {
        status,
        arrivalTime,
        departureTime,
        lateArrival:
          formData.get('lateArrival') === 'on',
        earlyDeparture:
          formData.get('earlyDeparture') === 'on',
        reason:
          String(
            formData.get('reason') || ''
          ).trim() || null,
        recordedById: actor.id,
        updatedAt: new Date()
      }
    });

  await audit({
    schoolId,
    userId: actor.id,
    action: 'STAFF_ATTENDANCE_RECORDED',
    entityType: 'StaffAttendance',
    entityId: staffId,
    newValue: {
      date,
      status,
      recordedById: actor.id
    }
  });

  revalidatePath('/staff-attendance');

  redirect(
    '/staff-attendance?success=Staff+attendance+saved'
  );
}

export async function requestStaffMovementAction(
  formData: FormData
) {
  const user = await requireUser();

  if (!STAFF_ROLES.includes(user.role)) {
    redirect(
      '/staff-attendance?error=Only+school+staff+can+request+movement'
    );
  }

  const schoolId =
    await getActiveSchoolId(user);

  const reason =
    String(formData.get('reason') || '')
      .trim();

  const departure =
    parseDateTime(
      formData.get('requestedDepartureAt')
    );

  const expectedReturn =
    parseDateTime(
      formData.get('expectedReturnAt')
    );

  if (!reason || !departure) {
    redirect(
      '/staff-attendance?error=Reason+and+departure+time+are+required'
    );
  }

  if (
    expectedReturn &&
    expectedReturn <= departure
  ) {
    redirect(
      '/staff-attendance?error=Expected+return+must+be+after+departure'
    );
  }

  const [request] = await db
    .insert(staffMovementRequests)
    .values({
      schoolId,
      staffId: user.id,
      reason,
      requestedDepartureAt: departure,
      expectedReturnAt: expectedReturn
    })
    .returning();

  await notifySupervisors({
    schoolId,
    requesterId: user.id,
    requesterName: user.name,
    reason
  });

  await audit({
    schoolId,
    userId: user.id,
    action: 'STAFF_MOVEMENT_REQUESTED',
    entityType: 'StaffMovement',
    entityId: request.id,
    newValue: {
      reason,
      departure,
      expectedReturn
    }
  });

  revalidatePath('/staff-attendance');

  redirect(
    '/staff-attendance?success=Movement+request+submitted'
  );
}

export async function decideStaffMovementAction(
  formData: FormData
) {
  const actor = await requireUser();

  if (!SUPERVISORS.includes(actor.role)) {
    redirect(
      '/staff-attendance?error=Only+an+authorised+supervisor+can+decide'
    );
  }

  const schoolId =
    await getActiveSchoolId(actor);

  const requestId =
    String(formData.get('requestId') || '');

  const decision =
    String(
      formData.get('decision') || ''
    );

  const decisionReason =
    String(
      formData.get('decisionReason') || ''
    ).trim();

  if (
    !['APPROVE', 'REJECT'].includes(
      decision
    )
  ) {
    redirect(
      '/staff-attendance?error=Invalid+decision'
    );
  }

  if (
    decision === 'REJECT' &&
    !decisionReason
  ) {
    redirect(
      '/staff-attendance?error=A+rejection+reason+is+required'
    );
  }

  const request = (
    await db
      .select()
      .from(staffMovementRequests)
      .where(and(
        eq(
          staffMovementRequests.id,
          requestId
        ),
        eq(
          staffMovementRequests.schoolId,
          schoolId
        )
      ))
      .limit(1)
  )[0];

  if (
    !request ||
    request.status !== 'PENDING'
  ) {
    redirect(
      '/staff-attendance?error=Request+is+not+pending'
    );
  }

  const status =
    decision === 'APPROVE'
      ? 'APPROVED'
      : 'REJECTED';

  const now = new Date();

  await db
    .update(staffMovementRequests)
    .set({
      status,
      approvedById: actor.id,
      decisionReason:
        decisionReason || null,
      decidedAt: now,
      updatedAt: now
    })
    .where(eq(
      staffMovementRequests.id,
      requestId
    ));

  await notifyUser({
    schoolId,
    userId: request.staffId,
    title:
      status === 'APPROVED'
        ? 'Movement request approved'
        : 'Movement request rejected',
    body:
      decisionReason ||
      (
        status === 'APPROVED'
          ? 'Report to Security or the authorised attendance officer before leaving.'
          : 'Your movement request was rejected.'
      )
  });

  await audit({
    schoolId,
    userId: actor.id,
    action:
      `STAFF_MOVEMENT_${decision}D`,
    entityType: 'StaffMovement',
    entityId: requestId,
    newValue: {
      decisionReason,
      status
    }
  });

  revalidatePath('/staff-attendance');

  redirect(
    '/staff-attendance?success=Movement+decision+recorded'
  );
}

export async function recordStaffMovementAction(
  formData: FormData
) {
  const actor = await requireUser();
  const schoolId =
    await getActiveSchoolId(actor);

  await requireRecorder(
    actor.id,
    actor.role,
    schoolId
  );

  const requestId =
    String(formData.get('requestId') || '');

  const action =
    String(formData.get('action') || '');

  if (!['LEAVE', 'RETURN'].includes(action)) {
    redirect(
      '/staff-attendance?error=Invalid+movement+action'
    );
  }

  const request = (
    await db
      .select()
      .from(staffMovementRequests)
      .where(and(
        eq(
          staffMovementRequests.id,
          requestId
        ),
        eq(
          staffMovementRequests.schoolId,
          schoolId
        )
      ))
      .limit(1)
  )[0];

  if (!request) {
    redirect(
      '/staff-attendance?error=Movement+request+not+found'
    );
  }

  if (request.staffId === actor.id) {
    redirect(
      '/staff-attendance?error=You+cannot+record+your+own+movement'
    );
  }

  const staff =
    await findStaff(
      request.staffId,
      schoolId
    );

  if (!staff) {
    redirect(
      '/staff-attendance?error=Staff+member+not+found'
    );
  }

  const now = new Date();

  if (action === 'LEAVE') {
    if (
      request.status !== 'APPROVED' ||
      request.actualDepartureAt
    ) {
      redirect(
        '/staff-attendance?error=This+staff+member+cannot+be+recorded+as+leaving'
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
        request.id
      ));
  } else {
    if (
      request.status !== 'APPROVED' ||
      !request.actualDepartureAt ||
      request.actualReturnAt
    ) {
      redirect(
        '/staff-attendance?error=This+staff+member+cannot+be+recorded+as+returned'
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
        request.id
      ));
  }

  await notifyUser({
    schoolId,
    userId: request.staffId,
    title:
      action === 'LEAVE'
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
    userId: actor.id,
    action:
      action === 'LEAVE'
        ? 'STAFF_ACTUAL_DEPARTURE_RECORDED'
        : 'STAFF_ACTUAL_RETURN_RECORDED',
    entityType: 'StaffMovement',
    entityId: request.id,
    newValue: {
      staffId: request.staffId,
      recordedById: actor.id,
      recordedAt: now,
      source: 'WEB'
    }
  });

  revalidatePath('/staff-attendance');

  redirect(
    `/staff-attendance?success=${encodeURIComponent(
      action === 'LEAVE'
        ? `${staff.name} departure recorded`
        : `${staff.name} return recorded`
    )}`
  );
}
