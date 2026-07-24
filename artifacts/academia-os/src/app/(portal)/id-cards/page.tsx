import Link from 'next/link';
import { and, asc, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { Printer, Search } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { classes, learners, schools, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';
import { IdCard } from '@/components/IdCard';

const STAFF_ROLES = ['SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','TEACHER','ACCOUNTS','TRANSPORT','SECURITY','RECEPTIONIST','LIBRARIAN','CANTEEN','PROPRIETOR'];

export default async function IdCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; classId?: string }>;
}) {
  const user = await requireUser();
  const schoolId = await getActiveSchoolId(user);
  const params = await searchParams;
  const tab = params.tab === 'staff' ? 'staff' : 'learners';
  const query = String(params.q || '').trim();
  const classFilter = params.classId || '';

  // Fetch school
  const school = (await db.select({ name: schools.name, logoUrl: schools.logoUrl })
    .from(schools).where(eq(schools.id, schoolId)).limit(1))[0];

  // ── Learners ──────────────────────────────────────────────────────────────
  const learnerFilter = and(
    eq(learners.schoolId, schoolId),
    eq(learners.status, 'ACTIVE'),
    classFilter ? eq(learners.classId, classFilter) : undefined,
    query
      ? or(
          ilike(learners.firstName, `%${query}%`),
          ilike(learners.lastName, `%${query}%`),
          ilike(learners.admissionNo, `%${query}%`),
        )
      : undefined,
  );
  const learnerRows = await db
    .select({ learner: learners, className: classes.name, stream: classes.stream })
    .from(learners)
    .leftJoin(classes, eq(learners.classId, classes.id))
    .where(learnerFilter)
    .orderBy(asc(classes.name), asc(learners.firstName));

  // ── Staff ─────────────────────────────────────────────────────────────────
  const staffFilter = and(
    eq(users.schoolId, schoolId),
    eq(users.status, 'ACTIVE'),
    inArray(users.role, STAFF_ROLES),
    query
      ? or(ilike(users.name, `%${query}%`), ilike(users.username, `%${query}%`))
      : undefined,
  );
  const staffRows = await db
    .select()
    .from(users)
    .where(staffFilter)
    .orderBy(asc(users.role), asc(users.name));

  // ── Class list for filter ─────────────────────────────────────────────────
  const classRows = await db
    .select({ id: classes.id, name: classes.name, stream: classes.stream })
    .from(classes)
    .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))
    .orderBy(asc(classes.name), asc(classes.stream));

  function roleLabel(role: string) {
    return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const printHref =
    tab === 'staff'
      ? `/id-cards-print?tab=staff${query ? `&q=${encodeURIComponent(query)}` : ''}`
      : `/id-cards-print?tab=learners${classFilter ? `&classId=${classFilter}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`;

  return (
    <>
      <PageHeader
        eyebrow="Identity & access"
        title="ID cards"
        description="Print scannable ID cards for staff and learners. QR codes link to their unique badge or username."
        action={
          <Link href={printHref} target="_blank" className="btn-primary flex items-center gap-2">
            <Printer size={17} />
            Print {tab === 'staff' ? staffRows.length : learnerRows.length} cards
          </Link>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {(['learners', 'staff'] as const).map((t) => (
          <Link
            key={t}
            href={`/id-cards?tab=${t}`}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-black transition ${
              tab === t
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'learners' ? 'Learners' : 'Staff'}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <form method="GET" action="/id-cards" className="flex flex-wrap gap-3">
          <input type="hidden" name="tab" value={tab} />
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder={tab === 'staff' ? 'Search by name or username…' : 'Search by name or admission no…'}
              className="input pl-9 pr-4 text-sm w-72"
            />
          </div>
          {tab === 'learners' && (
            <select name="classId" defaultValue={classFilter} className="input text-sm">
              <option value="">All classes</option>
              {classRows.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.stream ? ` (${c.stream})` : ''}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="btn-primary text-sm px-4 py-2">Filter</button>
          {(query || classFilter) && (
            <Link href={`/id-cards?tab=${tab}`} className="btn-secondary text-sm px-4 py-2">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Card grid preview */}
      {tab === 'learners' ? (
        learnerRows.length === 0 ? (
          <EmptyState title="No learners found" text="Adjust your filters or add learners first." />
        ) : (
          <div className="flex flex-wrap gap-5">
            {learnerRows.map(({ learner, className, stream }) => (
              <IdCard
                key={learner.id}
                type="learner"
                name={`${learner.firstName} ${learner.lastName}`}
                subtitle={className ? `${className}${stream ? ` (${stream})` : ''}` : 'No class assigned'}
                idNumber={learner.admissionNo}
                qrValue={learner.badgeCode}
                photoUrl={learner.photoUrl}
                schoolName={school?.name ?? 'AcademiaOS'}
                schoolLogoUrl={school?.logoUrl}
              />
            ))}
          </div>
        )
      ) : (
        staffRows.length === 0 ? (
          <EmptyState title="No staff found" text="Adjust your search or add staff accounts first." />
        ) : (
          <div className="flex flex-wrap gap-5">
            {staffRows.map((s) => (
              <IdCard
                key={s.id}
                type="staff"
                name={s.name}
                subtitle={roleLabel(s.role)}
                idNumber={s.username}
                qrValue={s.username}
                photoUrl={s.photoUrl}
                schoolName={school?.name ?? 'AcademiaOS'}
                schoolLogoUrl={school?.logoUrl}
              />
            ))}
          </div>
        )
      )}
    </>
  );
}
