import type { UserRole } from '@/lib/types';

export const navigationByRole: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['dashboard','schools','users','setup','learners','attendance','staff-attendance','fees','academics','homework','approvals','reports','transport','messages','helpdesk','audit','id-cards'],
  SCHOOL_ADMIN: ['dashboard','users','setup','learners','attendance','staff-attendance','fees','academics','homework','approvals','reports','transport','messages','helpdesk','audit','id-cards'],
  PROPRIETOR: ['dashboard','staff-attendance','learners','academics','homework','approvals','reports','messages','helpdesk','audit'],
  HEADTEACHER: ['dashboard','setup','learners','attendance','staff-attendance','academics','homework','approvals','reports','messages','helpdesk','id-cards'],
  ACADEMIC_ADMIN: ['dashboard','setup','learners','attendance','staff-attendance','academics','homework','approvals','reports','messages','helpdesk','id-cards'],
  TEACHER: ['dashboard','learners','attendance','academics','homework','reports','messages','helpdesk'],
  ACCOUNTS: ['dashboard','staff-attendance','learners','fees','reports','messages','helpdesk'],
  TRANSPORT: ['dashboard','learners','attendance','staff-attendance','transport','messages','helpdesk'],
  SECURITY: ['dashboard','attendance','staff-attendance','transport','helpdesk'],
  RECEPTIONIST: ['dashboard','learners','attendance','staff-attendance','messages','helpdesk','id-cards'],
  LIBRARIAN: ['dashboard','staff-attendance','learners','messages','helpdesk'],
  CANTEEN: ['dashboard','attendance','staff-attendance','fees','helpdesk'],
  PARENT: ['dashboard','learners','attendance','fees','homework','reports','messages','helpdesk'],
  LEARNER: ['dashboard','attendance','homework','reports','messages','helpdesk']
};

export function canAccess(role: UserRole, page: string) { return navigationByRole[role].includes(page); }
export function canManageLearners(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','RECEPTIONIST'].includes(role); }
export function canRecordAttendance(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','TEACHER','SECURITY','RECEPTIONIST'].includes(role); }
export function canRecordPayments(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','ACCOUNTS'].includes(role); }
export function canManageUsers(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN'].includes(role); }
export function canReviewAcademics(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN'].includes(role); }
export function canApproveAcademics(role: UserRole) { return ['SUPER_ADMIN','PROPRIETOR'].includes(role); }
