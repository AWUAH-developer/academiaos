import type {
  UserRole
} from '@/api/types';

const LEARNER_VIEWERS: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER',
  'ACADEMIC_ADMIN',
  'TEACHER',
  'ACCOUNTS',
  'TRANSPORT',
  'RECEPTIONIST',
  'LIBRARIAN',
  'PARENT'
];

const ATTENDANCE_VIEWERS: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'HEADTEACHER',
  'ACADEMIC_ADMIN',
  'TEACHER',
  'TRANSPORT',
  'SECURITY',
  'RECEPTIONIST',
  'CANTEEN',
  'PARENT'
];

const ATTENDANCE_WRITERS: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'HEADTEACHER',
  'ACADEMIC_ADMIN',
  'TEACHER',
  'SECURITY',
  'RECEPTIONIST'
];

const FEE_VIEWERS: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'ACCOUNTS',
  'CANTEEN',
  'PARENT'
];

const RESULT_VIEWERS: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER',
  'ACADEMIC_ADMIN',
  'TEACHER',
  'PARENT'
];

const ANNOUNCEMENT_VIEWERS: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER',
  'ACADEMIC_ADMIN',
  'TEACHER',
  'ACCOUNTS',
  'TRANSPORT',
  'RECEPTIONIST',
  'LIBRARIAN',
  'PARENT'
];

const TRANSPORT_VIEWERS: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'TRANSPORT',
  'SECURITY',
  'PARENT'
];

const HOMEWORK_VIEWERS: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'HEADTEACHER',
  'ACADEMIC_ADMIN',
  'TEACHER',
  'PARENT'
];

const STAFF_ATTENDANCE_USERS:
  UserRole[] = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'PROPRIETOR',
    'HEADTEACHER',
    'ACADEMIC_ADMIN',
    'TEACHER',
    'ACCOUNTS',
    'TRANSPORT',
    'SECURITY',
    'RECEPTIONIST',
    'LIBRARIAN',
    'CANTEEN'
  ];

const STAFF_ATTENDANCE_SUPERVISORS:
  UserRole[] = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'PROPRIETOR',
    'HEADTEACHER'
  ];

export function canViewLearners(
  role?: UserRole
) {
  return Boolean(
    role &&
    LEARNER_VIEWERS.includes(role)
  );
}

export function canViewAttendance(
  role?: UserRole
) {
  return Boolean(
    role &&
    ATTENDANCE_VIEWERS.includes(role)
  );
}

export function canRecordAttendance(
  role?: UserRole
) {
  return Boolean(
    role &&
    ATTENDANCE_WRITERS.includes(role)
  );
}

export function canViewFees(
  role?: UserRole
) {
  return Boolean(
    role &&
    FEE_VIEWERS.includes(role)
  );
}

export function canViewResults(
  role?: UserRole
) {
  return Boolean(
    role &&
    RESULT_VIEWERS.includes(role)
  );
}

export function canViewReports(
  role?: UserRole
) {
  return canViewResults(role);
}

export function canViewAnnouncements(
  role?: UserRole
) {
  return Boolean(
    role &&
    ANNOUNCEMENT_VIEWERS.includes(role)
  );
}

export function canViewEvents(
  role?: UserRole
) {
  return Boolean(
    role &&
    role !== 'LEARNER'
  );
}

export function canViewTransport(
  role?: UserRole
) {
  return Boolean(
    role &&
    TRANSPORT_VIEWERS.includes(role)
  );
}

export function canViewHomework(
  role?: UserRole
) {
  return Boolean(
    role &&
    HOMEWORK_VIEWERS.includes(role)
  );
}

export function canUseStaffAttendance(
  role?: UserRole
) {
  return Boolean(
    role &&
    STAFF_ATTENDANCE_USERS.includes(role)
  );
}

export function canSuperviseStaffAttendance(
  role?: UserRole
) {
  return Boolean(
    role &&
    STAFF_ATTENDANCE_SUPERVISORS
      .includes(role)
  );
}

export function roleLabel(
  role?: UserRole
) {
  return (role || '')
    .split('_')
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0) +
        part.slice(1).toLowerCase()
    )
    .join(' ');
}
