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
  // Platform owner is never restricted by a school's delegated switch.
  if (role === 'SUPER_ADMIN') return true;

  // Only these two school roles can receive delegated creation authority.
  if (role !== 'SCHOOL_ADMIN' && role !== 'PROPRIETOR') {
    return false;
  }

  // The school must currently have an ACTIVE Premium subscription.
  const subscription = (await db
    .select({ id: schoolSubscriptions.id })
    .from(schoolSubscriptions)
    .innerJoin(
      packages,
      eq(schoolSubscriptions.packageId, packages.id)
    )
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

  // Missing row or locked row always means denied.
  if (!control?.userAdmissionEnabled) return false;

  if (role === 'SCHOOL_ADMIN') {
    return capability === 'learners'
      ? control.allowSchoolAdminLearners
      : control.allowSchoolAdminStaff;
  }

  return capability === 'learners'
    ? control.allowProprietorLearners
    : control.allowProprietorStaff;
}
