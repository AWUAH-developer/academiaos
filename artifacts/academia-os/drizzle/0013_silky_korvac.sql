CREATE TABLE "school_events" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"published_by_id" text,
	"title" text NOT NULL,
	"description" text,
	"event_type" text DEFAULT 'SCHOOL_EVENT' NOT NULL,
	"audience" text DEFAULT 'ALL' NOT NULL,
	"venue" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "school_event_school_start_idx" ON "school_events" USING btree ("school_id","starts_at");--> statement-breakpoint
CREATE INDEX "school_event_audience_status_idx" ON "school_events" USING btree ("school_id","audience","status");