import { describe, expect, it } from 'vitest';
import { accumulatedReturnCharge, allocatePayment, calculateDailyCharge, computePaymentStatus } from '../src/lib/fees';

// ── DAILY_FEE plan — daily charge calculation ──────────────────────────────────

describe('DAILY_FEE — daily charge calculation', () => {
  it('charges school + canteen fee when present', () => {
    expect(calculateDailyCharge({ attendance: 'PRESENT', dailySchoolFee: 10, dailyCanteenFee: 5 })).toBe(15);
  });

  it('charges only the school fee when absent (chargeOnAbsent defaults to true)', () => {
    expect(calculateDailyCharge({ attendance: 'ABSENT', dailySchoolFee: 10, dailyCanteenFee: 5 })).toBe(10);
  });

  it('charges nothing when absent and chargeOnAbsent is false', () => {
    expect(calculateDailyCharge({ attendance: 'ABSENT', dailySchoolFee: 10, dailyCanteenFee: 5, absentChargeable: false })).toBe(0);
  });

  it('accumulates 25 after one absent day and return', () => {
    expect(accumulatedReturnCharge(1, 10, 5)).toBe(25);
  });

  it('accumulates 45 after three absent days and return', () => {
    expect(accumulatedReturnCharge(3, 10, 5)).toBe(45);
  });

  it('throws when absent days is negative', () => {
    expect(() => accumulatedReturnCharge(-1, 10, 5)).toThrow('Absent days cannot be negative');
  });
});

// ── Payment status calculation ─────────────────────────────────────────────────

describe('computePaymentStatus', () => {
  it('returns UNPAID when no charges exist', () => {
    expect(computePaymentStatus({ trueBalance: 0, totalCharges: 0, totalPayments: 0 })).toBe('UNPAID');
  });

  it('returns UNPAID when charges exist but no payment received', () => {
    expect(computePaymentStatus({ trueBalance: 500, totalCharges: 500, totalPayments: 0 })).toBe('UNPAID');
  });

  it('returns PARTIALLY_PAID when some payment has been made but balance remains', () => {
    expect(computePaymentStatus({ trueBalance: 300, totalCharges: 500, totalPayments: 200 })).toBe('PARTIALLY_PAID');
  });

  it('returns FULLY_PAID when balance is exactly zero and charges exist', () => {
    expect(computePaymentStatus({ trueBalance: 0, totalCharges: 500, totalPayments: 500 })).toBe('FULLY_PAID');
  });

  it('returns CREDIT_BALANCE when learner has overpaid', () => {
    expect(computePaymentStatus({ trueBalance: -100, totalCharges: 500, totalPayments: 600 })).toBe('CREDIT_BALANCE');
  });

  it('preserves UNPAID status — partial payment with zero received stays UNPAID', () => {
    // Confirms: no payment received ≠ debt removal
    expect(computePaymentStatus({ trueBalance: 1000, totalCharges: 1000, totalPayments: 0 })).toBe('UNPAID');
  });
});

// ── Payment allocation ─────────────────────────────────────────────────────────

describe('allocatePayment', () => {
  it('allocates payment fully to a single open charge', () => {
    const result = allocatePayment(100, [{ id: 'c1', amount: 100, paidAmount: 0 }]);
    expect(result.allocations).toEqual([{ chargeId: 'c1', amount: 100 }]);
    expect(result.credit).toBe(0);
  });

  it('allocates payment across multiple charges in order', () => {
    const result = allocatePayment(150, [
      { id: 'c1', amount: 100, paidAmount: 0 },
      { id: 'c2', amount: 100, paidAmount: 0 },
    ]);
    expect(result.allocations).toEqual([
      { chargeId: 'c1', amount: 100 },
      { chargeId: 'c2', amount: 50 },
    ]);
    expect(result.credit).toBe(0);
  });

  it('returns a credit remainder when payment exceeds total charges', () => {
    const result = allocatePayment(200, [{ id: 'c1', amount: 100, paidAmount: 0 }]);
    expect(result.allocations).toEqual([{ chargeId: 'c1', amount: 100 }]);
    expect(result.credit).toBe(100);
  });

  it('skips charges that are already fully paid', () => {
    const result = allocatePayment(50, [
      { id: 'c1', amount: 100, paidAmount: 100 }, // already paid
      { id: 'c2', amount: 100, paidAmount: 0 },
    ]);
    expect(result.allocations).toEqual([{ chargeId: 'c2', amount: 50 }]);
    expect(result.credit).toBe(0);
  });
});
