'use server';

import {
  and,
  eq
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
  schoolEvents,
  users
} from '@/db/schema';
import {
  audit,
  requireUser
} from '@/lib/auth';
import {
  getActiveSchoolId
} from '@/lib/tenant';

const MANAGER_ROLES = new Set([
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'ACADEMIC_ADMIN'
]);

const EVENT_TYPES = new Set([
  'SCHOOL_EVENT',
  'PTA_MEETING',
  'STAFF_MEETING',
  'ACADEMIC_EVENT',
  'HOLIDAY',
  'OTHER'
]);

const AUDIENCES = new Set([
  'ALL',
  'PARENTS',
  'STAFF'
]);

function requireManager(role: string) {
  if (!MANAGER_ROLES.has(role)) {
    redirect(
      '/events?error=Permission+denied'
    );
  }
}

function eventDateText(value: Date) {
  return value.toLocaleString('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra'
  });
}

async function audienceRecipients(
  schoolId: string,
  audience: string
) {
  const rows = await db
    .select({
      id: users.id,
      role: users.role
    })
    .from(users)
    .where(and(
      eq(users.schoolId, schoolId),
      eq(users.status, 'ACTIVE')
    ));

  return rows
    .filter((row) => {
      if (row.role === 'LEARNER') {
        return false;
      }

      if (audience === 'PARENTS') {
        return row.role === 'PARENT';
      }

      if (audience === 'STAFF') {
        return row.role !== 'PARENT';
      }

      return true;
    })
    .map((row) => row.id);
}

async function notifyEventAudience(input: {
  schoolId: string;
  audience: string;
  title: string;
  body: string;
}) {
  const recipientIds =
    await audienceRecipients(
      input.schoolId,
      input.audience
    );

  if (!recipientIds.length) {
    return 0;
  }

  await db.insert(notifications).values(
    recipientIds.map((userId) => ({
      schoolId: input.schoolId,
      userId,
      type: 'EVENT',
      title: input.title,
      body: input.body,
      link: '/events'
    }))
  );

  return recipientIds.length;
}

export async function createSchoolEventAction(
  formData: FormData
) {
  const user = await requireUser();
  requireManager(user.role);

  const schoolId =
    await getActiveSchoolId(user);

  const title = String(
    formData.get('title') || ''
  ).trim();

  const description = String(
    formData.get('description') || ''
  ).trim();

  const eventType = String(
    formData.get('eventType') ||
    'SCHOOL_EVENT'
  );

  const audience = String(
    formData.get('audience') || 'ALL'
  );

  const venue = String(
    formData.get('venue') || ''
  ).trim();

  const startsAt = new Date(
    String(formData.get('startsAt') || '')
  );

  const endValue = String(
    formData.get('endsAt') || ''
  );

  const endsAt = endValue
    ? new Date(endValue)
    : null;

  if (
    !title ||
    Number.isNaN(startsAt.getTime()) ||
    !EVENT_TYPES.has(eventType) ||
    !AUDIENCES.has(audience)
  ) {
    redirect(
      '/events?error=Enter+valid+event+details'
    );
  }

  if (
    endsAt &&
    (
      Number.isNaN(endsAt.getTime()) ||
      endsAt < startsAt
    )
  ) {
    redirect(
      '/events?error=The+ending+time+must+be+after+the+starting+time'
    );
  }

  const [created] = await db
    .insert(schoolEvents)
    .values({
      schoolId,
      createdById: user.id,
      title,
      description: description || null,
      eventType,
      audience,
      venue: venue || null,
      startsAt,
      endsAt,
      status: 'DRAFT'
    })
    .returning({
      id: schoolEvents.id
    });

  await audit({
    schoolId,
    userId: user.id,
    action: 'SCHOOL_EVENT_CREATED',
    entityType: 'SchoolEvent',
    entityId: created.id,
    newValue: {
      title,
      eventType,
      audience,
      startsAt
    }
  });

  revalidatePath('/events');

  redirect(
    '/events?success=Event+saved+as+a+draft'
  );
}

export async function publishSchoolEventAction(
  formData: FormData
) {
  const user = await requireUser();
  requireManager(user.role);

  const schoolId =
    await getActiveSchoolId(user);

  const eventId = String(
    formData.get('eventId') || ''
  );

  const event = (
    await db
      .select()
      .from(schoolEvents)
      .where(and(
        eq(schoolEvents.id, eventId),
        eq(schoolEvents.schoolId, schoolId)
      ))
      .limit(1)
  )[0];

  if (!event) {
    redirect(
      '/events?error=Event+not+found'
    );
  }

  if (event.status === 'CANCELLED') {
    redirect(
      '/events?error=A+cancelled+event+cannot+be+published'
    );
  }

  if (event.status === 'PUBLISHED') {
    redirect(
      '/events?success=Event+is+already+published'
    );
  }

  const now = new Date();

  await db
    .update(schoolEvents)
    .set({
      status: 'PUBLISHED',
      publishedById: user.id,
      publishedAt: now,
      cancelledAt: null,
      updatedAt: now
    })
    .where(eq(schoolEvents.id, event.id));

  const recipientCount =
    await notifyEventAudience({
      schoolId,
      audience: event.audience,
      title: event.title,
      body: [
        event.eventType === 'PTA_MEETING'
          ? 'PTA meeting'
          : 'School event',
        eventDateText(event.startsAt),
        event.venue
          ? `Venue: ${event.venue}`
          : null
      ]
        .filter(Boolean)
        .join(' · ')
    });

  await audit({
    schoolId,
    userId: user.id,
    action: 'SCHOOL_EVENT_PUBLISHED',
    entityType: 'SchoolEvent',
    entityId: event.id,
    newValue: {
      audience: event.audience,
      recipientCount
    }
  });

  revalidatePath('/events');

  redirect(
    `/events?success=${recipientCount}+notification(s)+sent`
  );
}

export async function cancelSchoolEventAction(
  formData: FormData
) {
  const user = await requireUser();
  requireManager(user.role);

  const schoolId =
    await getActiveSchoolId(user);

  const eventId = String(
    formData.get('eventId') || ''
  );

  const event = (
    await db
      .select()
      .from(schoolEvents)
      .where(and(
        eq(schoolEvents.id, eventId),
        eq(schoolEvents.schoolId, schoolId)
      ))
      .limit(1)
  )[0];

  if (!event) {
    redirect(
      '/events?error=Event+not+found'
    );
  }

  if (event.status === 'CANCELLED') {
    redirect(
      '/events?success=Event+is+already+cancelled'
    );
  }

  const wasPublished =
    event.status === 'PUBLISHED';

  const now = new Date();

  await db
    .update(schoolEvents)
    .set({
      status: 'CANCELLED',
      cancelledAt: now,
      updatedAt: now
    })
    .where(eq(schoolEvents.id, event.id));

  let recipientCount = 0;

  if (wasPublished) {
    recipientCount =
      await notifyEventAudience({
        schoolId,
        audience: event.audience,
        title: `Cancelled: ${event.title}`,
        body: `The event scheduled for ${eventDateText(
          event.startsAt
        )} has been cancelled.`
      });
  }

  await audit({
    schoolId,
    userId: user.id,
    action: 'SCHOOL_EVENT_CANCELLED',
    entityType: 'SchoolEvent',
    entityId: event.id,
    newValue: {
      wasPublished,
      recipientCount
    }
  });

  revalidatePath('/events');

  redirect(
    '/events?success=Event+cancelled'
  );
}
