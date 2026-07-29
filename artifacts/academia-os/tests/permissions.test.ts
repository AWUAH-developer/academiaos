import { describe, expect, it } from 'vitest';
import {
  canAccess,
  canApproveAcademics,
  canManageLearners,
  canRecordAttendance,
  canRecordPayments,
  canReviewAcademics
} from '../src/lib/permissions';

describe('role access controls', () => {
  it('prevents parents from managing school-wide records', () => {
    expect(canManageLearners('PARENT')).toBe(false);
    expect(canRecordAttendance('PARENT')).toBe(false);
    expect(canRecordPayments('PARENT')).toBe(false);
    expect(canApproveAcademics('PARENT')).toBe(false);
  });

  it('allows the proprietor to give final academic approval', () => {
    expect(canApproveAcademics('PROPRIETOR')).toBe(true);
    expect(canReviewAcademics('PROPRIETOR')).toBe(false);
  });

  it('allows academic reviewers to review but not give proprietor approval', () => {
    expect(canReviewAcademics('ACADEMIC_ADMIN')).toBe(true);
    expect(canApproveAcademics('ACADEMIC_ADMIN')).toBe(false);
  });

  it('denies the Headteacher school-wide academic review and correction workflows', () => {
    expect(canReviewAcademics('HEADTEACHER')).toBe(false);
    expect(canApproveAcademics('HEADTEACHER')).toBe(false);
    expect(canAccess('HEADTEACHER', 'approvals')).toBe(false);
  });

  it('keeps Headteacher access to their own teaching pages', () => {
    expect(canAccess('HEADTEACHER', 'homework')).toBe(true);
    expect(canAccess('HEADTEACHER', 'academics')).toBe(true);
  });

  it('restricts accounts staff to the finance workflow', () => {
    expect(canAccess('ACCOUNTS', 'fees')).toBe(true);
    expect(canAccess('ACCOUNTS', 'academics')).toBe(false);
    expect(canRecordPayments('ACCOUNTS')).toBe(true);
  });

  it('does not expose school administration pages to learners', () => {
    expect(canAccess('LEARNER', 'users')).toBe(false);
    expect(canAccess('LEARNER', 'schools')).toBe(false);
    expect(canAccess('LEARNER', 'audit')).toBe(false);
  });
});
