/**
 * Integration-style tests verifying that HEADTEACHER requests that should be
 * denied are actually denied, and that the expected audit entries are written.
 *
 * Covers:
 *   1. academicReviewAction — denied + ACADEMIC_REVIEW_DENIED audit
 *   2. Mobile homework GET — out-of-scope classId yields 403 + HOMEWORK_SCHOOLWIDE_ACCESS_DENIED audit
 *   3. Mobile results GET — empty teaching scope yields an empty result set (no school-wide fallback)
 *   4. Mobile reports GET — empty accessible-learner list yields an empty report set (no school-wide fallback)
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Shared mock helpers ───────────────────────────────────────────────────────

const SCHOOL_ID = 'school-ht-test';
const HT_USER_ID = 'ht-user-1';
const OUT_OF_SCOPE_CLASS_ID = 'class-other';

function makeHeadteacherUser() {
  return {
    id: HT_USER_ID,
    schoolId: SCHOOL_ID,
    name: 'Head Teacher',
    username: 'headteacher',
    email: 'ht@school.test',
    phone: null,
    photoUrl: null,
    role: 'HEADTEACHER' as const,
    status: 'ACTIVE' as const,
    mustChangePassword: false,
    school: {
      id: SCHOOL_ID,
      name: 'Test School',
      code: 'TST',
      currency: 'GHS',
      logoUrl: null,
      proprietorApprovalRequired: false,
    },
  };
}

function makeMobileAuthContext() {
  return {
    context: {
      user: {
        ...makeHeadteacherUser(),
        school: {
          id: SCHOOL_ID,
          name: 'Test School',
          code: 'TST',
          logoUrl: null,
          currency: 'GHS',
          timezone: 'Africa/Accra',
        },
      },
      sessionId: 'sess-1',
      deviceId: 'device-1',
      deviceIdentifier: 'device-id-1234',
      platform: 'android',
      appVersion: '1.0.0',
    },
  };
}

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(),
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/tenant', () => ({
  getActiveSchoolId: vi.fn().mockResolvedValue(SCHOOL_ID),
}));

// next/navigation redirect throws a recognisable sentinel so tests can catch it.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const err = new Error('NEXT_REDIRECT: ' + url);
    (err as Error & { digest?: string; redirectUrl?: string }).digest = 'NEXT_REDIRECT';
    (err as Error & { digest?: string; redirectUrl?: string }).redirectUrl = url;
    throw err;
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Access helpers are mocked so tests control scope without a live DB.
vi.mock('@/lib/access', () => ({
  teachingScope: vi.fn(),
  teachingScopeCondition: vi.fn(),
  inTeachingScope: vi.fn(),
}));

// Mobile-API helpers — real mobileError/mobileJson replaced with simple
// Response wrappers to avoid NextResponse internals in the test environment.
vi.mock('@/lib/mobile-api', () => ({
  authenticateMobileRequest: vi.fn(),
  resolveMobileSchoolId: vi.fn().mockResolvedValue(SCHOOL_ID),
  accessibleLearnerIds: vi.fn(),
  mayAccessLearner: vi.fn().mockResolvedValue(true),
  pagination: vi.fn().mockReturnValue({ limit: 50, offset: 0 }),
  cleanText: vi.fn((v: string | null) => v ?? null),
  mobileError: vi.fn((status: number, code: string, message: string) =>
    new Response(JSON.stringify({ error: { code, message } }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
  mobileJson: vi.fn((data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

// Stub the Drizzle DB client so importing route modules doesn't attempt a
// real DB connection.  Each query chain returns an empty array by default;
// individual tests that need specific data can override via mockResolvedValue.
vi.mock('@/db', () => {
  const chain = () => {
    const node: Record<string, unknown> = {};
    const methods = ['select','from','where','limit','offset','orderBy','innerJoin','leftJoin','insert','values','update','set','returning','onConflictDoUpdate','transaction'];
    for (const m of methods) {
      node[m] = vi.fn().mockReturnValue(node);
    }
    // Terminal awaitable — default empty result
    Object.defineProperty(node, Symbol.iterator, { value: [][Symbol.iterator].bind([]) });
    (node as Promise<unknown[]> & Record<string, unknown>).then = (resolve: (v: unknown[]) => unknown) => Promise.resolve([]).then(resolve);
    return node;
  };
  return { db: chain() };
});

// ─── 1. academicReviewAction ───────────────────────────────────────────────────

describe('academicReviewAction — HEADTEACHER denial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects with an error when the role is HEADTEACHER', async () => {
    const { requireUser } = await import('@/lib/auth');
    vi.mocked(requireUser).mockResolvedValue(makeHeadteacherUser() as never);

    const { academicReviewAction } = await import('@/app/actions/academics');

    const formData = new FormData();
    formData.set('submissionId', 'submission-1');
    formData.set('decision', 'FORWARD');

    let redirectUrl = '';
    try {
      await academicReviewAction(formData);
    } catch (err: unknown) {
      const e = err as Error & { redirectUrl?: string };
      if (e.redirectUrl) redirectUrl = e.redirectUrl;
    }

    expect(redirectUrl).toMatch(/error=/);
    expect(redirectUrl).toContain('/approvals');
  });

  it('writes an ACADEMIC_REVIEW_DENIED audit entry when the role is HEADTEACHER', async () => {
    const { requireUser, audit } = await import('@/lib/auth');
    vi.mocked(requireUser).mockResolvedValue(makeHeadteacherUser() as never);

    const { academicReviewAction } = await import('@/app/actions/academics');

    const formData = new FormData();
    formData.set('submissionId', 'submission-ht-1');
    formData.set('decision', 'FORWARD');

    try {
      await academicReviewAction(formData);
    } catch {
      // expected redirect throw
    }

    const auditCalls = vi.mocked(audit).mock.calls;
    expect(auditCalls.length).toBeGreaterThanOrEqual(1);

    const deniedCall = auditCalls.find(
      ([args]) => args.action === 'ACADEMIC_REVIEW_DENIED'
    );
    expect(deniedCall).toBeDefined();
    expect(deniedCall![0].userId).toBe(HT_USER_ID);
    expect(deniedCall![0].newValue).toMatchObject({ role: 'HEADTEACHER' });
  });
});

// ─── 2. Mobile homework route — out-of-scope classId ──────────────────────────

describe('GET /api/mobile/v1/homework — HEADTEACHER out-of-scope classId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function callHomeworkRoute(classId: string) {
    const { authenticateMobileRequest, resolveMobileSchoolId } = await import('@/lib/mobile-api');
    const { teachingScope, inTeachingScope } = await import('@/lib/access');

    vi.mocked(authenticateMobileRequest).mockResolvedValue(makeMobileAuthContext() as never);
    vi.mocked(resolveMobileSchoolId).mockResolvedValue(SCHOOL_ID);

    // Headteacher has no assignments at all
    vi.mocked(teachingScope).mockResolvedValue({ pairs: [], classTeacherClassIds: [] });
    // The requested classId is NOT in the empty scope
    vi.mocked(inTeachingScope).mockReturnValue(false);

    const url = `https://app.test/api/mobile/v1/homework?classId=${classId}`;
    const request = new NextRequest(url, {
      headers: { Authorization: `Bearer amos_access.${HT_USER_ID}.${'A'.repeat(43)}` },
    });

    const { GET } = await import('@/app/api/mobile/v1/homework/route');
    return GET(request);
  }

  it('returns HTTP 403 when classId is outside the Headteacher teaching scope', async () => {
    const response = await callHomeworkRoute(OUT_OF_SCOPE_CLASS_ID);
    expect(response.status).toBe(403);
  });

  it('returns PERMISSION_DENIED error code for the out-of-scope request', async () => {
    const response = await callHomeworkRoute(OUT_OF_SCOPE_CLASS_ID);
    const body = await response.json() as { error: { code: string } };
    expect(body.error.code).toBe('PERMISSION_DENIED');
  });

  it('writes a HOMEWORK_SCHOOLWIDE_ACCESS_DENIED audit entry for the out-of-scope request', async () => {
    const { audit } = await import('@/lib/auth');

    await callHomeworkRoute(OUT_OF_SCOPE_CLASS_ID);

    const auditCalls = vi.mocked(audit).mock.calls;
    const deniedCall = auditCalls.find(
      ([args]) => args.action === 'HOMEWORK_SCHOOLWIDE_ACCESS_DENIED'
    );
    expect(deniedCall).toBeDefined();
    expect(deniedCall![0].userId).toBe(HT_USER_ID);
    expect(deniedCall![0].entityId).toBe(OUT_OF_SCOPE_CLASS_ID);
    expect(deniedCall![0].newValue).toMatchObject({ role: 'HEADTEACHER', classId: OUT_OF_SCOPE_CLASS_ID });
  });
});

// ─── 3. Mobile results route — empty teaching scope produces no results ────────

describe('GET /api/mobile/v1/results — HEADTEACHER with no assigned classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty results array when the Headteacher has no teaching assignments', async () => {
    const { authenticateMobileRequest, resolveMobileSchoolId, accessibleLearnerIds } =
      await import('@/lib/mobile-api');
    const { teachingScope, teachingScopeCondition } = await import('@/lib/access');

    vi.mocked(authenticateMobileRequest).mockResolvedValue(makeMobileAuthContext() as never);
    vi.mocked(resolveMobileSchoolId).mockResolvedValue(SCHOOL_ID);
    // No learners accessible — HEADTEACHER has no class assignments
    vi.mocked(accessibleLearnerIds).mockResolvedValue([]);
    vi.mocked(teachingScope).mockResolvedValue({ pairs: [], classTeacherClassIds: [] });
    // Null means no matching scope condition → early-return with empty list
    vi.mocked(teachingScopeCondition).mockReturnValue(null);

    const url = 'https://app.test/api/mobile/v1/results';
    const request = new NextRequest(url, {
      headers: { Authorization: `Bearer amos_access.${HT_USER_ID}.${'A'.repeat(43)}` },
    });

    const { GET } = await import('@/app/api/mobile/v1/results/route');
    const response = await GET(request);
    const body = await response.json() as { data: { results: unknown[] } };

    expect(response.status).toBe(200);
    expect(body.data.results).toEqual([]);
  });

  it('does not fall back to school-wide results when the scope is empty', async () => {
    const { authenticateMobileRequest, resolveMobileSchoolId, accessibleLearnerIds } =
      await import('@/lib/mobile-api');
    const { teachingScope, teachingScopeCondition } = await import('@/lib/access');
    const { db } = await import('@/db');

    vi.mocked(authenticateMobileRequest).mockResolvedValue(makeMobileAuthContext() as never);
    vi.mocked(resolveMobileSchoolId).mockResolvedValue(SCHOOL_ID);
    vi.mocked(accessibleLearnerIds).mockResolvedValue([]);
    vi.mocked(teachingScope).mockResolvedValue({ pairs: [], classTeacherClassIds: [] });
    vi.mocked(teachingScopeCondition).mockReturnValue(null);

    const url = 'https://app.test/api/mobile/v1/results';
    const request = new NextRequest(url, {
      headers: { Authorization: `Bearer amos_access.${HT_USER_ID}.${'A'.repeat(43)}` },
    });

    const { GET } = await import('@/app/api/mobile/v1/results/route');
    await GET(request);

    // The route must short-circuit before reaching the DB select for results
    const dbSelectCalls = vi.mocked(db.select).mock.calls.length;
    expect(dbSelectCalls).toBe(0);
  });
});

// ─── 4. Mobile reports route — empty accessible learners produces no reports ───

describe('GET /api/mobile/v1/reports — HEADTEACHER with no assigned classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty reports array when the Headteacher has no accessible learners', async () => {
    const { authenticateMobileRequest, resolveMobileSchoolId, accessibleLearnerIds } =
      await import('@/lib/mobile-api');

    vi.mocked(authenticateMobileRequest).mockResolvedValue(makeMobileAuthContext() as never);
    vi.mocked(resolveMobileSchoolId).mockResolvedValue(SCHOOL_ID);
    // Empty list — no learners in any assigned class
    vi.mocked(accessibleLearnerIds).mockResolvedValue([]);

    const url = 'https://app.test/api/mobile/v1/reports';
    const request = new NextRequest(url, {
      headers: { Authorization: `Bearer amos_access.${HT_USER_ID}.${'A'.repeat(43)}` },
    });

    const { GET } = await import('@/app/api/mobile/v1/reports/route');
    const response = await GET(request);
    const body = await response.json() as { data: { reports: unknown[] } };

    expect(response.status).toBe(200);
    expect(body.data.reports).toEqual([]);
  });

  it('does not fall back to school-wide reports when the accessible learner list is empty', async () => {
    const { authenticateMobileRequest, resolveMobileSchoolId, accessibleLearnerIds } =
      await import('@/lib/mobile-api');
    const { db } = await import('@/db');

    vi.mocked(authenticateMobileRequest).mockResolvedValue(makeMobileAuthContext() as never);
    vi.mocked(resolveMobileSchoolId).mockResolvedValue(SCHOOL_ID);
    vi.mocked(accessibleLearnerIds).mockResolvedValue([]);

    const url = 'https://app.test/api/mobile/v1/reports';
    const request = new NextRequest(url, {
      headers: { Authorization: `Bearer amos_access.${HT_USER_ID}.${'A'.repeat(43)}` },
    });

    const { GET } = await import('@/app/api/mobile/v1/reports/route');
    await GET(request);

    // The route must short-circuit before querying terminal_reports
    const dbSelectCalls = vi.mocked(db.select).mock.calls.length;
    expect(dbSelectCalls).toBe(0);
  });
});
