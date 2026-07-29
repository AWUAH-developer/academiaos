import type { PromotionDecision, PromotionRecommendation } from './types';

export type { PromotionDecision, PromotionRecommendation };

export type PromotionPolicy = {
  minAnnualAverage: number;
  minSubjectsPassed: number;
  compulsorySubjectIds: string[];
  minAttendancePct: number | null;
  incompleteResultsBlock: boolean;
};

export const DEFAULT_POLICY: PromotionPolicy = {
  minAnnualAverage: 50,
  minSubjectsPassed: 5,
  compulsorySubjectIds: [],
  minAttendancePct: null,
  incompleteResultsBlock: true,
};

export type AnnualSummary = {
  learnerId: string;
  totalSubjects: number;
  approvedSubjects: number;    // LOCKED submissions count
  annualAverage: number;       // average totalScore across LOCKED submissions
  subjectsPassed: number;      // count where totalScore >= SUBJECT_PASS_MARK
  compulsorySubjectResults: Record<string, number | null>; // subjectId → score | null
  attendancePct: number | null;
  hasIncompleteResults: boolean; // any submitted-but-not-LOCKED term result?
};

/** Minimum total score for a single subject to count as passed. */
export const SUBJECT_PASS_MARK = 50;

/**
 * Derives the system promotion recommendation from a learner's annual summary
 * and the configured school policy.
 *
 * @param summary     Computed annual summary for the learner.
 * @param policy      School's promotion policy.
 * @param isLastClass True when this is the school's final/graduation class.
 */
export function computePromotionRecommendation(
  summary: AnnualSummary,
  policy: PromotionPolicy,
  isLastClass: boolean,
): PromotionRecommendation {
  // No approved results → incomplete
  if (summary.approvedSubjects === 0) return 'INCOMPLETE_RESULTS';

  // Incomplete results block promotion if policy requires it
  if (summary.hasIncompleteResults && policy.incompleteResultsBlock) {
    return 'INCOMPLETE_RESULTS';
  }

  // Check compulsory subjects
  const failsCompulsory = policy.compulsorySubjectIds.some((id) => {
    const score = summary.compulsorySubjectResults[id];
    return score === null || score === undefined || score < SUBJECT_PASS_MARK;
  });
  if (failsCompulsory) return 'REPEAT_RECOMMENDED';

  // Check minimum average
  if (summary.annualAverage < policy.minAnnualAverage) return 'REPEAT_RECOMMENDED';

  // Check minimum subjects passed
  if (summary.subjectsPassed < policy.minSubjectsPassed) return 'REPEAT_RECOMMENDED';

  // Check attendance if policy requires it
  if (
    policy.minAttendancePct !== null &&
    summary.attendancePct !== null &&
    summary.attendancePct < policy.minAttendancePct
  ) return 'REPEAT_RECOMMENDED';

  // All criteria met
  return isLastClass ? 'GRADUATION_ELIGIBLE' : 'ELIGIBLE_FOR_PROMOTION';
}

export const RECOMMENDATION_LABEL: Record<PromotionRecommendation, string> = {
  ELIGIBLE_FOR_PROMOTION: 'Eligible for promotion',
  REPEAT_RECOMMENDED:     'Repeat recommended',
  INCOMPLETE_RESULTS:     'Incomplete results',
  GRADUATION_ELIGIBLE:    'Eligible for graduation',
};

export const DECISION_LABEL: Record<PromotionDecision, string> = {
  PROMOTED:       'Promoted',
  REPEAT:         'Repeat year',
  FORCE_PROMOTED: 'Force promoted',
  GRADUATED:      'Graduated',
  DEFERRED:       'Deferred',
};
