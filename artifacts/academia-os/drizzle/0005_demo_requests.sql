CREATE TABLE IF NOT EXISTS "demo_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"school_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"learner_count" integer,
	"staff_count" integer,
	"message" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
