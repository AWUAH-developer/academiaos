import Image from 'next/image';
import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { updateUserStatusAction } from '@/app/actions/users';
import { FlashMessage } from '@/components/FlashMessage';
import { PageHeader } from '@/components/PageHeader';
import { PasswordResetControl } from '@/components/PasswordResetControl';
import { db } from '@/db';
import { guardians, learnerGuardians, learners, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { canManageUsers, canViewUsers } from '@/lib/permissions';
import { getActiveSchoolId } from '@/lib/tenant';

type LinkedLearner = {
  id: string;
  name: string;
  admissionNo: string;
  relationship: string;
  isPrimary: boolean;
};

type GuardianGroup = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  accountId: string | null;
  username: string | null;
  accountStatus: string | null;
  photoUrl: string | null;
  learners: LinkedLearner[];
};

export default async function GuardiansPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const actor = await requireUser();

  if (!canViewUsers(actor.role)) {
    return <div className="paper-card p-8">Access denied.</div>;
  }

  const params = await searchParams;
  const schoolId = await getActiveSchoolId(actor);
  const mayManage = canManageUsers(actor.role);

  const rows = await db
    .select({
      guardianId: guardians.id,
      guardianName: guardians.name,
      guardianPhone: guardians.phone,
      guardianEmail: guardians.email,

      accountId: users.id,
      username: users.username,
      accountStatus: users.status,
      photoUrl: users.photoUrl,

      learnerId: learners.id,
      learnerFirstName: learners.firstName,
      learnerLastName: learners.lastName,
      admissionNo: learners.admissionNo,

      relationship: learnerGuardians.relationship,
      isPrimary: learnerGuardians.isPrimary,
    })
    .from(guardians)
    .leftJoin(users, eq(guardians.userId, users.id))
    .leftJoin(
      learnerGuardians,
      eq(learnerGuardians.guardianId, guardians.id)
    )
    .leftJoin(
      learners,
      and(
        eq(learners.id, learnerGuardians.learnerId),
        eq(learners.schoolId, schoolId)
      )
    )
    .where(eq(guardians.schoolId, schoolId))
    .orderBy(
      asc(guardians.name),
      asc(learners.firstName),
      asc(learners.lastName)
    );

  const grouped = new Map<string, GuardianGroup>();

  for (const row of rows) {
    let entry = grouped.get(row.guardianId);

    if (!entry) {
      entry = {
        id: row.guardianId,
        name: row.guardianName,
        phone: row.guardianPhone,
        email: row.guardianEmail,
        accountId: row.accountId,
        username: row.username,
        accountStatus: row.accountStatus,
        photoUrl: row.photoUrl,
        learners: [],
      };

      grouped.set(row.guardianId, entry);
    }

    if (
      row.learnerId &&
      row.learnerFirstName &&
      row.learnerLastName &&
      row.admissionNo &&
      !entry.learners.some((learner) => learner.id === row.learnerId)
    ) {
      entry.learners.push({
        id: row.learnerId,
        name: row.learnerFirstName + ' ' + row.learnerLastName,
        admissionNo: row.admissionNo,
        relationship: row.relationship || 'Guardian',
        isPrimary: Boolean(row.isPrimary),
      });
    }
  }

  const guardianRows = Array.from(grouped.values());

  return (
    <>
      <PageHeader
        eyebrow="Family access"
        title="Parents and guardians"
        description="Manage guardian contacts, linked learners and parent portal accounts. Parent accounts can only be created from a learner's verified guardian record."
      />

      <FlashMessage success={params.success} error={params.error} />

      <section className="paper-card overflow-hidden">
        {guardianRows.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parent or guardian</th>
                  <th>Contact</th>
                  <th>Linked learners</th>
                  <th>Portal account</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {guardianRows.map((guardian) => (
                  <tr key={guardian.id}>
                    <td>
                      <div className="flex min-w-56 items-center gap-3">
                        <Image
                          src={guardian.photoUrl || '/icon.svg'}
                          alt={guardian.name + ' profile'}
                          width={52}
                          height={52}
                          unoptimized
                          className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
                        />

                        <div>
                          <p className="font-black">{guardian.name}</p>

                          {guardian.username ? (
                            <p className="text-xs text-slate-500">
                              @{guardian.username}
                            </p>
                          ) : (
                            <p className="text-xs font-bold text-amber-700">
                              Portal account not created
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <p className="text-sm font-bold">
                        {guardian.phone || 'No mobile number'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {guardian.email || 'No email address'}
                      </p>
                    </td>

                    <td>
                      <div className="min-w-64 space-y-2">
                        {guardian.learners.length ? (
                          guardian.learners.map((learner) => (
                            <Link
                              key={learner.id}
                              href={'/learners/' + learner.id}
                              className="block rounded-lg bg-slate-50 px-3 py-2 text-xs hover:bg-slate-100"
                            >
                              <span className="font-black">
                                {learner.name}
                              </span>
                              <span className="ml-2 text-slate-500">
                                {learner.admissionNo}
                              </span>
                              <span className="mt-1 block text-slate-500">
                                {learner.relationship}
                                {learner.isPrimary ? ' · Primary contact' : ''}
                              </span>
                            </Link>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">
                            No learner linked
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      {guardian.accountId && guardian.accountStatus ? (
                        <span
                          className={
                            guardian.accountStatus === 'ACTIVE'
                              ? 'status-pill bg-emerald-100 text-emerald-800'
                              : 'status-pill bg-rose-100 text-rose-800'
                          }
                        >
                          {guardian.accountStatus}
                        </span>
                      ) : (
                        <span className="status-pill bg-amber-100 text-amber-800">
                          NOT CREATED
                        </span>
                      )}
                    </td>

                    <td>
                      {guardian.accountId ? (
                        <div className="flex min-w-64 flex-wrap gap-2">
                          {mayManage && (
                            <form action={updateUserStatusAction}>
                              <input
                                type="hidden"
                                name="userId"
                                value={guardian.accountId}
                              />
                              <input
                                type="hidden"
                                name="status"
                                value={
                                  guardian.accountStatus === 'ACTIVE'
                                    ? 'SUSPENDED'
                                    : 'ACTIVE'
                                }
                              />
                              <input
                                type="hidden"
                                name="returnTo"
                                value="/guardians"
                              />

                              <button className="btn-secondary min-h-9 px-3 py-1.5 text-xs">
                                {guardian.accountStatus === 'ACTIVE'
                                  ? 'Suspend'
                                  : 'Activate'}
                              </button>
                            </form>
                          )}

                          {actor.role === 'SUPER_ADMIN' && (
                            <PasswordResetControl
                              userId={guardian.accountId}
                            />
                          )}
                        </div>
                      ) : guardian.learners[0] ? (
                        <Link
                          href={'/learners/' + guardian.learners[0].id}
                          className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                        >
                          Create from learner profile
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Link a learner first
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            No parents or guardians have been added to this school.
          </div>
        )}
      </section>
    </>
  );
}
