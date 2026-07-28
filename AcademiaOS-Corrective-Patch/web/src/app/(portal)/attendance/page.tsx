import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { CalendarCheck2, LockKeyhole, ScanLine } from 'lucide-react';

import {
  recordAttendanceAction,
  requestAttendanceCorrectionAction,
  reviewAttendanceCorrectionAction,
  scanBadgeAction,
  submitAttendanceRegisterAction,
} from "@/app/actions/attendance";

import { CameraBadgeScanner } from '@/components/CameraBadgeScanner';
import { ExportLink } from '@/components/ExportLink';
import { FlashMessage } from '@/components/FlashMessage';
import { GhanaDateInput } from '@/components/GhanaDateInput';
import { PageHeader } from '@/components/PageHeader';

import { db } from '@/db';
import {
  attendanceCorrectionRequests,
  attendanceRecords,
  attendanceRegisters,
  attendanceScans,
  classes,
  learners,
  users,
} from '@/db/schema';

import { visibleLearnerIds } from '@/lib/access';
import { canMarkClassAttendance } from '@/lib/attendance-access';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { canRecordAttendance } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

function parseDate(value?: string) {
  const source =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : new Date().toISOString().slice(0, 10);

  return {
    source,
    date: new Date(`${source}T00:00:00.000Z`),
  };
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    classId?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const schoolId = await getActiveSchoolId(user);
  const params = await searchParams;
  const selected = parseDate(params.date);
  const visibleIds = await visibleLearnerIds(user);

  const classRows = await db
    .select()
    .from(classes)
    .where(
      and(
        eq(classes.schoolId, schoolId),
        eq(classes.isActive, true),
      ),
    )
    .orderBy(asc(classes.name), asc(classes.stream));

  const selectedClass = classRows.find(
    (row) => row.id === params.classId,
  );

  const rows = selectedClass
    ? await db
        .select({
          learner: learners,
          attendance: attendanceRecords,
        })
        .from(learners)
        .leftJoin(
          attendanceRecords,
          and(
            eq(attendanceRecords.learnerId, learners.id),
            eq(attendanceRecords.date, selected.date),
          ),
        )
        .where(
          and(
            eq(learners.schoolId, schoolId),
            eq(learners.status, 'ACTIVE'),
            eq(learners.classId, selectedClass.id),
            visibleIds === null
              ? undefined
              : visibleIds.length
                ? inArray(learners.id, visibleIds)
                : eq(learners.id, '__none__'),
          ),
        )
        .orderBy(asc(learners.firstName), asc(learners.lastName))
    : [];

  const registerRow = selectedClass
    ? (
        await db
          .select({
            register: attendanceRegisters,
            markerName: users.name,
          })
          .from(attendanceRegisters)
          .leftJoin(
            users,
            eq(attendanceRegisters.markedById, users.id),
          )
          .where(
            and(
              eq(attendanceRegisters.schoolId, schoolId),
              eq(attendanceRegisters.classId, selectedClass.id),
              eq(attendanceRegisters.date, selected.date),
            ),
          )
          .limit(1)
      )[0]
    : undefined;

  const pendingCorrections = registerRow?.register.id
    ? await db
        .select({
          request: attendanceCorrectionRequests,
          requesterName: users.name,
          requesterRole: users.role,
        })
        .from(attendanceCorrectionRequests)
        .leftJoin(
          users,
          eq(attendanceCorrectionRequests.requestedById, users.id),
        )
        .where(
          and(
            eq(attendanceCorrectionRequests.schoolId, schoolId),
            eq(attendanceCorrectionRequests.registerId, registerRow.register.id),
            eq(attendanceCorrectionRequests.status, "PENDING"),
          ),
        )
        .orderBy(desc(attendanceCorrectionRequests.createdAt))
    : [];

  const scans = await db
    .select({
      scan: attendanceScans,
      firstName: learners.firstName,
      lastName: learners.lastName,
    })
    .from(attendanceScans)
    .leftJoin(learners, eq(attendanceScans.learnerId, learners.id))
    .where(
      and(
        eq(attendanceScans.schoolId, schoolId),
        visibleIds === null
          ? undefined
          : visibleIds.length
            ? inArray(attendanceScans.learnerId, visibleIds)
            : eq(attendanceScans.id, '__none__'),
      ),
    )
    .orderBy(desc(attendanceScans.scannedAt))
    .limit(10);

  const mayScan = canRecordAttendance(user.role);

  const mayMark = selectedClass
    ? await canMarkClassAttendance({
        role: user.role,
        userId: user.id,
        schoolId,
        classId: selectedClass.id,
      })
    : false;

  const locked = registerRow?.register.status === 'LOCKED';

  const isOfficialClassTeacher =
    Boolean(selectedClass?.classTeacherId) &&
    selectedClass?.classTeacherId === user.id;

  const markedCount = rows.filter(
    ({ attendance }) => Boolean(attendance),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Attendance and scanning"
        title="Daily attendance"
        description="Prepare the class register, review it, then submit and lock the official attendance."
        action={<ExportLink type="attendance" />}
      />

      <FlashMessage
        success={params.success}
        error={params.error}
      />

      <div className="grid gap-6 xl:grid-cols-[370px_1fr]">
        <div className="space-y-6">
          <section className="paper-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-chalk-50 text-chalk-700">
                <CalendarCheck2 size={20} />
              </div>

              <div>
                <h2 className="font-black">Open class register</h2>
                <p className="text-xs text-slate-500">
                  Select the class and attendance date.
                </p>
              </div>
            </div>

            <form className="mt-4 space-y-3">
              <select
                className="input"
                name="classId"
                defaultValue={selectedClass?.id || ''}
                required
              >
                <option value="">Select class</option>

                {classRows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} {row.stream}
                  </option>
                ))}
              </select>

              <GhanaDateInput
                name="date"
                defaultValue={selected.source}
                required
              />

              <button className="btn-secondary w-full">
                Open register
              </button>
            </form>
          </section>

          {mayScan && (
            <section className="paper-card p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <ScanLine size={20} />
                </div>

                <div>
                  <h2 className="font-black">Badge scanner</h2>
                  <p className="text-xs text-slate-500">
                    Entry and exit scanning is separate from the official class register.
                  </p>
                </div>
              </div>

              <form
                action={scanBadgeAction}
                className="mt-4 space-y-3"
              >
                <CameraBadgeScanner
                  name="badgeCode"
                  required
                  autoFocus
                />

                <select className="input" name="action">
                  <option>SCHOOL_ENTRY</option>
                  <option>SCHOOL_EXIT</option>
                  <option>CANTEEN_ACCESS</option>
                  <option>LIBRARY_ACCESS</option>
                </select>

                <input
                  className="input"
                  name="location"
                  placeholder="Location, e.g. Main gate"
                />

                <input
                  type="hidden"
                  name="device"
                  value="Web camera or keyboard"
                />

                <button className="btn-primary w-full">
                  Record scan
                </button>
              </form>
            </section>
          )}

          <section className="paper-card p-5">
            <h2 className="font-black">Recent scans</h2>

            <div className="mt-3 space-y-2">
              {scans.map(({ scan, firstName, lastName }) => (
                <div
                  key={scan.id}
                  className="rounded-xl bg-slate-50 p-3 text-sm"
                >
                  <p className="font-bold">
                    {firstName} {lastName}
                  </p>

                  <p className="text-xs text-slate-500">
                    {scan.action.replaceAll('_', ' ')} •{' '}
                    {formatDateTime(scan.scannedAt)}
                  </p>
                </div>
              ))}

              {!scans.length && (
                <p className="text-sm text-slate-500">
                  No recent badge scans.
                </p>
              )}
            </div>
          </section>
        </div>

        {!selectedClass ? (
          <section className="paper-card p-8">
            <h2 className="text-xl font-black">
              Select a class
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Choose a class and date to open its official attendance register.
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            <section className="paper-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Official class register
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    {selectedClass.name} {selectedClass.stream}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selected.source}
                  </p>
                </div>

                <span
                  className={`status-pill ${
                    locked
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {locked ? 'LOCKED' : 'DRAFT'}
                </span>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <p>
                  Learners marked:{' '}
                  <b>
                    {markedCount}/{rows.length}
                  </b>
                </p>

                <p>
                  Your access:{' '}
                  <b>{mayMark ? 'Attendance marker' : 'View only'}</b>
                </p>

                {locked && (
                  <>
                    <p>
                      Marked by:{' '}
                      <b>
                        {registerRow?.markerName || 'Recorded staff'}
                      </b>
                    </p>

                    <p>
                      Role:{' '}
                      <b>
                        {registerRow?.register.markedByRole.replaceAll(
                          '_',
                          ' ',
                        )}
                      </b>
                    </p>

                    <p>
                      Submitted:{' '}
                      <b>
                        {registerRow?.register.submittedAt
                          ? formatDateTime(
                              registerRow.register.submittedAt,
                            )
                          : '—'}
                      </b>
                    </p>

                    <p>
                      Official Class Teacher:{' '}
                      <b>
                        {registerRow?.register.officialClassTeacherId
                          ? 'Assigned'
                          : 'Not assigned'}
                      </b>
                    </p>

                    {registerRow?.register.substitutionReason && (
                      <p className="sm:col-span-2">
                        Replacement reason:{' '}
                        <b>
                          {registerRow.register.substitutionReason}
                        </b>
                      </p>
                    )}
                  </>
                )}
              </div>

              {mayMark && !locked && (
                <form
                  action={submitAttendanceRegisterAction}
                  className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
                >
                  <input
                    type="hidden"
                    name="classId"
                    value={selectedClass.id}
                  />

                  <input
                    type="hidden"
                    name="date"
                    value={selected.source}
                  />

                  {!isOfficialClassTeacher && (
                    <div>
                      <label className="label">
                        Reason for marking on behalf of the Class Teacher
                      </label>

                      <textarea
                        className="input min-h-24"
                        name="substitutionReason"
                        placeholder="Example: Class Teacher is on sick leave."
                        required
                      />
                    </div>
                  )}

                  <div className="mt-4 flex items-start gap-3">
                    <LockKeyhole
                      size={20}
                      className="mt-0.5 shrink-0 text-amber-800"
                    />

                    <div className="flex-1">
                      <p className="font-black">
                        Submit and lock attendance
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Every active learner must be marked first.
                        Submission locks the register and runs the daily-fee rules.
                      </p>
                    </div>
                  </div>

                  <button className="btn-primary mt-4 w-full">
                    Submit &amp; Lock Class Attendance
                  </button>
                </form>
              )}

              {locked && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
                  <p className="font-black text-rose-900">
                    This register is locked.
                  </p>

                  <p className="mt-1 text-rose-800">
                    Attendance cannot be edited directly after submission.
                    A correction request must be used for any change.
                  </p>
                </div>
              )}
            </section>

            <section className="paper-card overflow-hidden">
              <div className="border-b border-slate-200 p-4">
                <h2 className="font-black">
                  Class register for {selected.source}
                </h2>

                <p className="text-xs text-slate-500">
                  Daily fees are processed only after the complete class register is submitted and locked.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Status</th>
                      <th>Check-in</th>
                      <th>
                        {mayMark && !locked
                          ? 'Draft attendance'
                          : 'Reason'}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map(({ learner, attendance }) => (
                      <tr key={learner.id}>
                        <td>
                          <p className="font-black">
                            {learner.firstName} {learner.lastName}
                          </p>

                          <p className="text-xs text-slate-500">
                            {learner.admissionNo}
                          </p>
                        </td>

                        <td>
                          <span
                            className={`status-pill ${
                              attendance?.status === 'ABSENT'
                                ? 'bg-rose-100 text-rose-800'
                                : attendance
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {attendance?.status || 'NOT MARKED'}
                          </span>
                        </td>

                        <td>
                          {attendance?.checkInTime?.toLocaleTimeString(
                            'en-GH',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          ) || '—'}
                        </td>

                        <td>
                          {mayMark && !locked ? (
                            <form
                              action={recordAttendanceAction}
                              className="flex min-w-[390px] gap-2"
                            >
                              <input
                                type="hidden"
                                name="learnerId"
                                value={learner.id}
                              />

                              <input
                                type="hidden"
                                name="date"
                                value={selected.source}
                              />

                              <select
                                className="input min-h-9 py-1 text-xs"
                                name="status"
                                defaultValue={
                                  attendance?.status || 'PRESENT'
                                }
                              >
                                <option>PRESENT</option>
                                <option>ABSENT</option>
                                <option>LATE</option>
                                <option>EXCUSED</option>
                                <option>SICK</option>
                                <option>PARTIAL</option>
                                <option>HALF_DAY_MORNING</option>
                                <option>HALF_DAY_AFTERNOON</option>
                                <option>SCHOOL_ACTIVITY</option>
                                <option>SUSPENDED</option>
                                <option>HOLIDAY</option>
                              </select>

                              <input
                                className="input min-h-9 py-1 text-xs"
                                name="reason"
                                defaultValue={attendance?.reason || ''}
                                placeholder="Reason"
                              />

                              <button className="btn-secondary min-h-9 px-3 py-1 text-xs">
                                Save Draft
                              </button>
                            </form>
                          ) : (
                            <div className="text-sm">
                              <p>{attendance?.reason || '—'}</p>

                              {locked && (
                                <p className="mt-1 text-xs font-bold text-rose-700">
                                  Locked
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}

                    {!rows.length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-sm text-slate-500"
                        >
                          No active learners are available for this class.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

              {locked && (
                <section className="paper-card p-4">
                  <h2 className="font-black">Attendance correction requests</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Locked attendance cannot be edited directly. Submit a correction request for any change.
                  </p>

                  {mayMark && (
                    <div className="mt-4 space-y-4">
                      {rows.map(({ learner, attendance }) => {
                        if (!attendance) return null;

                        const pending = pendingCorrections.find(
                          ({ request }) => request.attendanceRecordId === attendance.id,
                        );

                        return (
                          <div key={attendance.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-black">
                                  {learner.firstName} {learner.lastName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Official status: {attendance.status.replaceAll("_", " ")}
                                </p>
                              </div>

                              {pending && (
                                <span className="status-pill bg-amber-100 text-amber-800">
                                  Correction pending
                                </span>
                              )}
                            </div>

                            {pending ? (
                              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                                <p className="font-bold">
                                  Requested: {pending.request.originalStatus.replaceAll("_", " ")} → {pending.request.requestedStatus.replaceAll("_", " ")}
                                </p>
                                <p className="mt-1">{pending.request.reason}</p>
                              </div>
                            ) : (
                              <form action={requestAttendanceCorrectionAction} className="grid gap-3 md:grid-cols-2">
                                <input type="hidden" name="attendanceRecordId" value={attendance.id} />

                                <div>
                                  <label className="label">Corrected status</label>
                                  <select className="input" name="requestedStatus" defaultValue="" required>
                                    <option value="" disabled>Select status</option>
                                    <option value="PRESENT">PRESENT</option>
                                    <option value="ABSENT">ABSENT</option>
                                    <option value="LATE">LATE</option>
                                    <option value="EXCUSED">EXCUSED</option>
                                    <option value="SICK">SICK</option>
                                    <option value="PARTIAL">PARTIAL</option>
                                    <option value="HALF_DAY_MORNING">HALF DAY MORNING</option>
                                    <option value="HALF_DAY_AFTERNOON">HALF DAY AFTERNOON</option>
                                    <option value="SCHOOL_ACTIVITY">SCHOOL ACTIVITY</option>
                                    <option value="SUSPENDED">SUSPENDED</option>
                                    <option value="HOLIDAY">HOLIDAY</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="label">Corrected attendance reason</label>
                                  <input
                                    className="input"
                                    name="requestedAttendanceReason"
                                    placeholder="Optional"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="label">Why is this correction needed?</label>
                                  <textarea
                                    className="input min-h-24"
                                    name="correctionReason"
                                    minLength={10}
                                    required
                                    placeholder="Explain the attendance mistake in detail."
                                  />
                                </div>

                                <button className="btn-primary md:col-span-2">
                                  Submit Correction Request
                                </button>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="font-black">Pending review</h3>

                    {!pendingCorrections.length ? (
                      <p className="mt-2 text-sm text-slate-500">
                        No correction requests are waiting for review.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {pendingCorrections.map(({ request, requesterName, requesterRole }) => {
                          const learnerRow = rows.find(
                            ({ attendance }) => attendance?.id === request.attendanceRecordId,
                          );

                          const requiresSuperAdmin =
                            registerRow?.register.markedByRole === "PROPRIETOR" ||
                            registerRow?.register.markedByRole === "SUPER_ADMIN" ||
                            requesterRole === "PROPRIETOR";

                          const canReview =
                            user.role === "SUPER_ADMIN" ||
                            (user.role === "PROPRIETOR" &&
                              !requiresSuperAdmin &&
                              request.requestedById !== user.id);

                          return (
                            <div key={request.id} className="rounded-xl border border-slate-200 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-black">
                                    {learnerRow
                                      ? learnerRow.learner.firstName + " " + learnerRow.learner.lastName
                                      : "Attendance record"}
                                  </p>
                                  <p className="mt-1 text-sm">
                                    {request.originalStatus.replaceAll("_", " ")} →{" "}
                                    <b>{request.requestedStatus.replaceAll("_", " ")}</b>
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Requested by {requesterName || "Unknown user"} · {formatDateTime(request.createdAt)}
                                  </p>
                                </div>

                                <span className="status-pill bg-amber-100 text-amber-800">
                                  {requiresSuperAdmin
                                    ? "SUPER_ADMIN review required"
                                    : "Proprietor review required"}
                                </span>
                              </div>

                              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                                <p><b>Correction reason:</b> {request.reason}</p>
                                {request.requestedAttendanceReason && (
                                  <p className="mt-1">
                                    <b>New attendance reason:</b>{" "}
                                    {request.requestedAttendanceReason}
                                  </p>
                                )}
                              </div>

                              {canReview && (
                                <form action={reviewAttendanceCorrectionAction} className="mt-3">
                                  <input type="hidden" name="requestId" value={request.id} />

                                  <label className="label">Review note</label>
                                  <textarea
                                    className="input min-h-20"
                                    name="decisionReason"
                                    placeholder="Required when rejecting. Optional when approving."
                                  />

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button className="btn-primary" name="decision" value="APPROVE">
                                      Approve Correction
                                    </button>
                                    <button className="btn-secondary" name="decision" value="REJECT">
                                      Reject Correction
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              )}
          </div>
        )}
      </div>
    </>
  );
}
