import { describe, expect, it } from 'vitest';
import {
  computePromotionRecommendation,
  DEFAULT_POLICY,
  SUBJECT_PASS_MARK,
  type AnnualSummary,
  type PromotionPolicy,
} from '../src/lib/promotion';
import {
  canDecidePromotion,
  canApprovePromotion,
  canConfigurePromotionPolicy,
  canViewPromotion,
} from '../src/lib/permissions';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSummary(overrides: Partial<AnnualSummary> = {}): AnnualSummary {
  return {
    learnerId: 'l1',
    totalSubjects: 6,
    approvedSubjects: 6,
    annualAverage: 65,
    subjectsPassed: 6,
    compulsorySubjectResults: {},
    attendancePct: null,
    hasIncompleteResults: false,
    ...overrides,
  };
}

// ── computePromotionRecommendation ─────────────────────────────────────────────

describe('computePromotionRecommendation — eligibility', () => {
  it('returns ELIGIBLE_FOR_PROMOTION when all criteria are met', () => {
    expect(computePromotionRecommendation(makeSummary(), DEFAULT_POLICY, false)).toBe('ELIGIBLE_FOR_PROMOTION');
  });

  it('returns GRADUATION_ELIGIBLE when all criteria are met and it is the final class', () => {
    expect(computePromotionRecommendation(makeSummary(), DEFAULT_POLICY, true)).toBe('GRADUATION_ELIGIBLE');
  });

  it('returns REPEAT_RECOMMENDED when annual average is below minimum', () => {
    expect(computePromotionRecommendation(makeSummary({ annualAverage: 40, subjectsPassed: 6 }), DEFAULT_POLICY, false)).toBe('REPEAT_RECOMMENDED');
  });

  it('returns REPEAT_RECOMMENDED when fewer subjects are passed than required', () => {
    expect(computePromotionRecommendation(makeSummary({ annualAverage: 70, subjectsPassed: 2 }), DEFAULT_POLICY, false)).toBe('REPEAT_RECOMMENDED');
  });

  it('returns INCOMPLETE_RESULTS when there are no approved subjects', () => {
    expect(computePromotionRecommendation(makeSummary({ approvedSubjects: 0, annualAverage: 0 }), DEFAULT_POLICY, false)).toBe('INCOMPLETE_RESULTS');
  });

  it('returns INCOMPLETE_RESULTS when hasIncompleteResults=true and policy blocks promotion', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, incompleteResultsBlock: true };
    expect(computePromotionRecommendation(makeSummary({ hasIncompleteResults: true }), policy, false)).toBe('INCOMPLETE_RESULTS');
  });

  it('does NOT block promotion for incomplete results when policy does not require full approval', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, incompleteResultsBlock: false };
    expect(computePromotionRecommendation(makeSummary({ hasIncompleteResults: true }), policy, false)).toBe('ELIGIBLE_FOR_PROMOTION');
  });
});

describe('computePromotionRecommendation — compulsory subjects', () => {
  it('returns REPEAT_RECOMMENDED when a compulsory subject is not passed', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, compulsorySubjectIds: ['math'] };
    const summary = makeSummary({ compulsorySubjectResults: { math: 30 } });
    expect(computePromotionRecommendation(summary, policy, false)).toBe('REPEAT_RECOMMENDED');
  });

  it('returns REPEAT_RECOMMENDED when a compulsory subject has no result', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, compulsorySubjectIds: ['math'] };
    const summary = makeSummary({ compulsorySubjectResults: { math: null } });
    expect(computePromotionRecommendation(summary, policy, false)).toBe('REPEAT_RECOMMENDED');
  });

  it('passes when compulsory subject score meets the pass mark', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, compulsorySubjectIds: ['math'] };
    const summary = makeSummary({ compulsorySubjectResults: { math: SUBJECT_PASS_MARK } });
    expect(computePromotionRecommendation(summary, policy, false)).toBe('ELIGIBLE_FOR_PROMOTION');
  });
});

describe('computePromotionRecommendation — attendance', () => {
  it('returns REPEAT_RECOMMENDED when attendance is below policy minimum', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, minAttendancePct: 75 };
    expect(computePromotionRecommendation(makeSummary({ attendancePct: 60 }), policy, false)).toBe('REPEAT_RECOMMENDED');
  });

  it('passes when attendance meets the policy minimum', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, minAttendancePct: 75 };
    expect(computePromotionRecommendation(makeSummary({ attendancePct: 80 }), policy, false)).toBe('ELIGIBLE_FOR_PROMOTION');
  });

  it('skips attendance check when policy has no attendance requirement', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, minAttendancePct: null };
    expect(computePromotionRecommendation(makeSummary({ attendancePct: 20 }), policy, false)).toBe('ELIGIBLE_FOR_PROMOTION');
  });

  it('skips attendance check when attendancePct is null even if policy requires it', () => {
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, minAttendancePct: 75 };
    // null means data not available — do not penalise the learner
    expect(computePromotionRecommendation(makeSummary({ attendancePct: null }), policy, false)).toBe('ELIGIBLE_FOR_PROMOTION');
  });
});

// ── Only approved results are used ────────────────────────────────────────────

describe('promotion uses approved annual results only', () => {
  it('returns INCOMPLETE_RESULTS if no LOCKED submissions exist (only drafts)', () => {
    expect(computePromotionRecommendation(makeSummary({ approvedSubjects: 0, totalSubjects: 3, annualAverage: 0 }), DEFAULT_POLICY, false)).toBe('INCOMPLETE_RESULTS');
  });

  it('computes recommendation correctly from only LOCKED submissions (ignores drafts)', () => {
    // 3 LOCKED subjects (avg 70, all passed), 2 pending — result should be eligible
    const policy: PromotionPolicy = { ...DEFAULT_POLICY, minSubjectsPassed: 3 };
    const summary = makeSummary({ approvedSubjects: 3, annualAverage: 70, subjectsPassed: 3, hasIncompleteResults: false });
    expect(computePromotionRecommendation(summary, policy, false)).toBe('ELIGIBLE_FOR_PROMOTION');
  });
});

// ── Promotion permission roles ─────────────────────────────────────────────────

describe('promotion permission roles', () => {
  it('Headteacher may record individual promotion decisions', () => {
    expect(canDecidePromotion('HEADTEACHER')).toBe(true);
  });

  it('Academic Administrator may record individual promotion decisions', () => {
    expect(canDecidePromotion('ACADEMIC_ADMIN')).toBe(true);
  });

  it('Proprietor gives final batch approval', () => {
    expect(canApprovePromotion('PROPRIETOR')).toBe(true);
  });

  it('Headteacher cannot give final batch approval — that is Proprietor only', () => {
    expect(canApprovePromotion('HEADTEACHER')).toBe(false);
  });

  it('School Administrator may view but cannot decide or approve', () => {
    expect(canViewPromotion('SCHOOL_ADMIN')).toBe(true);
    expect(canDecidePromotion('SCHOOL_ADMIN')).toBe(false);
    expect(canApprovePromotion('SCHOOL_ADMIN')).toBe(false);
  });

  it('Teacher cannot access promotion at all', () => {
    expect(canViewPromotion('TEACHER')).toBe(false);
    expect(canDecidePromotion('TEACHER')).toBe(false);
    expect(canApprovePromotion('TEACHER')).toBe(false);
  });

  it('Parent cannot access promotion', () => {
    expect(canViewPromotion('PARENT')).toBe(false);
  });

  it('only Super Admin can configure the promotion policy', () => {
    expect(canConfigurePromotionPolicy('SUPER_ADMIN')).toBe(true);
    expect(canConfigurePromotionPolicy('PROPRIETOR')).toBe(false);
    expect(canConfigurePromotionPolicy('HEADTEACHER')).toBe(false);
    expect(canConfigurePromotionPolicy('SCHOOL_ADMIN')).toBe(false);
  });
});
