import { NextRequest } from 'next/server';
import { authenticateDesktopRequest, desktopError, desktopJson, desktopEntitlements, resolveDesktopSchoolId } from '@/lib/desktop-api';
import { navigationByRole } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateDesktopRequest(request);
  if ('response' in auth) return auth.response;
  const ctx = auth.context;

  const schoolId = await resolveDesktopSchoolId(ctx, request);
  if (!schoolId && ctx.user.role !== 'SUPER_ADMIN') {
    return desktopError(403, 'NO_SCHOOL', 'No active school found for this account.');
  }

  const ents = schoolId ? await desktopEntitlements(ctx, schoolId) : {
    subscription: null,
    features: { attendance: true, learners: true, staff: true, dailyFees: true, academics: true, finance: true, reports: true, transport: true, smartId: true, security: true, messages: true, notifications: true, sync: true, settings: true },
    role: ctx.user.role,
    school: ctx.user.school,
  };

  // Filter navigation by role
  const roleNav    = navigationByRole[ctx.user.role as keyof typeof navigationByRole] ?? [];
  // Map web nav keys to desktop screen names
  const desktopNav = roleNav.map((n) => {
    const MAP: Record<string, string> = {
      dashboard: 'dashboard', learners: 'learners', attendance: 'attendance',
      fees: 'daily-fees', academics: 'academics', reports: 'reports',
      transport: 'transport', messages: 'messages', users: 'staff',
      'staff-attendance': 'staff', 'id-cards': 'smart-id', helpdesk: 'settings',
      audit: 'settings', setup: 'settings', security: 'security',
    };
    return MAP[n] ?? n;
  }).filter((v, i, a) => a.indexOf(v) === i); // dedupe

  return desktopJson({ data: { ...ents, navigation: desktopNav } });
}
