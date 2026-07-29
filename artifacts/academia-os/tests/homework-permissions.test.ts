import { describe, expect, it } from 'vitest';
import {
  canCreateHomework,
  canReviewHomework,
  canMonitorHomework,
  canManageCurriculumTopics,
  canAccess,
} from '../src/lib/permissions';

describe('Homework permission rules', () => {
  // ── canCreateHomework ──────────────────────────────────────────────────────
  it('allows assigned teachers to create homework', () => {
    expect(canCreateHomework('TEACHER')).toBe(true);
  });

  it('allows Headteacher to create homework when also assigned as teacher', () => {
    expect(canCreateHomework('HEADTEACHER')).toBe(true);
  });

  it('allows Academic Administrator to create homework when also assigned as teacher', () => {
    expect(canCreateHomework('ACADEMIC_ADMIN')).toBe(true);
  });

  it('allows Super Admin to create homework', () => {
    expect(canCreateHomework('SUPER_ADMIN')).toBe(true);
  });

  it('blocks School Administrator from creating homework', () => {
    expect(canCreateHomework('SCHOOL_ADMIN')).toBe(false);
  });

  it('blocks Proprietor from creating homework', () => {
    expect(canCreateHomework('PROPRIETOR')).toBe(false);
  });

  it('blocks Accounts staff from creating homework', () => {
    expect(canCreateHomework('ACCOUNTS')).toBe(false);
  });

  it('blocks Parent from creating homework', () => {
    expect(canCreateHomework('PARENT')).toBe(false);
  });

  // ── canMonitorHomework ─────────────────────────────────────────────────────
  it('allows School Administrator read-only homework monitoring', () => {
    expect(canMonitorHomework('SCHOOL_ADMIN')).toBe(true);
  });

  it('allows Proprietor read-only homework monitoring', () => {
    expect(canMonitorHomework('PROPRIETOR')).toBe(true);
  });

  it('allows Super Admin monitoring', () => {
    expect(canMonitorHomework('SUPER_ADMIN')).toBe(true);
  });

  it('does not give Teacher monitoring rights (they create, not monitor)', () => {
    expect(canMonitorHomework('TEACHER')).toBe(false);
  });

  it('does not give Parent monitoring rights', () => {
    expect(canMonitorHomework('PARENT')).toBe(false);
  });

  // ── canReviewHomework ──────────────────────────────────────────────────────
  it('denies Headteacher school-wide homework review (no school-wide oversight)', () => {
    expect(canReviewHomework('HEADTEACHER')).toBe(false);
  });

  it('denies Headteacher school-wide homework monitoring', () => {
    expect(canMonitorHomework('HEADTEACHER')).toBe(false);
  });

  it('allows Academic Admin to review and unpublish homework', () => {
    expect(canReviewHomework('ACADEMIC_ADMIN')).toBe(true);
  });

  it('does not give School Admin review rights', () => {
    expect(canReviewHomework('SCHOOL_ADMIN')).toBe(false);
  });

  // ── canManageCurriculumTopics ──────────────────────────────────────────────
  it('allows Super Admin to manage curriculum topics', () => {
    expect(canManageCurriculumTopics('SUPER_ADMIN')).toBe(true);
  });

  it('allows Headteacher to manage curriculum topics', () => {
    expect(canManageCurriculumTopics('HEADTEACHER')).toBe(true);
  });

  it('allows Academic Administrator to manage curriculum topics', () => {
    expect(canManageCurriculumTopics('ACADEMIC_ADMIN')).toBe(true);
  });

  it('blocks School Administrator from managing curriculum topics', () => {
    expect(canManageCurriculumTopics('SCHOOL_ADMIN')).toBe(false);
  });

  it('blocks Teacher from managing curriculum topics', () => {
    expect(canManageCurriculumTopics('TEACHER')).toBe(false);
  });

  // ── Navigation access ──────────────────────────────────────────────────────
  it('School Admin still sees the homework page (monitoring)', () => {
    expect(canAccess('SCHOOL_ADMIN', 'homework')).toBe(true);
  });

  it('School Admin sees the homework-topics page (read-only monitoring)', () => {
    expect(canAccess('SCHOOL_ADMIN', 'homework-topics')).toBe(true);
  });

  it('Proprietor sees the homework page (monitoring)', () => {
    expect(canAccess('PROPRIETOR', 'homework')).toBe(true);
  });

  it('Parent can only see published homework for their linked learners', () => {
    expect(canAccess('PARENT', 'homework')).toBe(true);
    expect(canAccess('PARENT', 'homework-topics')).toBe(false);
  });
});
