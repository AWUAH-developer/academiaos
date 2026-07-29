import {
  and,
  asc,
  desc,
  eq,
  inArray
} from 'drizzle-orm';
import {
  Clock4,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import {
  redirect
} from 'next/navigation';
import {
  decideStaffMovementAction,
  recordStaffAttendanceAction,
  recordStaffGateAction,
  recordStaffMovementAction,
  requestStaffMovementAction
} from '@/app/actions/staffAttendance';
import {
  EmptyState
} from '@/components/EmptyState';
import {
  ExportLink
} from '@/components/ExportLink';
import {
  FlashMessage
} from '@/components/FlashMessage';
import {
  GhanaDateInput
} from '@/components/GhanaDateInput';
import {
  PageHeader
} from '@/components/PageHeader';
import {
  db
} from '@/db';
import {
  schoolManagementControls,
  staffAttendanceRecords,
  staffMovementRequests,
  users
} from '@/db/schema';
import {
  requireUser
} from '@/lib/auth';
import {
  canAccess
} from '@/lib/permissions';
import {
  getActiveSchoolId
} from '@/lib/tenant';

export const metadata = {
  title: 'Staff attendance'
};

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
];

const SUPERVISORS = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER'
];

function selectedDate(value?: string) {
  const source =
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : new Date()
          .toISOString()
          .slice(0, 10);

  return {
    source,
    date: new Date(
      `${source}T00:00:00.000Z`
    )
  };
}

function timeText(value: Date | null) {
  return value
    ? value.toLocaleTimeString(
        'en-GH',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      )
    : '-';
}

export default async function StaffAttendancePage({
  searchParams
}: {
  searchParams: Promise<{
    date?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();

  if (
    !canAccess(
      user.role,
      'staff-attendance'
    )
  ) {
    redirect('/dashboard');
  }

  const schoolId =
    await getActiveSchoolId(user);

  const params = await searchParams;
  const selected =
    selectedDate(params.date);

  const controls = (
    await db
      .select()
      .from(schoolManagementControls)
      .where(eq(
        schoolManagementControls.schoolId,
        schoolId
      ))
      .limit(1)
  )[0];

  const canRecord =
    user.role === 'SECURITY' ||
    controls?.staffAttendanceOfficerId ===
      user.id;

  const supervisor =
    SUPERVISORS.includes(user.role);

  const wideView =
    canRecord || supervisor;

  const staffRows = await db
    .select()
    .from(users)
    .where(and(
      eq(users.schoolId, schoolId),
      eq(users.status, 'ACTIVE'),
      inArray(users.role, STAFF_ROLES)
    ))
    .orderBy(asc(users.name));

  const attendanceConditions = [
    eq(
      staffAttendanceRecords.schoolId,
      schoolId
    ),
    eq(
      staffAttendanceRecords.date,
      selected.date
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
        user.id
      )
    );

    movementConditions.push(
      eq(
        staffMovementRequests.staffId,
        user.id
      )
    );
  }

  const [
    attendance,
    movements
  ] = await Promise.all([
    db
      .select({
        record: staffAttendanceRecords,
        staffName: users.name,
        staffRole: users.role,
        recorderName:
          users.name
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
        request: staffMovementRequests,
        staffName: users.name,
        staffRole: users.role
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

  return (
    <>
      <PageHeader
        eyebrow="Verified workforce movement"
        title="Staff attendance and permissions"
        description="Staff cannot mark their own arrival, departure, leaving or return. Security or the selected attendance officer records physical movement, while authorised supervisors decide permission requests."
        action={
          <ExportLink type="staff-attendance"/>
        }
      />

      <FlashMessage
        success={params.success}
        error={params.error}
      />

      {canRecord ? (
        <section className="chalk-board rounded-2xl p-5 text-white shadow-card">
          <h2 className="flex items-center gap-2 font-black">
            <ShieldCheck size={19}/>
            Authorised gate recording
          </h2>

          <p className="mt-2 text-sm text-white/70">
            Select the staff member who is physically present.
            You cannot record your own attendance.
          </p>

          <form
            action={recordStaffGateAction}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_190px_auto]"
          >
            <select
              className="input"
              name="staffId"
              required
            >
              <option value="">
                Select staff member
              </option>

              {staffRows.map((staff) => (
                <option
                  key={staff.id}
                  value={staff.id}
                  disabled={staff.id === user.id}
                >
                  {staff.name} |{' '}
                  {staff.role.replaceAll('_', ' ')}

                  {staff.id === user.id
                    ? ' | another officer must record you'
                    : ''}
                </option>
              ))}
            </select>

            <select
              className="input"
              name="action"
            >
              <option value="ARRIVAL">
                Arrival
              </option>

              <option value="DEPARTURE">
                Closing departure
              </option>
            </select>

            <button className="btn-primary bg-amber-400 text-slate-950 hover:bg-amber-300">
              Record
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your arrival, departure and physical gate movement
          must be recorded by Security or the authorised
          staff attendance officer.
        </section>
      )}

      {STAFF_ROLES.includes(user.role) ? (
        <section className="paper-card mt-6 p-5">
          <h2 className="flex items-center gap-2 font-black">
            <Clock4 size={19}/>
            Request permission to leave
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Approval does not record your departure.
            Security or the authorised officer must record
            when you actually leave and return.
          </p>

          <form
            action={requestStaffMovementAction}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <input
              className="input"
              name="requestedDepartureAt"
              type="datetime-local"
              required
            />

            <input
              className="input"
              name="expectedReturnAt"
              type="datetime-local"
            />

            <textarea
              className="input min-h-24 sm:col-span-2"
              name="reason"
              placeholder="Reason for leaving school"
              required
            />

            <button className="btn-primary sm:col-span-2">
              Submit permission request
            </button>
          </form>
        </section>
      ) : null}

      {canRecord ? (
        <section className="paper-card mt-6 p-5">
          <h2 className="font-black">
            Manual staff register
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Use this for authorised corrections, absence,
            sickness or other official status records.
          </p>

          <form
            action={recordStaffAttendanceAction}
            className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <select
              className="input"
              name="staffId"
              required
            >
              <option value="">
                Select staff member
              </option>

              {staffRows.map((staff) => (
                <option
                  key={staff.id}
                  value={staff.id}
                  disabled={staff.id === user.id}
                >
                  {staff.name} |{' '}
                  {staff.role.replaceAll('_', ' ')}
                </option>
              ))}
            </select>

            <GhanaDateInput
              name="date"
              defaultValue={selected.source}
              required
            />

            <select
              className="input"
              name="status"
            >
              <option>PRESENT</option>
              <option>ABSENT</option>
              <option>LATE</option>
              <option>PARTIAL</option>
              <option>SICK</option>
              <option>EXCUSED</option>
            </select>

            <input
              className="input"
              name="reason"
              placeholder="Reason or note"
            />

            <input
              className="input"
              name="arrivalTime"
              type="time"
            />

            <input
              className="input"
              name="departureTime"
              type="time"
            />

            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                name="lateArrival"
              />
              Late arrival
            </label>

            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                name="earlyDeparture"
              />
              Early departure
            </label>

            <button className="btn-primary sm:col-span-2 xl:col-span-4">
              Save official staff attendance
            </button>
          </form>
        </section>
      ) : null}

      <section className="paper-card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-black">
              Staff register for {selected.source}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {attendance.length} recorded staff member(s)
            </p>
          </div>

          <form className="flex gap-2">
            <GhanaDateInput
              name="date"
              defaultValue={selected.source}
            />

            <button className="btn-secondary">
              Open
            </button>
          </form>
        </div>

        {attendance.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Arrival</th>
                  <th>Departure</th>
                  <th>Flags</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {attendance.map(({
                  record,
                  staffName,
                  staffRole
                }) => (
                  <tr key={record.id}>
                    <td className="font-bold">
                      {staffName}
                    </td>

                    <td>
                      {staffRole.replaceAll('_', ' ')}
                    </td>

                    <td>
                      <span className="status-pill bg-slate-100 text-slate-700">
                        {record.status}
                      </span>
                    </td>

                    <td>
                      {timeText(record.arrivalTime)}
                    </td>

                    <td>
                      {timeText(record.departureTime)}
                    </td>

                    <td className="text-xs">
                      {record.lateArrival
                        ? 'Late arrival '
                        : ''}

                      {record.earlyDeparture
                        ? 'Early departure'
                        : ''}

                      {!record.lateArrival &&
                      !record.earlyDeparture
                        ? '-'
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title="No staff attendance"
              text="Verified arrival and departure records will appear here."
            />
          </div>
        )}
      </section>

      <section className="paper-card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">
            Staff movement requests
          </h2>
        </div>

        {movements.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Request</th>
                  <th>Status</th>
                  <th>Approval or gate action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {movements.map(({
                  request,
                  staffName,
                  staffRole
                }) => (
                  <tr key={request.id}>
                    <td>
                      <b>{staffName}</b>

                      <p className="text-xs text-slate-500">
                        {staffRole.replaceAll('_', ' ')}
                      </p>
                    </td>

                    <td>
                      <p>{request.reason}</p>

                      <p className="text-xs text-slate-500">
                        Requested:{' '}
                        {request.requestedDepartureAt.toLocaleString()}

                        {request.expectedReturnAt
                          ? ` | Expected return: ${request.expectedReturnAt.toLocaleString()}`
                          : ''}
                      </p>

                      {request.actualDepartureAt ? (
                        <p className="mt-1 text-xs font-bold text-blue-700">
                          Actual departure:{' '}
                          {request.actualDepartureAt.toLocaleString()}
                        </p>
                      ) : null}

                      {request.actualReturnAt ? (
                        <p className="mt-1 text-xs font-bold text-emerald-700">
                          Actual return:{' '}
                          {request.actualReturnAt.toLocaleString()}
                        </p>
                      ) : null}
                    </td>

                    <td>
                      <span
                        className={`status-pill ${
                          request.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : request.status === 'RETURNED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : request.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {request.status}
                      </span>

                      {request.decisionReason ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {request.decisionReason}
                        </p>
                      ) : null}
                    </td>

                    <td>
                      {supervisor &&
                      request.status === 'PENDING' ? (
                        <form
                          action={decideStaffMovementAction}
                          className="min-w-72 space-y-2"
                        >
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />

                          <input
                            className="input min-h-9 py-1 text-xs"
                            name="decisionReason"
                            placeholder="Decision note or rejection reason"
                          />

                          <div className="flex gap-2">
                            <button
                              className="btn-primary min-h-9 flex-1 px-2 py-1 text-xs"
                              name="decision"
                              value="APPROVE"
                            >
                              Approve
                            </button>

                            <button
                              className="btn-secondary min-h-9 flex-1 px-2 py-1 text-xs"
                              name="decision"
                              value="REJECT"
                            >
                              Reject
                            </button>
                          </div>
                        </form>
                      ) : canRecord &&
                        request.status === 'APPROVED' &&
                        request.staffId !== user.id &&
                        !request.actualDepartureAt ? (
                        <form action={recordStaffMovementAction}>
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />

                          <button
                            className="btn-primary min-h-9 px-3 py-1 text-xs"
                            name="action"
                            value="LEAVE"
                          >
                            <LogOut size={15}/>
                            Record actual departure
                          </button>
                        </form>
                      ) : canRecord &&
                        request.status === 'APPROVED' &&
                        request.staffId !== user.id &&
                        request.actualDepartureAt &&
                        !request.actualReturnAt ? (
                        <form action={recordStaffMovementAction}>
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />

                          <button
                            className="btn-secondary min-h-9 px-3 py-1 text-xs"
                            name="action"
                            value="RETURN"
                          >
                            <LogIn size={15}/>
                            Record actual return
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-400">
                          No action
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title="No movement requests"
              text="Staff permission requests will appear here."
            />
          </div>
        )}
      </section>
    </>
  );
}
