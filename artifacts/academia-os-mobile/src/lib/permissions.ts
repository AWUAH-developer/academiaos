import type { UserRole } from '@/api/types';
const ATTENDANCE_WRITERS: UserRole[] = ['SUPER_ADMIN','SCHOOL_ADMIN','HEADTEACHER','ACADEMIC_ADMIN','TEACHER','SECURITY','RECEPTIONIST'];
export function canRecordAttendance(role?: UserRole) { return Boolean(role && ATTENDANCE_WRITERS.includes(role)); }
export function roleLabel(role?: UserRole) { return (role || '').split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join(' '); }
