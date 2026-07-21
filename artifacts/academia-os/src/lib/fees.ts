export type DailyFeeInput = { attendance: 'PRESENT' | 'ABSENT'; dailySchoolFee: number; dailyCanteenFee: number; absentChargeable?: boolean };
export function calculateDailyCharge(input: DailyFeeInput) { const chargeAbsent = input.absentChargeable ?? true; return input.attendance === 'ABSENT' ? (chargeAbsent ? input.dailySchoolFee : 0) : input.dailySchoolFee + input.dailyCanteenFee; }
export function accumulatedReturnCharge(absentDays: number, dailySchoolFee: number, dailyCanteenFee: number) { if (absentDays < 0) throw new Error('Absent days cannot be negative'); return absentDays * dailySchoolFee + dailySchoolFee + dailyCanteenFee; }
export function allocatePayment(amount: number, charges: { id: string; amount: number; paidAmount: number }[]) {
  let remaining = amount; const allocations: { chargeId: string; amount: number }[] = [];
  for (const charge of charges) { if (remaining <= 0) break; const due = Math.max(0, charge.amount - charge.paidAmount); const applied = Math.min(due, remaining); if (applied > 0) { allocations.push({ chargeId: charge.id, amount: applied }); remaining -= applied; } }
  return { allocations, credit: remaining };
}
