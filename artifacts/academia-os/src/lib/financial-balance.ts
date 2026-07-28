export type FinancialAdjustmentForBalance = {
  type: string;
  amount: number;
};

export type FinancialBalanceInput = {
  totalCharges: number;
  totalPayments: number;
  adjustments?: FinancialAdjustmentForBalance[];
};

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Effect of an approved financial adjustment on the learner's balance.
 *
 * Positive value = increases amount owed.
 * Negative value = reduces amount owed / creates learner credit.
 *
 * PAYMENT_REVERSAL
 *   A payment is being reversed, so the amount becomes owed again.
 *
 * ATTENDANCE_FEE_CREDIT
 *   Attendance was corrected after money had already been received.
 *   The money remains historically paid, but becomes learner credit.
 *
 * ATTENDANCE_FEE_CREDIT_REVERSAL
 *   A previous attendance credit is cancelled because the attendance
 *   later becomes chargeable again.
 */
export function financialAdjustmentBalanceEffect(
  adjustment: FinancialAdjustmentForBalance,
) {
  const amount = Number(adjustment.amount || 0);

  switch (adjustment.type) {
    case 'PAYMENT_REVERSAL':
      return amount;

    case 'ATTENDANCE_FEE_CREDIT':
      return -amount;

    case 'ATTENDANCE_FEE_CREDIT_REVERSAL':
      return amount;

    default:
      return 0;
  }
}

/**
 * Canonical AcademiaOS learner balance formula.
 *
 * Charges
 * - payments
 * + payment reversals
 * - attendance fee credits
 * + attendance credit reversals
 * = true balance
 *
 * A negative balance is intentionally preserved because it represents
 * genuine learner credit that can carry forward to future charges.
 */
export function calculateFinancialBalance(
  input: FinancialBalanceInput,
) {
  const adjustmentTotal = (input.adjustments || []).reduce(
    (sum, adjustment) =>
      sum + financialAdjustmentBalanceEffect(adjustment),
    0,
  );

  return money(
    Number(input.totalCharges || 0) -
      Number(input.totalPayments || 0) +
      adjustmentTotal,
  );
}

export function financialAdjustmentTotals(
  adjustments: FinancialAdjustmentForBalance[],
) {
  let paymentReversals = 0;
  let attendanceCredits = 0;
  let attendanceCreditReversals = 0;

  for (const adjustment of adjustments) {
    const amount = Number(adjustment.amount || 0);

    if (adjustment.type === 'PAYMENT_REVERSAL') {
      paymentReversals += amount;
    }

    if (adjustment.type === 'ATTENDANCE_FEE_CREDIT') {
      attendanceCredits += amount;
    }

    if (adjustment.type === 'ATTENDANCE_FEE_CREDIT_REVERSAL') {
      attendanceCreditReversals += amount;
    }
  }

  return {
    paymentReversals: money(paymentReversals),
    attendanceCredits: money(attendanceCredits),
    attendanceCreditReversals: money(
      attendanceCreditReversals,
    ),
  };
}
