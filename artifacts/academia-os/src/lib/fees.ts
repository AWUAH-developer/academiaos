import type { PaymentStatus } from './types';

// ── Daily fee helpers ──────────────────────────────────────────────────────────

export type DailyFeeInput = {
  attendance: 'PRESENT' | 'ABSENT';
  dailySchoolFee: number;
  dailyCanteenFee: number;
  absentChargeable?: boolean;
};

/**
 * Returns the charge amount for a single attendance day under the DAILY_FEE plan.
 * If absent and chargeOnAbsent is false, canteen fee is waived; school fee may also
 * be waived depending on the absence rule.
 */
export function calculateDailyCharge(input: DailyFeeInput) {
  const chargeAbsent = input.absentChargeable ?? true;
  return input.attendance === 'ABSENT'
    ? (chargeAbsent ? input.dailySchoolFee : 0)
    : input.dailySchoolFee + input.dailyCanteenFee;
}

/**
 * Returns the total amount due on a learner's return after consecutive absent days.
 * Accumulated absent-day school fees + the return day's school + canteen fee.
 */
export function accumulatedReturnCharge(
  absentDays: number,
  dailySchoolFee: number,
  dailyCanteenFee: number,
) {
  if (absentDays < 0) throw new Error('Absent days cannot be negative');
  return absentDays * dailySchoolFee + dailySchoolFee + dailyCanteenFee;
}

// ── Payment allocation ─────────────────────────────────────────────────────────

/**
 * Allocates a payment across open charges in chronological order (oldest first).
 * Returns per-charge allocations and any unallocated credit remainder.
 */
export function allocatePayment(
  amount: number,
  charges: { id: string; amount: number; paidAmount: number }[],
) {
  let remaining = amount;
  const allocations: { chargeId: string; amount: number }[] = [];
  for (const charge of charges) {
    if (remaining <= 0) break;
    const due = Math.max(0, charge.amount - charge.paidAmount);
    const applied = Math.min(due, remaining);
    if (applied > 0) {
      allocations.push({ chargeId: charge.id, amount: applied });
      remaining -= applied;
    }
  }
  return { allocations, credit: remaining };
}

// ── Payment status ─────────────────────────────────────────────────────────────

/**
 * Derives the learner-level payment status from their financial balance.
 *
 * Rules:
 *   trueBalance < 0  → CREDIT_BALANCE  (overpaid; credit available)
 *   trueBalance = 0 and charges > 0 → FULLY_PAID
 *   trueBalance > 0 and some payment made → PARTIALLY_PAID
 *   otherwise → UNPAID  (no charges yet, or no payment received)
 *
 * "No payment received must never remove the learner's debt."
 * Without a positive totalPayments the status stays UNPAID regardless of
 * charge entries, so the outstanding balance is always preserved.
 */
export function computePaymentStatus(params: {
  trueBalance: number;
  totalCharges: number;
  totalPayments: number;
}): PaymentStatus {
  const { trueBalance, totalCharges, totalPayments } = params;
  if (trueBalance < 0) return 'CREDIT_BALANCE';
  if (trueBalance === 0 && totalCharges > 0) return 'FULLY_PAID';
  if (totalPayments > 0 && trueBalance > 0) return 'PARTIALLY_PAID';
  return 'UNPAID';
}
