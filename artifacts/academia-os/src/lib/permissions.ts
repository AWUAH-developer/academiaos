import type { UserRole } from '@/lib/types';

export const navigationByRole: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['dashboard','schools','demo-requests','packages','users','setup','learners','attendance','staff-attendance','fees','fee-arrears','academics','homework','homework-topics','promotion','approvals','reports','transport','events','messages','helpdesk','audit','id-cards'],
  SCHOOL_ADMIN: ['dashboard','users','learners','attendance','staff-attendance','fees','fee-arrears','academics','homework','homework-topics','approvals','reports','transport','events','messages','helpdesk','audit','id-cards'],
  PROPRIETOR: ['dashboard','users','staff-attendance','learners','academics','homework','fee-arrears','promotion','approvals','reports','events','messages','helpdesk','audit'],
  HEADTEACHER: ['dashboard','learners','attendance','staff-attendance','academics','homework','homework-topics','promotion','reports','messages','helpdesk','id-cards'],
  ACADEMIC_ADMIN: ['dashboard','learners','attendance','staff-attendance','academics','homework','homework-topics','promotion','approvals','reports','events','messages','helpdesk','id-cards'],
  TEACHER: ['dashboard','learners','attendance','academics','homework','reports','messages','helpdesk'],
  ACCOUNTS: ['dashboard','staff-attendance','learners','fees','fee-arrears','reports','messages','helpdesk'],
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
export function canViewUsers(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR'].includes(role); }
export function canManageUsers(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN'].includes(role); }
/** School-wide academic review / return-for-correction. Academic Administrator only — the Headteacher (and everyone else) has no school-wide review authority. */
export function canReviewAcademics(role: UserRole) { return ['ACADEMIC_ADMIN'].includes(role); }
export function canApproveAcademics(role: UserRole) { return ['SUPER_ADMIN','PROPRIETOR'].includes(role); }

// ── Fee arrears ────────────────────────────────────────────────────────────────
/** May view the school-wide outstanding fees list and guardian contacts. */
export function canViewFeeArrears(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR','ACCOUNTS'].includes(role); }
/** May record follow-up notes, contact activities and set next follow-up dates. */
export function canRecordFeeFollowUp(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR','ACCOUNTS'].includes(role); }
/** May send guardian reminders for outstanding fees. */
export function canSendFeeReminder(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR','ACCOUNTS'].includes(role); }

// ── Homework ───────────────────────────────────────────────────────────────────
/** May create and publish homework (still requires a teacher assignment check in the action). */
export function canCreateHomework(role: UserRole) { return ['SUPER_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','TEACHER'].includes(role); }
/** May review, return or unpublish homework but not routinely create it. Academic Administrator only — the Headteacher has no school-wide oversight. */
export function canReviewHomework(role: UserRole) { return ['ACADEMIC_ADMIN'].includes(role); }
/** Read-only homework oversight — no create or publish rights. */
export function canMonitorHomework(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR'].includes(role); }
/** May create curriculum topics (class/subject topic catalogue). */
export function canManageCurriculumTopics(role: UserRole) { return ['SUPER_ADMIN','HEADTEACHER','ACADEMIC_ADMIN'].includes(role); }

// ── Promotion ──────────────────────────────────────────────────────────────────
/** May view the promotion list (any non-teacher school role). */
export function canViewPromotion(role: UserRole) { return ['SUPER_ADMIN','SCHOOL_ADMIN','PROPRIETOR','HEADTEACHER','ACADEMIC_ADMIN'].includes(role); }
/** May prepare individual promotion decisions (Headteacher / Academic Admin). */
export function canDecidePromotion(role: UserRole) { return ['SUPER_ADMIN','HEADTEACHER','ACADEMIC_ADMIN'].includes(role); }
/** May give final batch approval and apply class changes (Proprietor). */
export function canApprovePromotion(role: UserRole) { return ['SUPER_ADMIN','PROPRIETOR'].includes(role); }
/** May configure the school promotion policy (SUPER_ADMIN only). */
export function canConfigurePromotionPolicy(role: UserRole) { return role === 'SUPER_ADMIN'; }
