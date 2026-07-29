import type { UserRole } from '@/lib/types';

export const WEB_DESKTOP_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PROPRIETOR',
  'ACADEMIC_ADMIN',
];

const webDesktopRoleSet = new Set<UserRole>(WEB_DESKTOP_ROLES);

export function canUseWeb(role: UserRole | string) {
  return webDesktopRoleSet.has(role as UserRole);
}

export function canUseDesktop(role: UserRole | string) {
  return webDesktopRoleSet.has(role as UserRole);
}

export function canUseMobile(role: UserRole | string) {
  return role !== 'LEARNER';
}
