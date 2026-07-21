import { describe, expect, it } from 'vitest';
import { accumulatedReturnCharge, calculateDailyCharge } from '../src/lib/fees';

describe('daily fee rules', () => {
  it('charges school and canteen fees when present', () => {
    expect(calculateDailyCharge({ attendance: 'PRESENT', dailySchoolFee: 10, dailyCanteenFee: 5 })).toBe(15);
  });

  it('charges only the school fee when absent', () => {
    expect(calculateDailyCharge({ attendance: 'ABSENT', dailySchoolFee: 10, dailyCanteenFee: 5 })).toBe(10);
  });

  it('charges 25 after one absent day and return', () => {
    expect(accumulatedReturnCharge(1, 10, 5)).toBe(25);
  });

  it('charges 45 after three absent days and return', () => {
    expect(accumulatedReturnCharge(3, 10, 5)).toBe(45);
  });
});
