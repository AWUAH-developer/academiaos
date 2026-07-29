export const USER_ROLES = [
  'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PROPRIETOR', 'HEADTEACHER', 'ACADEMIC_ADMIN',
  'TEACHER', 'ACCOUNTS', 'TRANSPORT', 'SECURITY', 'RECEPTIONIST', 'LIBRARIAN',
  'CANTEEN', 'PARENT', 'LEARNER'
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK' | 'PARTIAL' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON' | 'SCHOOL_ACTIVITY' | 'SUSPENDED' | 'HOLIDAY';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RETURNED' | 'REJECTED' | 'APPROVED' | 'LOCKED' | 'REOPENED';
/** The four learner fee-plan types. Every learner must be on one of these. */
export type PaymentPlan = 'FULL_FEE' | 'HALF_FEE' | 'DAILY_FEE' | 'INSTALLMENT';

/** Learner-level payment status, computed from charges and payments. */
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'CREDIT_BALANCE';
