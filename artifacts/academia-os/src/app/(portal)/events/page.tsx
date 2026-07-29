import {
  asc,
  eq
} from 'drizzle-orm';
import {
  CalendarDays,
  Clock3,
  MapPin,
  Megaphone,
  XCircle
} from 'lucide-react';
import {
  redirect
} from 'next/navigation';
import {
  cancelSchoolEventAction,
  createSchoolEventAction,
  publishSchoolEventAction
} from '@/app/actions/events';
import {
  EmptyState
} from '@/components/EmptyState';
import {
  FlashMessage
} from '@/components/FlashMessage';
import {
  PageHeader
} from '@/components/PageHeader';
import {
  db
} from '@/db';
import {
  schoolEvents
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
  title: 'Events and PTA meetings'
};

export const dynamic = 'force-dynamic';

const typeLabels: Record<string, string> = {
  SCHOOL_EVENT: 'School event',
  PTA_MEETING: 'PTA meeting',
  STAFF_MEETING: 'Staff meeting',
  ACADEMIC_EVENT: 'Academic event',
  HOLIDAY: 'Holiday',
  OTHER: 'Other'
};

const audienceLabels: Record<string, string> = {
  ALL: 'Parents and staff',
  PARENTS: 'Parents and guardians',
  STAFF: 'School staff'
};

function statusClass(status: string) {
  if (status === 'PUBLISHED') {
    return 'bg-emerald-100 text-emerald-800';
  }

  if (status === 'CANCELLED') {
    return 'bg-rose-100 text-rose-800';
  }

  return 'bg-amber-100 text-amber-800';
}

function dateText(value: Date) {
  return value.toLocaleString('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra'
  });
}

export default async function EventsPage({
  searchParams
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();

  if (!canAccess(user.role, 'events')) {
    redirect('/dashboard');
  }

  const schoolId =
    await getActiveSchoolId(user);

  const params = await searchParams;

  const rows = await db
    .select()
    .from(schoolEvents)
    .where(eq(
      schoolEvents.schoolId,
      schoolId
    ))
    .orderBy(asc(schoolEvents.startsAt));

  const now = new Date();

  const upcoming = rows.filter(
    (row) =>
      row.startsAt >= now &&
      row.status !== 'CANCELLED'
  );

  const other = rows.filter(
    (row) => !upcoming.includes(row)
  );

  return (
    <>
      <PageHeader
        eyebrow="School calendar"
        title="Events and PTA meetings"
        description="Prepare, publish and cancel school events, PTA meetings, staff meetings, holidays and academic activities."
      />

      <FlashMessage
        success={params.success}
        error={params.error}
      />

      <section className="paper-card p-5">
        <h2 className="flex items-center gap-2 font-black">
          <CalendarDays size={19} />
          Create an event
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          New events are saved as drafts. Publish
          the event when the information is ready.
        </p>

        <form
          action={createSchoolEventAction}
          className="mt-5 grid gap-3 md:grid-cols-2"
        >
          <input
            className="input md:col-span-2"
            name="title"
            placeholder="Event or meeting title"
            required
          />

          <select
            className="input"
            name="eventType"
            defaultValue="SCHOOL_EVENT"
          >
            <option value="SCHOOL_EVENT">
              School event
            </option>

            <option value="PTA_MEETING">
              PTA meeting
            </option>

            <option value="STAFF_MEETING">
              Staff meeting
            </option>

            <option value="ACADEMIC_EVENT">
              Academic event
            </option>

            <option value="HOLIDAY">
              Holiday
            </option>

            <option value="OTHER">
              Other
            </option>
          </select>

          <select
            className="input"
            name="audience"
            defaultValue="ALL"
          >
            <option value="ALL">
              Parents and staff
            </option>

            <option value="PARENTS">
              Parents and guardians
            </option>

            <option value="STAFF">
              School staff
            </option>
          </select>

          <label className="space-y-1">
            <span className="text-xs font-black uppercase text-slate-500">
              Starting date and time
            </span>

            <input
              className="input"
              name="startsAt"
              type="datetime-local"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-black uppercase text-slate-500">
              Ending date and time
            </span>

            <input
              className="input"
              name="endsAt"
              type="datetime-local"
            />
          </label>

          <input
            className="input md:col-span-2"
            name="venue"
            placeholder="Venue or online meeting details"
          />

          <textarea
            className="input min-h-28 md:col-span-2"
            name="description"
            placeholder="Description, agenda or instructions"
          />

          <button className="btn-primary md:col-span-2">
            Save event as draft
          </button>
        </form>
      </section>

      <EventSection
        title="Upcoming events"
        rows={upcoming}
      />

      <EventSection
        title="Past, cancelled and draft events"
        rows={other}
      />
    </>
  );
}

function EventSection({
  title,
  rows
}: {
  title: string;
  rows: typeof schoolEvents.$inferSelect[];
}) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-black">
        {title}
      </h2>

      {!rows.length ? (
        <div className="paper-card mt-3 p-5">
          <EmptyState
            title="No events"
            text="Events in this category will appear here."
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          {rows.map((event) => (
            <article
              key={event.id}
              className="paper-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    {typeLabels[event.eventType] ||
                      event.eventType}
                  </p>

                  <h3 className="mt-1 text-lg font-black">
                    {event.title}
                  </h3>
                </div>

                <span
                  className={`status-pill ${statusClass(
                    event.status
                  )}`}
                >
                  {event.status.toLowerCase()}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Clock3 size={16} />
                  {dateText(event.startsAt)}

                  {event.endsAt
                    ? ` to ${dateText(event.endsAt)}`
                    : ''}
                </p>

                {event.venue ? (
                  <p className="flex items-center gap-2">
                    <MapPin size={16} />
                    {event.venue}
                  </p>
                ) : null}

                <p>
                  Audience:{' '}
                  <strong>
                    {audienceLabels[event.audience] ||
                      event.audience}
                  </strong>
                </p>
              </div>

              {event.description ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {event.description}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                {event.status === 'DRAFT' ? (
                  <form
                    action={publishSchoolEventAction}
                  >
                    <input
                      type="hidden"
                      name="eventId"
                      value={event.id}
                    />

                    <button className="btn-primary">
                      <Megaphone size={16} />
                      Publish
                    </button>
                  </form>
                ) : null}

                {event.status !== 'CANCELLED' ? (
                  <form
                    action={cancelSchoolEventAction}
                  >
                    <input
                      type="hidden"
                      name="eventId"
                      value={event.id}
                    />

                    <button className="btn-secondary text-rose-700">
                      <XCircle size={16} />
                      Cancel
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
