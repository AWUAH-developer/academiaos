import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm';
import { PrintButton } from '@/components/PrintButton';
import { IdCard } from '@/components/IdCard';
import { db } from '@/db';
import { classes, learners, schools, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getActiveSchoolId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = [
  'SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','TEACHER','ACCOUNTS',
  'TRANSPORT','SECURITY','RECEPTIONIST','LIBRARIAN','CANTEEN','PROPRIETOR',
];

export default async function IdCardsPrintPage({
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

  const school = (
    await db.select({ name: schools.name, logoUrl: schools.logoUrl })
      .from(schools).where(eq(schools.id, schoolId)).limit(1)
  )[0];

  function roleLabel(r: string) {
    return r.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  type CardData = {
    id: string;
    type: 'staff' | 'learner';
    name: string;
    subtitle: string;
    idNumber: string;
    qrValue: string;
    photoUrl?: string | null;
  };

  let cards: CardData[] = [];

  if (tab === 'staff') {
    const rows = await db.select().from(users).where(
      and(
        eq(users.schoolId, schoolId),
        eq(users.status, 'ACTIVE'),
        inArray(users.role, STAFF_ROLES),
        query ? or(ilike(users.name, `%${query}%`), ilike(users.username, `%${query}%`)) : undefined,
      ),
    ).orderBy(asc(users.role), asc(users.name));

    cards = rows.map((s) => ({
      id: s.id,
      type: 'staff',
      name: s.name,
      subtitle: roleLabel(s.role),
      idNumber: s.username,
      qrValue: s.username,
      photoUrl: s.photoUrl,
    }));
  } else {
    const rows = await db
      .select({ learner: learners, className: classes.name, stream: classes.stream })
      .from(learners)
      .leftJoin(classes, eq(learners.classId, classes.id))
      .where(
        and(
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
        ),
      )
      .orderBy(asc(classes.name), asc(learners.firstName));

    cards = rows.map(({ learner, className, stream }) => ({
      id: learner.id,
      type: 'learner',
      name: `${learner.firstName} ${learner.lastName}`,
      subtitle: className ? `${className}${stream ? ` (${stream})` : ''}` : 'No class assigned',
      idNumber: learner.admissionNo,
      qrValue: learner.badgeCode,
      photoUrl: learner.photoUrl,
    }));
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-slate-900 px-6 py-3 shadow-lg">
        <div className="text-sm font-black text-white">
          {cards.length} {tab === 'staff' ? 'staff' : 'learner'} ID card{cards.length !== 1 ? 's' : ''}
          {school ? ` — ${school.name}` : ''}
        </div>
        <div className="flex items-center gap-3">
          <a href="/id-cards" className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/10">
            ← Back
          </a>
          <PrintButton />
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <p className="text-lg font-bold">No cards to print. Adjust your filters.</p>
        </div>
      ) : (
        <>
          {/* Print hint */}
          <p className="print:hidden px-6 py-3 text-xs text-slate-500">
            Cards print 2 per row on A4. Use browser Print → Save as PDF for digital distribution.
          </p>

          {/* Card grid */}
          <div className="flex flex-wrap gap-5 p-6 print:gap-4 print:p-0">
            {cards.map((c) => (
              <div key={c.id} style={{ breakInside: 'avoid' }}>
                <IdCard
                  type={c.type}
                  name={c.name}
                  subtitle={c.subtitle}
                  idNumber={c.idNumber}
                  qrValue={c.qrValue}
                  photoUrl={c.photoUrl}
                  schoolName={school?.name ?? 'AcademiaOS'}
                  schoolLogoUrl={school?.logoUrl}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
