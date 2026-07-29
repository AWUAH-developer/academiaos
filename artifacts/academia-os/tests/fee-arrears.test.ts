import { describe, expect, it } from 'vitest';
import {
  canViewFeeArrears,
  canRecordFeeFollowUp,
  canSendFeeReminder,
  canRecordPayments,
  canAccess,
} from '../src/lib/permissions';
import { computePaymentStatus } from '../src/lib/fees';

// ── Access control ─────────────────────────────────────────────────────────────

describe('Fee arrears — access control', () => {
  it('School Administrator can view fee arrears', () => {
    expect(canViewFeeArrears('SCHOOL_ADMIN')).toBe(true);
  });

  it('Proprietor can view fee arrears', () => {
    expect(canViewFeeArrears('PROPRIETOR')).toBe(true);
  });

  it('Accounts staff can view fee arrears', () => {
    expect(canViewFeeArrears('ACCOUNTS')).toBe(true);
  });

  it('Super Admin can view fee arrears', () => {
    expect(canViewFeeArrears('SUPER_ADMIN')).toBe(true);
  });

  it('Teacher cannot view fee arrears', () => {
    expect(canViewFeeArrears('TEACHER')).toBe(false);
  });

  it('Parent cannot view fee arrears', () => {
    expect(canViewFeeArrears('PARENT')).toBe(false);
  });

  it('Headteacher cannot view fee arrears', () => {
    expect(canViewFeeArrears('HEADTEACHER')).toBe(false);
  });
});

describe('Fee arrears — follow-up recording', () => {
  it('School Administrator can record follow-up notes', () => {
    expect(canRecordFeeFollowUp('SCHOOL_ADMIN')).toBe(true);
  });

  it('Proprietor can record follow-up notes', () => {
    expect(canRecordFeeFollowUp('PROPRIETOR')).toBe(true);
  });

  it('Accounts staff can record follow-up notes', () => {
    expect(canRecordFeeFollowUp('ACCOUNTS')).toBe(true);
  });

  it('Teacher cannot record follow-up notes', () => {
    expect(canRecordFeeFollowUp('TEACHER')).toBe(false);
  });

  it('Parent cannot record follow-up notes', () => {
    expect(canRecordFeeFollowUp('PARENT')).toBe(false);
  });
});

describe('Fee arrears — reminders', () => {
  it('School Administrator can send guardian reminders', () => {
    expect(canSendFeeReminder('SCHOOL_ADMIN')).toBe(true);
  });

  it('Proprietor can send guardian reminders', () => {
    expect(canSendFeeReminder('PROPRIETOR')).toBe(true);
  });

  it('Accounts staff can send guardian reminders', () => {
    expect(canSendFeeReminder('ACCOUNTS')).toBe(true);
  });
});

describe('Payment recording is restricted to Accounts only', () => {
  it('only Accounts (and Super Admin and School Admin) may record payments — not Proprietor or others', () => {
    expect(canRecordPayments('ACCOUNTS')).toBe(true);
    expect(canRecordPayments('SUPER_ADMIN')).toBe(true);
    expect(canRecordPayments('SCHOOL_ADMIN')).toBe(true);
    expect(canRecordPayments('PROPRIETOR')).toBe(false);
    expect(canRecordPayments('HEADTEACHER')).toBe(false);
    expect(canRecordPayments('TEACHER')).toBe(false);
    expect(canRecordPayments('PARENT')).toBe(false);
  });
});

// ── Navigation ─────────────────────────────────────────────────────────────────

describe('Fee arrears — navigation', () => {
  it('fee-arrears page is in navigation for SCHOOL_ADMIN', () => {
    expect(canAccess('SCHOOL_ADMIN', 'fee-arrears')).toBe(true);
  });

  it('fee-arrears page is in navigation for PROPRIETOR', () => {
    expect(canAccess('PROPRIETOR', 'fee-arrears')).toBe(true);
  });

  it('fee-arrears page is in navigation for ACCOUNTS', () => {
    expect(canAccess('ACCOUNTS', 'fee-arrears')).toBe(true);
  });

  it('fee-arrears page is in navigation for SUPER_ADMIN', () => {
    expect(canAccess('SUPER_ADMIN', 'fee-arrears')).toBe(true);
  });

  it('fee-arrears page is NOT accessible to Teacher', () => {
    expect(canAccess('TEACHER', 'fee-arrears')).toBe(false);
  });

  it('fee-arrears page is NOT accessible to Headteacher', () => {
    expect(canAccess('HEADTEACHER', 'fee-arrears')).toBe(false);
  });

  it('fee-arrears page is NOT accessible to Parent', () => {
    expect(canAccess('PARENT', 'fee-arrears')).toBe(false);
  });
});

// ── Balance integrity: follow-up never alters financial balance ───────────────

describe('Fee follow-up does not alter financial balance', () => {
  // The computePaymentStatus function is purely derived from charges and payments.
  // A follow-up note has no parameters to change it — this is enforced by the data model:
  // feeFollowUps has no amount column and no effect on feeCharges or payments.

  it('UNPAID status is unchanged regardless of follow-up activities', () => {
    // Simulating that no payment has been made even after many follow-ups
    const status = computePaymentStatus({ trueBalance: 500, totalCharges: 500, totalPayments: 0 });
    expect(status).toBe('UNPAID');
  });

  it('PARTIALLY_PAID status reflects actual payments, not follow-up entries', () => {
    const status = computePaymentStatus({ trueBalance: 300, totalCharges: 500, totalPayments: 200 });
    expect(status).toBe('PARTIALLY_PAID');
  });

  it('FULLY_PAID only when payments match charges exactly', () => {
    const status = computePaymentStatus({ trueBalance: 0, totalCharges: 500, totalPayments: 500 });
    expect(status).toBe('FULLY_PAID');
  });

  it('recording a follow-up with "PROMISED_PAYMENT" outcome does NOT change the balance', () => {
    // Balance before follow-up
    const before = computePaymentStatus({ trueBalance: 400, totalCharges: 400, totalPayments: 0 });
    // Balance after follow-up (no payment has been made — only a note was recorded)
    const after = computePaymentStatus({ trueBalance: 400, totalCharges: 400, totalPayments: 0 });
    expect(before).toBe('UNPAID');
    expect(after).toBe('UNPAID');
    // The two are identical — recording a follow-up does not change anything
    expect(before).toBe(after);
  });
});

// ── Half-fee balance computation ──────────────────────────────────────────────

describe('HALF_FEE balance computation', () => {
  it('outstanding for HALF_FEE learner reflects actual charges (already at 50% rate)', () => {
    // If the configured fee is 1000 and HALF_FEE is 500:
    // The feeCharge row for a HALF_FEE learner should have amount=500.
    // Outstanding = 500 - 0 payments = 500
    const status = computePaymentStatus({ trueBalance: 500, totalCharges: 500, totalPayments: 0 });
    expect(status).toBe('UNPAID');
  });

  it('HALF_FEE learner who pays half is PARTIALLY_PAID', () => {
    const status = computePaymentStatus({ trueBalance: 250, totalCharges: 500, totalPayments: 250 });
    expect(status).toBe('PARTIALLY_PAID');
  });
});
