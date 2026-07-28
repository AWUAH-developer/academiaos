import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  packages,
  schoolManagementControls,
  schoolSubscriptions,
} from '@/db/schema';
import type { UserRole } from '@/lib/types';

export type UserAdmissionCapability = 'learners' | 'staff';

export async function canCreateUserAdmissionRecord(
  role: UserRole,
  schoolId: string,
  capability: UserAdmissionCapability
): Promise<boolean> {
  // Platform owner can always create records in the selected school workspace.
  if (role === 'SUPER_ADMIN') return true;

  // Creation authority can be delegated only to the School Administrator.
  // Proprietors and all other roles remain view/approval only.
  if (role !== 'SCHOOL_ADMIN') return false;

  // The school must have an active Premium subscription before delegation applies.
  const subscription = (await db
    .select({ id: schoolSubscriptions.id })
    .from(schoolSubscriptions)
    .innerJoin(packages, eq(schoolSubscriptions.packageId, packages.id))
    .where(
      and(
        eq(schoolSubscriptions.schoolId, schoolId),
        eq(schoolSubscriptions.status, 'ACTIVE'),
        eq(packages.name, 'Premium')
      )
    )
    .orderBy(desc(schoolSubscriptions.createdAt))
    .limit(1))[0];

  if (!subscription) return false;

  const control = (await db
    .select()
    .from(schoolManagementControls)
    .where(eq(schoolManagementControls.schoolId, schoolId))
    .limit(1))[0];

  if (!control?.userAdmissionEnabled) return false;

  return capability === 'learners'
    ? control.allowSchoolAdminLearners
    : control.allowSchoolAdminStaff;
}
