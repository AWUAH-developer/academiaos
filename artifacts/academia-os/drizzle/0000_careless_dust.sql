CREATE TABLE "academic_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"reviewer_id" text,
	"proprietor_id" text,
	"academic_year_id" text NOT NULL,
	"term_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"classwork_score" numeric(5, 2) NOT NULL,
	"homework_score" numeric(5, 2) NOT NULL,
	"test_score" numeric(5, 2) NOT NULL,
	"exam_score" numeric(5, 2) NOT NULL,
	"total_score" numeric(5, 2) NOT NULL,
	"grade" text NOT NULL,
	"position" integer,
	"teacher_remark" text,
	"conduct_remark" text,
	"class_teacher_remark" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"starts_on" timestamp with time zone NOT NULL,
	"ends_on" timestamp with time zone NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_events" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"decision" text NOT NULL,
	"reason" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"check_in_time" timestamp with time zone,
	"check_out_time" timestamp with time zone,
	"reason" text,
	"parent_notification_at" timestamp with time zone,
	"recorded_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text,
	"recorded_by_id" text NOT NULL,
	"badge_code" text NOT NULL,
	"action" text NOT NULL,
	"location" text,
	"device" text,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"was_duplicate" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"stream" text DEFAULT '' NOT NULL,
	"level" text,
	"class_teacher_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"is_canteen" boolean DEFAULT false NOT NULL,
	"is_daily_tuition" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"category_id" text,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"due_date" timestamp with time zone,
	"attendance_date" timestamp with time zone,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"category_id" text NOT NULL,
	"class_id" text,
	"payment_plan" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"charge_on_absent" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"charge_id" text,
	"payment_id" text,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"approved_by_id" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardians_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "homework" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"term_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"assigned_on" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"maximum_score" numeric(5, 2),
	"attachment_url" text,
	"status" text DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_guardians" (
	"learner_id" text NOT NULL,
	"guardian_id" text NOT NULL,
	"relationship" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"can_pick_up" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learners" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text,
	"class_id" text,
	"admission_no" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"photo_url" text,
	"date_of_birth" timestamp with time zone,
	"gender" text,
	"admission_date" timestamp with time zone DEFAULT now() NOT NULL,
	"address" text,
	"medical_notes" text,
	"emergency_contact" text,
	"transport_route_text" text,
	"payment_plan" text DEFAULT 'TERM' NOT NULL,
	"badge_code" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learners_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "learners_badge_code_unique" UNIQUE("badge_code")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text,
	"username" text NOT NULL,
	"user_id" text,
	"success" boolean NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"channel" text NOT NULL,
	"audience" text NOT NULL,
	"recipient" text,
	"subject" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"provider_id" text,
	"failure_reason" text,
	"cost" numeric(12, 4),
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"charge_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"receipt_no" text NOT NULL,
	"notes" text,
	"recorded_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_receipt_no_unique" UNIQUE("receipt_no")
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"logo_url" text,
	"address" text,
	"phone" text,
	"email" text,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"timezone" text DEFAULT 'Africa/Accra' NOT NULL,
	"sms_sender_name" text,
	"proprietor_approval_required" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'NORMAL' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminal_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"term_id" text NOT NULL,
	"class_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"verification_code" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"approved_by_id" text,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terminal_reports_verification_code_unique" UNIQUE("verification_code")
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"name" text NOT NULL,
	"starts_on" timestamp with time zone NOT NULL,
	"ends_on" timestamp with time zone NOT NULL,
	"reopening_date" timestamp with time zone,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"route_id" text NOT NULL,
	"stop_id" text,
	"vehicle_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"vehicle_id" text,
	"name" text NOT NULL,
	"morning_start_time" text,
	"afternoon_start_time" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"route_id" text,
	"stop_id" text,
	"vehicle_id" text,
	"recorded_by_id" text NOT NULL,
	"type" text NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notification_status" text DEFAULT 'QUEUED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_stops" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"route_id" text NOT NULL,
	"name" text NOT NULL,
	"sequence" integer NOT NULL,
	"pickup_time" text,
	"drop_off_time" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"registration_no" text NOT NULL,
	"capacity" integer NOT NULL,
	"driver_name" text,
	"driver_phone" text,
	"attendant_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_proprietor_id_users_id_fk" FOREIGN KEY ("proprietor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_submissions" ADD CONSTRAINT "academic_submissions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_submission_id_academic_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."academic_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_scans" ADD CONSTRAINT "attendance_scans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_scans" ADD CONSTRAINT "attendance_scans_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_scans" ADD CONSTRAINT "attendance_scans_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_class_teacher_id_users_id_fk" FOREIGN KEY ("class_teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_category_id_fee_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."fee_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_category_id_fee_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."fee_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_charge_id_fee_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."fee_charges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_guardians" ADD CONSTRAINT "learner_guardians_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_guardians" ADD CONSTRAINT "learner_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learners" ADD CONSTRAINT "learners_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learners" ADD CONSTRAINT "learners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learners" ADD CONSTRAINT "learners_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_charge_id_fee_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."fee_charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_reports" ADD CONSTRAINT "terminal_reports_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_reports" ADD CONSTRAINT "terminal_reports_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_reports" ADD CONSTRAINT "terminal_reports_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_reports" ADD CONSTRAINT "terminal_reports_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_reports" ADD CONSTRAINT "terminal_reports_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_reports" ADD CONSTRAINT "terminal_reports_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_route_id_transport_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transport_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_stop_id_transport_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."transport_stops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_scans" ADD CONSTRAINT "transport_scans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_scans" ADD CONSTRAINT "transport_scans_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_scans" ADD CONSTRAINT "transport_scans_route_id_transport_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transport_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_scans" ADD CONSTRAINT "transport_scans_stop_id_transport_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."transport_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_scans" ADD CONSTRAINT "transport_scans_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_scans" ADD CONSTRAINT "transport_scans_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_stops" ADD CONSTRAINT "transport_stops_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_stops" ADD CONSTRAINT "transport_stops_route_id_transport_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transport_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_result_uq" ON "academic_submissions" USING btree ("learner_id","academic_year_id","term_id","subject_id");--> statement-breakpoint
CREATE INDEX "academic_status_idx" ON "academic_submissions" USING btree ("school_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_year_school_name_uq" ON "academic_years" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "approval_submission_idx" ON "approval_events" USING btree ("submission_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_learner_date_uq" ON "attendance_records" USING btree ("learner_id","date");--> statement-breakpoint
CREATE INDEX "attendance_school_date_idx" ON "attendance_records" USING btree ("school_id","date","status");--> statement-breakpoint
CREATE INDEX "scan_badge_time_idx" ON "attendance_scans" USING btree ("badge_code","scanned_at");--> statement-breakpoint
CREATE INDEX "audit_school_time_idx" ON "audit_logs" USING btree ("school_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "class_school_name_stream_uq" ON "classes" USING btree ("school_id","name","stream");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_category_school_code_uq" ON "fee_categories" USING btree ("school_id","code");--> statement-breakpoint
CREATE INDEX "fee_charge_learner_status_idx" ON "fee_charges" USING btree ("school_id","learner_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_structure_uq" ON "fee_structures" USING btree ("school_id","category_id","class_id","payment_plan");--> statement-breakpoint
CREATE INDEX "guardian_school_phone_idx" ON "guardians" USING btree ("school_id","phone");--> statement-breakpoint
CREATE INDEX "homework_class_due_idx" ON "homework" USING btree ("school_id","class_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_guardian_uq" ON "learner_guardians" USING btree ("learner_id","guardian_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_school_admission_uq" ON "learners" USING btree ("school_id","admission_no");--> statement-breakpoint
CREATE INDEX "learner_school_class_idx" ON "learners" USING btree ("school_id","class_id","status");--> statement-breakpoint
CREATE INDEX "login_attempts_username_idx" ON "login_attempts" USING btree ("username","created_at");--> statement-breakpoint
CREATE INDEX "message_status_idx" ON "messages" USING btree ("school_id","created_at","status");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_charge_allocation_uq" ON "payment_allocations" USING btree ("payment_id","charge_id");--> statement-breakpoint
CREATE INDEX "payments_school_learner_idx" ON "payments" USING btree ("school_id","learner_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_school_code_uq" ON "subjects" USING btree ("school_id","code");--> statement-breakpoint
CREATE INDEX "ticket_status_idx" ON "support_tickets" USING btree ("school_id","status","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_assignment_uq" ON "teacher_assignments" USING btree ("teacher_id","class_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terminal_report_uq" ON "terminal_reports" USING btree ("learner_id","academic_year_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "term_year_name_uq" ON "terms" USING btree ("academic_year_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_assignment_uq" ON "transport_assignments" USING btree ("learner_id","route_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_route_name_uq" ON "transport_routes" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "transport_scan_time_idx" ON "transport_scans" USING btree ("school_id","scanned_at","type");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_stop_sequence_uq" ON "transport_stops" USING btree ("route_id","sequence");--> statement-breakpoint
CREATE INDEX "users_school_role_idx" ON "users" USING btree ("school_id","role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_registration_uq" ON "vehicles" USING btree ("school_id","registration_no");