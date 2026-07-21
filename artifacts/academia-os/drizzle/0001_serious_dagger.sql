CREATE TABLE "staff_attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'PRESENT' NOT NULL,
	"arrival_time" timestamp with time zone,
	"departure_time" timestamp with time zone,
	"late_arrival" boolean DEFAULT false NOT NULL,
	"early_departure" boolean DEFAULT false NOT NULL,
	"reason" text,
	"recorded_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_movement_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"reason" text NOT NULL,
	"requested_departure_at" timestamp with time zone NOT NULL,
	"expected_return_at" timestamp with time zone,
	"actual_departure_at" timestamp with time zone,
	"actual_return_at" timestamp with time zone,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"approved_by_id" text,
	"decision_reason" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_movement_requests" ADD CONSTRAINT "staff_movement_requests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_movement_requests" ADD CONSTRAINT "staff_movement_requests_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_movement_requests" ADD CONSTRAINT "staff_movement_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_attendance_staff_date_uq" ON "staff_attendance_records" USING btree ("staff_id","date");--> statement-breakpoint
CREATE INDEX "staff_attendance_school_date_idx" ON "staff_attendance_records" USING btree ("school_id","date","status");--> statement-breakpoint
CREATE INDEX "staff_movement_school_status_idx" ON "staff_movement_requests" USING btree ("school_id","status","created_at");