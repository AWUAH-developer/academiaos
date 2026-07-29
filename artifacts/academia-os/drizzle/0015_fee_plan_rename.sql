-- Rename learner payment plans to the canonical 4-plan system.
-- Financial records (feeCharges, payments, paymentAllocations) are not touched.
-- INSTALLMENT is unchanged.
UPDATE "learners" SET "payment_plan" = 'DAILY_FEE'  WHERE "payment_plan" = 'DAILY';
--> statement-breakpoint
UPDATE "learners" SET "payment_plan" = 'FULL_FEE'
  WHERE "payment_plan" IN ('TERM','PARTIAL','WEEKLY','MONTHLY','SCHOLARSHIP','DISCOUNTED','STAFF_CHILD','CUSTOM');
--> statement-breakpoint
-- Rename fee structure plans to match.
UPDATE "fee_structures" SET "payment_plan" = 'DAILY_FEE' WHERE "payment_plan" = 'DAILY';
--> statement-breakpoint
UPDATE "fee_structures" SET "payment_plan" = 'FULL_FEE'
  WHERE "payment_plan" IN ('TERM','WEEKLY','MONTHLY');
--> statement-breakpoint
-- Change column default for new learner rows.
ALTER TABLE "learners" ALTER COLUMN "payment_plan" SET DEFAULT 'FULL_FEE';
