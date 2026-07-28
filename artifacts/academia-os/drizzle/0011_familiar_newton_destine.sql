-- Migration 0011: Locked class attendance registers and correction workflow
--
-- Official attendance is grouped by class/date.
-- The actual person who submits attendance is permanently recorded.
-- Submitted registers are locked.
-- Corrections are requested separately and retain the original attendance history.

CREATE TABLE "attendance_registers" (
  "id" text PRIMARY KEY NOT NULL,
  "school_id" text NOT NULL,
  "class_id" text NOT NULL,
  "academic_year_id" text NOT NULL,
  "term_id" text NOT NULL,
  "date" timestamp with time zone NOT NULL,

  "official_class_teacher_id" text,
  "marked_by_id" text NOT NULL,
  "marked_by_role" text NOT NULL,
  "substitution_reason" text,

  "status" text DEFAULT 'DRAFT' NOT NULL,
  "submitted_at" timestamp with time zone,
  "locked_at" timestamp with time zone,

  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

ALTER TABLE "attendance_registers"
  ADD CONSTRAINT "attendance_registers_school_id_schools_id_fk"
  FOREIGN KEY ("school_id")
  REFERENCES "public"."schools"("id")
  ON DELETE cascade
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_registers"
  ADD CONSTRAINT "attendance_registers_class_id_classes_id_fk"
  FOREIGN KEY ("class_id")
  REFERENCES "public"."classes"("id")
  ON DELETE cascade
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_registers"
  ADD CONSTRAINT "attendance_registers_academic_year_id_academic_years_id_fk"
  FOREIGN KEY ("academic_year_id")
  REFERENCES "public"."academic_years"("id")
  ON DELETE cascade
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_registers"
  ADD CONSTRAINT "attendance_registers_term_id_terms_id_fk"
  FOREIGN KEY ("term_id")
  REFERENCES "public"."terms"("id")
  ON DELETE cascade
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_registers"
  ADD CONSTRAINT "attendance_registers_official_class_teacher_id_users_id_fk"
  FOREIGN KEY ("official_class_teacher_id")
  REFERENCES "public"."users"("id")
  ON DELETE set null
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_registers"
  ADD CONSTRAINT "attendance_registers_marked_by_id_users_id_fk"
  FOREIGN KEY ("marked_by_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;

--> statement-breakpoint

CREATE UNIQUE INDEX "attendance_register_class_date_uq"
  ON "attendance_registers" USING btree ("class_id","date");

--> statement-breakpoint

CREATE INDEX "attendance_register_school_date_idx"
  ON "attendance_registers" USING btree ("school_id","date","status");

--> statement-breakpoint

ALTER TABLE "attendance_records"
  ADD COLUMN "register_id" text;

--> statement-breakpoint

ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_register_id_attendance_registers_id_fk"
  FOREIGN KEY ("register_id")
  REFERENCES "public"."attendance_registers"("id")
  ON DELETE set null
  ON UPDATE no action;

--> statement-breakpoint

CREATE INDEX "attendance_register_idx"
  ON "attendance_records" USING btree ("register_id");

--> statement-breakpoint

CREATE TABLE "attendance_correction_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "school_id" text NOT NULL,
  "attendance_record_id" text NOT NULL,
  "register_id" text,

  "requested_by_id" text NOT NULL,

  "original_status" text NOT NULL,
  "requested_status" text NOT NULL,

  "original_attendance_reason" text,
  "requested_attendance_reason" text,

  "reason" text NOT NULL,

  "status" text DEFAULT 'PENDING' NOT NULL,

  "reviewed_by_id" text,
  "decision_reason" text,
  "reviewed_at" timestamp with time zone,

  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

ALTER TABLE "attendance_correction_requests"
  ADD CONSTRAINT "attendance_correction_requests_school_id_schools_id_fk"
  FOREIGN KEY ("school_id")
  REFERENCES "public"."schools"("id")
  ON DELETE cascade
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_correction_requests"
  ADD CONSTRAINT "attendance_correction_requests_attendance_record_id_attendance_records_id_fk"
  FOREIGN KEY ("attendance_record_id")
  REFERENCES "public"."attendance_records"("id")
  ON DELETE cascade
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_correction_requests"
  ADD CONSTRAINT "attendance_correction_requests_register_id_attendance_registers_id_fk"
  FOREIGN KEY ("register_id")
  REFERENCES "public"."attendance_registers"("id")
  ON DELETE set null
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_correction_requests"
  ADD CONSTRAINT "attendance_correction_requests_requested_by_id_users_id_fk"
  FOREIGN KEY ("requested_by_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "attendance_correction_requests"
  ADD CONSTRAINT "attendance_correction_requests_reviewed_by_id_users_id_fk"
  FOREIGN KEY ("reviewed_by_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;

--> statement-breakpoint

CREATE INDEX "attendance_correction_record_idx"
  ON "attendance_correction_requests"
  USING btree ("attendance_record_id","created_at");

--> statement-breakpoint

CREATE INDEX "attendance_correction_school_status_idx"
  ON "attendance_correction_requests"
  USING btree ("school_id","status","created_at");
