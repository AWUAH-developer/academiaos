export type UserRole =
  | 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'PROPRIETOR' | 'HEADTEACHER'
  | 'ACADEMIC_ADMIN' | 'TEACHER' | 'ACCOUNTS' | 'TRANSPORT'
  | 'SECURITY' | 'RECEPTIONIST' | 'LIBRARIAN' | 'CANTEEN'
  | 'PARENT' | 'LEARNER';

export interface School {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  currency: string;
  timezone: string;
}

export interface AcademiaUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  role: UserRole;
  mustChangePassword: boolean;
  school: School | null;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

export interface Learner {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  gender: string | null;
  classId: string | null;
  className: string | null;
  classStream: string | null;
  paymentPlan: string | null;
  status: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK' | 'PARTIAL' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON' | 'SCHOOL_ACTIVITY' | 'SUSPENDED' | 'HOLIDAY';
export interface AttendanceRecord {
  id: string;
  learnerId: string;
  learnerFirstName: string;
  learnerLastName: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  reason: string | null;
}

export interface FeeSummary { learnerId: string; totalCharged: string | number; totalPaid: string | number; balance: string | number; }
export interface FeeCharge {
  id: string; learnerId: string; learnerFirstName: string; learnerLastName: string;
  category: string | null; description: string; amount: string | number; paidAmount: string | number;
  status: string; dueDate: string | null; createdAt: string;
}
export interface Payment {
  id: string; learnerId: string; learnerFirstName: string; learnerLastName: string;
  amount: string | number; method: string; reference: string | null; receiptNo: string | null;
  notes: string | null; createdAt: string;
}
export interface ResultRecord {
  id: string; learnerId: string; learnerFirstName: string; learnerLastName: string;
  academicYearId: string; academicYear: string; termId: string; term: string;
  subjectId: string; subject: string; classworkScore: string | number | null; homeworkScore: string | number | null;
  testScore: string | number | null; examScore: string | number | null; totalScore: string | number | null;
  grade: string | null; position: number | null; teacherRemark: string | null; conductRemark: string | null;
  classTeacherRemark: string | null; status: string; approvedAt: string | null; lockedAt: string | null;
}
export interface TerminalReport {
  id: string; learnerId: string; learnerFirstName: string; learnerLastName: string;
  academicYearId: string; academicYear: string; termId: string; term: string;
  snapshot: unknown; verificationCode: string | null; status: string; publishedAt: string | null;
}
export interface Announcement { id: string; subject: string; body: string; audience: string; createdAt: string; sentAt: string | null; }
export interface AppNotification { id: string; schoolId: string | null; userId: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string; }
export interface MobileDevice { id: string; deviceIdentifier: string; deviceName: string | null; platform: string; appVersion: string | null; notificationsEnabled: boolean; lastSeenAt: string; createdAt?: string; }
export interface Pagination { limit: number; offset: number; }
export interface ApiEnvelope<T> { data: T; }
